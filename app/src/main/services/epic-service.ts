import { ipcMain, BrowserWindow } from 'electron'
import { dbManager } from '../database'
import { classificationService } from './classification-service'
import { randomUUID } from 'crypto'

interface EpicTokenData {
  access_token: string
  refresh_token?: string
  expires_in?: number
  expires_at?: string
  token_type?: string
  scope?: string
  [key: string]: any
}

export class EpicService {
  private autoSyncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.registerHandlers()
    this.initAutoSync()
  }

  private registerHandlers() {
    ipcMain.handle('epic:auth', () => this.authenticate())
    ipcMain.handle('epic:sync', (_, { epicId }) => this.syncAll(epicId))
    ipcMain.handle('epic:get-status', () => this.getConnectionStatus())
    ipcMain.handle('epic:disconnect', () => this.disconnect())
  }

  private initAutoSync() {
    this.autoSyncInterval = setInterval(() => {
      const status = this.getConnectionStatus()
      if (status.connected && status.epicId) {
        this.syncAll(status.epicId).catch(() => {})
      }
    }, 60 * 60 * 1000)
  }

  async authenticate(): Promise<{ success: boolean; epicId?: string; displayName?: string; error?: string }> {
    const clientId = process.env.EPIC_CLIENT_ID
    const clientSecret = process.env.EPIC_CLIENT_SECRET
    const redirectUri = process.env.EPIC_REDIRECT_URI
    const deploymentId = process.env.EPIC_DEPLOYMENT_ID

    if (!clientId || !clientSecret || !redirectUri) {
      return { success: false, error: 'Epic OAuth is not configured' }
    }

    return new Promise((resolve) => {
      const state = randomUUID()
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      const params = new URLSearchParams()
      params.set('client_id', clientId)
      params.set('response_type', 'code')
      params.set('redirect_uri', redirectUri)
      params.set('scope', 'basic_profile')
      params.set('state', state)

      authWindow.loadURL(`https://www.epicgames.com/id/authorize?${params.toString()}`)

      const handleUrl = async (event: Electron.Event, url: string) => {
        if (!url.startsWith(redirectUri)) return
        event.preventDefault()
        authWindow.webContents.removeListener('will-redirect', handleUrl)
        authWindow.webContents.removeListener('will-navigate', handleUrl)

        try {
          const urlObj = new URL(url)
          const returnedState = urlObj.searchParams.get('state')
          if (!returnedState || returnedState !== state) {
            resolve({ success: false, error: 'State mismatch during Epic login' })
            authWindow.close()
            return
          }
          const code = urlObj.searchParams.get('code')
          if (!code) {
            resolve({ success: false, error: 'Missing authorization code from Epic' })
            authWindow.close()
            return
          }

          const tokenBody = new URLSearchParams()
          tokenBody.set('grant_type', 'authorization_code')
          tokenBody.set('code', code)
          tokenBody.set('redirect_uri', redirectUri)
          if (deploymentId) {
            tokenBody.set('deployment_id', deploymentId)
          }
          tokenBody.set('scope', 'basic_profile')

          const tokenRes = await fetch('https://api.epicgames.dev/epic/oauth/v2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
            },
            body: tokenBody.toString()
          })

          if (!tokenRes.ok) {
            let errorMessage = 'Epic token exchange failed'
            try {
              const text = await tokenRes.text()
              try {
                const json = JSON.parse(text)
                if (json.errorCode || json.error) {
                  errorMessage = `Epic token exchange failed: ${json.errorCode || json.error}`
                } else if (json.message) {
                  errorMessage = `Epic token exchange failed: ${json.message}`
                }
              } catch {
                if (text) {
                  errorMessage = `Epic token exchange failed: ${text}`
                }
              }
            } catch {
            }

            console.error('Epic token exchange failed', tokenRes.status, tokenRes.statusText)

            resolve({ success: false, error: errorMessage })
            authWindow.close()
            return
          }

          const tokenData = (await tokenRes.json()) as EpicTokenData
          if (!tokenData.access_token) {
            resolve({ success: false, error: 'Epic access token missing' })
            authWindow.close()
            return
          }

          const profileRes = await fetch('https://api.epicgames.dev/epic/oauth/v2/userInfo', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`
            }
          })

          if (!profileRes.ok) {
            resolve({ success: false, error: 'Epic profile fetch failed' })
            authWindow.close()
            return
          }

          const profile = (await profileRes.json()) as any
          const epicId = profile.sub || profile.account_id || profile.id
          const displayName =
            profile.displayName || profile.preferred_username || profile.name || 'Epic User'
          if (!epicId) {
            resolve({ success: false, error: 'Epic user id not found' })
            authWindow.close()
            return
          }

          this.saveEpicAccount(epicId, displayName, tokenData)
          resolve({ success: true, epicId, displayName })
          authWindow.close()
        } catch {
          resolve({ success: false, error: 'Epic login failed' })
          authWindow.close()
        }
      }

      authWindow.webContents.on('will-redirect', handleUrl)
      authWindow.webContents.on('will-navigate', handleUrl)

      authWindow.on('closed', () => {
        resolve({ success: false, error: 'Window closed' })
      })
    })
  }

  private saveEpicAccount(epicId: string, displayName: string, tokenData: EpicTokenData) {
    const db = dbManager.getDb()
    const existing = db.prepare('SELECT id FROM accounts WHERE id = ?').get(`epic_${epicId}`) as any
    const authData = JSON.stringify({
      tokens: {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        expires_at: tokenData.expires_at,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      }
    })
    const now = new Date().toISOString()
    if (!existing) {
      db.prepare(`
        INSERT INTO accounts (id, platform, username, status, last_synced, auth_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`epic_${epicId}`, 'epic', displayName, 'connected', now, authData)
    } else {
      db.prepare(`
        UPDATE accounts
        SET username = ?, status = 'connected', auth_data = ?, last_synced = ?
        WHERE id = ?
      `).run(displayName, authData, now, `epic_${epicId}`)
    }
  }

  private getConnectionStatus() {
    const db = dbManager.getDb()
    const row = db
      .prepare(
        `
      SELECT id, username, last_synced
      FROM accounts
      WHERE platform = 'epic' AND status = 'connected'
      ORDER BY last_synced DESC NULLS LAST
      LIMIT 1
    `
      )
      .get() as { id: string; username?: string; last_synced?: string } | undefined

    if (!row) {
      return { connected: false }
    }

    const epicId = row.id.startsWith('epic_') ? row.id.slice('epic_'.length) : row.id
    return {
      connected: true,
      epicId,
      displayName: row.username || null,
      lastSynced: row.last_synced || null
    }
  }

  private disconnect() {
    const db = dbManager.getDb()
    db.prepare(`
      UPDATE accounts
      SET status = 'disconnected', auth_data = NULL
      WHERE platform = 'epic'
    `).run()
    return { success: true }
  }

  async syncAll(epicId: string) {
    const status = this.getConnectionStatus()
    if (!status.connected || !status.epicId || status.epicId !== epicId) {
      return { success: false, error: 'Epic account not connected' }
    }

    const syncId = randomUUID()
    this.logSyncStart(syncId)
    this.broadcastProgress('Starting Epic sync...', 0)

    try {
      const db = dbManager.getDb()
      const account = db.prepare('SELECT auth_data, username FROM accounts WHERE id = ?').get(`epic_${epicId}`) as any
      if (!account || !account.auth_data) {
        throw new Error('No auth data found for Epic account')
      }

      const parsed = JSON.parse(account.auth_data)
      let accessToken = parsed.tokens?.access_token
      let displayName = account.username

      // TODO: Check expiry and refresh if needed
      // For now, assume token is valid or user needs to re-login if expired long ago

      let totalSynced = 0

      if (accessToken) {
        // 1. Profile Sync
        this.broadcastProgress('Syncing profile...', 10)
        const profileRes = await fetch('https://api.epicgames.dev/epic/oauth/v2/userInfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        })
        
        if (profileRes.ok) {
          const profile = await profileRes.json() as any
          const newDisplayName = profile.displayName || profile.preferred_username || profile.name || displayName || 'Epic User'
          db.prepare('UPDATE accounts SET username = ?, last_synced = ? WHERE id = ?')
            .run(newDisplayName, new Date().toISOString(), `epic_${epicId}`)
          totalSynced++
        }

        // 2. Friends Sync
        this.broadcastProgress('Syncing friends...', 30)
        const friendsCount = await this.syncFriends(epicId, accessToken)
        totalSynced += friendsCount

        // 3. Games Sync
        this.broadcastProgress('Syncing library...', 60)
        const gamesCount = await this.syncGames(epicId, accessToken)
        totalSynced += gamesCount
      }

      this.logSyncComplete(syncId, totalSynced)
      this.broadcastProgress('Sync complete!', 100)
      return { success: true, totalSynced }
    } catch (error: any) {
      console.error('Epic sync failed:', error)
      this.logSyncError(syncId, error.message)
      this.broadcastProgress('Sync failed: ' + error.message, 0)
      return { success: false, error: error.message }
    }
  }

  private async syncFriends(epicId: string, accessToken: string): Promise<number> {
    try {
      // 1. Get Friend IDs
      const friendsRes = await fetch(`https://api.epicgames.dev/epic/friends/v1/${epicId}/friends`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      if (!friendsRes.ok) {
        console.warn(`Epic friends fetch failed: ${friendsRes.status}`)
        return 0
      }

      const friendsData = await friendsRes.json() as Array<{ accountId: string, status: string, direction: string }>
      // Filter for accepted friends
      const acceptedFriends = friendsData.filter(f => f.status === 'ACCEPTED')
      
      if (acceptedFriends.length === 0) return 0

      // 2. Get Profiles for these IDs to get Display Names
      // Epic allows bulk profile lookup: https://api.epicgames.dev/epic/id/v2/sdk/accounts?accountId=...
      // Max 100 per request usually.
      const friendIds = acceptedFriends.map(f => f.accountId)
      const profiles: any[] = []
      
      // Batch in chunks of 50
      for (let i = 0; i < friendIds.length; i += 50) {
        const chunk = friendIds.slice(i, i + 50)
        const query = chunk.map(id => `accountId=${id}`).join('&')
        const profileRes = await fetch(`https://api.epicgames.dev/epic/id/v2/sdk/accounts?${query}`, {
           headers: { Authorization: `Bearer ${accessToken}` }
        })
        if (profileRes.ok) {
          const chunkProfiles = await profileRes.json() as any[]
          profiles.push(...chunkProfiles)
        }
      }

      const db = dbManager.getDb()
      const insert = db.prepare(`
        INSERT INTO friends (id, platform, external_id, username, status)
        VALUES (@id, 'epic', @external_id, @username, @status)
        ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        status = excluded.status
      `)

      const insertMany = db.transaction((rows: any[]) => {
        for (const row of rows) insert.run(row)
      })

      const rowsToInsert = acceptedFriends.map(f => {
        const profile = profiles.find(p => p.accountId === f.accountId)
        return {
          id: `epic_${f.accountId}`,
          external_id: f.accountId,
          username: profile?.displayName || profile?.preferred_username || `Epic User ${f.accountId}`,
          status: 'offline' // We don't have presence yet without XMPP/EOS Connect
        }
      })

      insertMany(rowsToInsert)

      return rowsToInsert.length

    } catch (e) {
      console.error('Error syncing Epic friends:', e)
      return 0
    }
  }

  private async syncGames(epicId: string, accessToken: string): Promise<number> {
    try {
      // 1. Get Entitlements (closest thing to owned games)
      // https://api.epicgames.dev/epic/id/v2/sdk/accounts/{accountId}/entitlements
      const entitlementsRes = await fetch(`https://api.epicgames.dev/epic/id/v2/sdk/accounts/${epicId}/entitlements`, {
         headers: { Authorization: `Bearer ${accessToken}` }
      })

      if (!entitlementsRes.ok) {
        console.warn(`Epic entitlements fetch failed: ${entitlementsRes.status}`)
        return 0
      }

      const entitlements = await entitlementsRes.json() as Array<{ entitlementName: string, itemId: string, namespace: string, grantDate: string }>
      
      if (!entitlements || entitlements.length === 0) return 0

      const db = dbManager.getDb()
      const insert = db.prepare(`
        INSERT INTO games (id, platform_game_id, account_id, title, normalized_title, is_installed, playtime_seconds)
        VALUES (@id, @platform_game_id, @account_id, @title, @normalized_title, 0, 0)
        ON CONFLICT(id) DO NOTHING
      `)

      const insertMany = db.transaction((rows: any[]) => {
        for (const row of rows) insert.run(row)
      })

      // Simple mapping: Use entitlementName if available, else ID
      const rowsToInsert = entitlements.map(e => {
        const title = e.entitlementName || `Unknown Epic Game (${e.itemId})`
        return {
          id: `epic_${e.itemId}`,
          platform_game_id: e.itemId,
          account_id: `epic_${epicId}`,
          title: title,
          normalized_title: title.toLowerCase()
        }
      })

      insertMany(rowsToInsert)

      // Apply classification
      try {
        for (const row of rowsToInsert) {
           await classificationService.applyClassification(row.id)
        }
      } catch (e) {
        console.warn('[Epic] Classification failed:', e)
      }

      return rowsToInsert.length

    } catch (e) {
      console.error('Error syncing Epic games:', e)
      return 0
    }
  }

  private broadcastProgress(message: string, percent: number) {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('epic:sync-progress', { message, percent }))
  }

  private logSyncStart(id: string) {
    const db = dbManager.getDb()
    db.prepare(
      'INSERT INTO sync_history (id, platform, sync_type, status, started_at) VALUES (?, ?, ?, ?, ?)'
    ).run(id, 'epic', 'full', 'in_progress', new Date().toISOString())
  }

  private logSyncComplete(id: string, count: number) {
    const db = dbManager.getDb()
    db.prepare(
      'UPDATE sync_history SET status = ?, items_synced = ?, completed_at = ? WHERE id = ?'
    ).run('success', count, new Date().toISOString(), id)
  }

  private logSyncError(id: string, error: string) {
    const db = dbManager.getDb()
    db.prepare(
      'UPDATE sync_history SET status = ?, error_message = ?, completed_at = ? WHERE id = ?'
    ).run('failed', error, new Date().toISOString(), id)
  }
}

export const epicService = new EpicService()
