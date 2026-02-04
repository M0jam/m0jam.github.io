import { ipcMain, BrowserWindow, net } from 'electron'
import { exec, ExecException } from 'child_process'
import { join } from 'path'
import { dbManager } from '../database'
import { classificationService } from './classification-service'
import { randomUUID } from 'crypto'
import { encryptToHex, decryptFromHex } from '../utils/secure-store'

export class GogService {
  private autoSyncInterval: NodeJS.Timeout | null = null
  private readonly CLIENT_ID = '46899977096215655'
  private readonly REDIRECT_URI = 'https://embed.gog.com/on_login_success?origin=client'

  constructor() {
    this.registerHandlers()
    this.initAutoSync()
  }

  private registerHandlers() {
    ipcMain.handle('gog:auth', () => this.authenticate())
    ipcMain.handle('gog:sync', (_, { gogId }) => this.syncAll(gogId))
    ipcMain.handle('gog:get-status', () => this.getConnectionStatus())
    ipcMain.handle('gog:disconnect', () => this.disconnect())
  }

  private initAutoSync() {
    this.autoSyncInterval = setInterval(() => {
      const status = this.getConnectionStatus()
      if (status.connected && status.gogId) {
        this.syncAll(status.gogId).catch(() => {})
      }
    }, 60 * 60 * 1000)
  }

  private async makeRequest(url: string, options: { method?: string, headers?: Record<string, string>, body?: string, gogId?: string } = {}, retries = 2): Promise<any> {
    try {
      // Auto-inject token if gogId provided and Auth header missing
      if (options.gogId && (!options.headers || !options.headers.Authorization)) {
        const token = await this.getToken(options.gogId)
        if (token) {
          if (!options.headers) options.headers = {}
          options.headers.Authorization = `Bearer ${token}`
        }
      }

      return await this._executeRequest(url, options)
    } catch (err: any) {
      // Handle Token Expiration
      if (err.message.includes('Unauthorized') && options.gogId) {
        console.log(`Token expired for ${options.gogId}, attempting refresh...`)
        const newToken = await this.refreshAccessToken(options.gogId)
        if (newToken) {
          if (!options.headers) options.headers = {}
          options.headers.Authorization = `Bearer ${newToken}`
          return this._executeRequest(url, options)
        }
      }

      const isRetryable = !err.message.includes('Unauthorized') && !err.message.includes('status 4')
      if (retries > 0 && isRetryable) {
        console.log(`Retrying request to ${url} (${retries} attempts left). Error: ${err.message}`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return this.makeRequest(url, options, retries - 1)
      }
      throw err
    }
  }

  private async getToken(gogId: string): Promise<string | null> {
    const accountId = `gog_${gogId}`
    const db = dbManager.getDb()
    const account = db.prepare('SELECT auth_data FROM accounts WHERE id = ?').get(accountId) as any
    if (!account || !account.auth_data) return null
    try {
      const authData = JSON.parse(decryptFromHex(account.auth_data))
      return authData.access_token
    } catch { return null }
  }

  private async _executeRequest(url: string, options: { method?: string, headers?: Record<string, string>, body?: string } = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = net.request({ url, method: options.method || 'GET' })
      
      if (options.headers) {
        for (const [key, value] of Object.entries(options.headers)) {
          request.setHeader(key, value)
        }
      }

      request.on('response', (response) => {
        let data = ''
        response.on('data', (chunk) => {
          data += chunk.toString()
        })
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              // Fallback for non-JSON response if needed, though GOG API usually returns JSON
              resolve(data)
            }
          } else {
            console.error('Request failed:', url, response.statusCode, data)
            if (response.statusCode === 401) {
              reject(new Error('Unauthorized: Token expired or invalid'))
            } else {
              reject(new Error(`Request failed with status ${response.statusCode}: ${data}`))
            }
          }
        })
        response.on('error', (err: Error) => reject(err))
      })

      request.on('error', (err: Error) => reject(err))

      if (options.body) {
        request.write(options.body)
      }
      request.end()
    })
  }

  private async performAuthFlow(showWindow: boolean): Promise<{ success: boolean; gogId?: string; displayName?: string; error?: string; accessToken?: string }> {
    return new Promise((resolve) => {
      let isResolved = false
      const safeResolve = (value: any) => {
        if (!isResolved) {
          isResolved = true
          resolve(value)
        }
      }

      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: showWindow,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      const params = new URLSearchParams()
      params.set('client_id', this.CLIENT_ID)
      params.set('redirect_uri', this.REDIRECT_URI)
      params.set('response_type', 'token')
      params.set('layout', 'default')
      params.set('brand', 'gog')

      const authUrl = `https://login.gog.com/auth?${params.toString()}`
      
      const handleUrl = async (event: Electron.Event, url: string) => {
        if (!url.startsWith('https://embed.gog.com/on_login_success')) return
        
        try {
          const urlObj = new URL(url)
          const error = urlObj.searchParams.get('error')
          if (error) throw new Error(error)

          const hash = urlObj.hash.substring(1)
          const hashParams = new URLSearchParams(hash)
          const accessToken = hashParams.get('access_token')
          
          if (!accessToken) return

          console.log(`GOG: Got access token (interactive: ${showWindow})`)
          
          const userData = await this._executeRequest('https://embed.gog.com/userData.json', {
            headers: { Authorization: `Bearer ${accessToken}` }
          })
          
          if (!userData.userId) {
             safeResolve({ success: false, error: 'Invalid user data' })
             authWindow.close()
             return
          }

          const gogId = userData.userId
          const displayName = userData.username
          const accountId = `gog_${gogId}`

          const db = dbManager.getDb()
          
          const authData = JSON.stringify({
            access_token: accessToken,
            expires_in: hashParams.get('expires_in'),
            scope: hashParams.get('scope')
          })
          const encryptedAuthData = encryptToHex(authData)

          db.prepare(`
            INSERT INTO accounts (id, platform, username, auth_data, status, last_synced)
            VALUES (?, 'gog', ?, ?, 'online', CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
            username = excluded.username,
            auth_data = excluded.auth_data,
            status = 'online',
            last_synced = CURRENT_TIMESTAMP
          `).run(accountId, displayName, encryptedAuthData)
          
          safeResolve({ 
            success: true, 
            gogId: gogId, 
            displayName: displayName,
            accessToken: accessToken
          })
          authWindow.close()

        } catch (err: any) {
          console.error('GOG Auth Error:', err)
          safeResolve({ success: false, error: err.message })
          if (!authWindow.isDestroyed()) authWindow.close()
        }
      }

      authWindow.webContents.on('will-redirect', handleUrl)
      authWindow.webContents.on('will-navigate', handleUrl)
      
      if (!showWindow) {
        // Timeout for silent refresh
        setTimeout(() => {
          if (!isResolved && !authWindow.isDestroyed()) {
             console.warn('GOG Silent refresh timed out')
             safeResolve({ success: false, error: 'Timeout' })
             authWindow.close()
          }
        }, 20000)
      }

      authWindow.on('closed', () => {
        safeResolve({ success: false, error: 'Window closed' })
      })

      authWindow.loadURL(authUrl)
    })
  }

  async authenticate(): Promise<{ success: boolean; gogId?: string; displayName?: string; error?: string }> {
    return this.performAuthFlow(true)
  }

  private async refreshAccessToken(expectedGogId: string): Promise<string | null> {
    console.log(`Attempting silent refresh for GOG ID: ${expectedGogId}`)
    const result = await this.performAuthFlow(false)
    
    if (result.success && result.accessToken) {
      if (result.gogId === expectedGogId) {
        console.log('Silent refresh successful')
        return result.accessToken
      } else {
        console.warn(`Silent refresh returned different user ID. Expected: ${expectedGogId}, Got: ${result.gogId}`)
        return null
      }
    }
    
    console.warn('Silent refresh failed:', result.error)
    return null
  }

  getConnectionStatus() {
    const db = dbManager.getDb()
    try {
      const account = db.prepare('SELECT id, username FROM accounts WHERE platform = ?').get('gog') as any
      if (account) {
        // Extract ID from gog_12345
        const gogId = account.id.replace('gog_', '')
        return { connected: true, gogId: gogId, displayName: account.username }
      }
    } catch (e) {
      // Table might not exist or empty
    }
    return { connected: false }
  }

  async disconnect() {
    const db = dbManager.getDb()
    const account = db.prepare('SELECT id FROM accounts WHERE platform = ?').get('gog') as any
    
    if (account) {
      // Delete games first
      db.prepare('DELETE FROM games WHERE account_id = ?').run(account.id)
      // Delete account
      db.prepare('DELETE FROM accounts WHERE id = ?').run(account.id)
    }
    
    return { success: true }
  }

  async syncAll(gogId: string) {
    const accountId = `gog_${gogId}`
    const db = dbManager.getDb()
    
    // Verify account exists
    const account = db.prepare('SELECT 1 FROM accounts WHERE id = ?').get(accountId)
    if (!account) {
      return { success: false, error: 'Account not found' }
    }

    try {
      // Fetch Games (using getFilteredProducts for details)
      let allGames: any[] = []
      let page = 1
      let totalPages = 1

      while (page <= totalPages) {
        const url = `https://embed.gog.com/account/getFilteredProducts?mediaType=1&page=${page}`
        const data = await this.makeRequest(url, { gogId })
        
        if (data.products) {
          allGames = allGames.concat(data.products)
        }
        
        if (data.totalPages) {
          totalPages = data.totalPages
        } else {
          // If totalPages is not returned, break to avoid infinite loop
          break
        }
        
        page++
      }

      // Fetch Playtime/Stats
      const statsMap = new Map<string, { playtime: number, lastPlayed: number | null }>()
      try {
        const statsUrl = 'https://embed.gog.com/user/data/games'
        const statsData = await this.makeRequest(statsUrl, { gogId })
        
        if (statsData && Array.isArray(statsData.owned)) {
          for (const game of statsData.owned) {
            const id = String(game.id)
            const playtimeMinutes = game.stats?.playtime || 0
            const lastSession = game.stats?.lastSession ? new Date(game.stats.lastSession).getTime() : null
            statsMap.set(id, {
              playtime: playtimeMinutes * 60, // convert to seconds
              lastPlayed: lastSession
            })
          }
        }
      } catch (statsErr) {
        console.warn('Failed to fetch GOG stats, continuing without playtime data:', statsErr)
      }
      
      const games = allGames

      const insertGame = db.prepare(`
        INSERT INTO games (id, platform_game_id, account_id, title, normalized_title, box_art_url, is_installed, playtime_seconds, last_played)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        box_art_url = excluded.box_art_url,
        playtime_seconds = excluded.playtime_seconds,
        last_played = excluded.last_played
      `)
      
      // We need to check for existing game to preserve ID if possible, 
      // OR we use deterministic ID based on platform_game_id?
      // The schema has `id` as PRIMARY KEY. 
      // If we generate randomUUID every time, we will duplicate games if we don't check for existence 
      // or if we don't have a unique constraint on (account_id, platform_game_id).
      // The schema does NOT have a unique constraint on (account_id, platform_game_id) shown in my read, 
      // but `gog-service.ts` previously had `ON CONFLICT(platform, platform_id)`.
      // The `games` table in `database/index.ts` shows:
      // CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, ... )
      // It does NOT show a unique index on (platform_game_id, account_id).
      // So I must handle this manually or rely on a deterministic ID.
      // I'll use a deterministic UUID if possible, or check existence.
      // To be safe and simple, I will query first.
      
          const existingGames = db.prepare('SELECT id, platform_game_id FROM games WHERE account_id = ?').all(accountId) as any[]
      const existingMap = new Map(existingGames.map(g => [g.platform_game_id, g.id]))

      let syncedCount = 0
      const transaction = db.transaction((gamesList) => {
        for (const game of gamesList) {
          if (!game.title) {
            console.warn('GOG Sync: Skipping game with missing title', game)
            continue
          }
          const platformGameId = String(game.id)
          
          // Safety check: GOG IDs should be numeric
          if (!/^\d+$/.test(platformGameId)) {
             console.warn('GOG Sync: Skipping game with invalid ID', game.id)
             continue
          }

          // Ensure ID starts with gog_ for library:get filtering to work
          const gameId = existingMap.get(platformGameId) || `gog_${platformGameId}`
          const title = game.title
          const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          let coverUrl = game.image
          if (coverUrl) {
            if (coverUrl.startsWith('//')) {
              coverUrl = 'https:' + coverUrl
            } else if (coverUrl.startsWith('http://')) {
              coverUrl = coverUrl.replace('http://', 'https://')
            }

            // Append vertical cover art suffix if no extension is present
            // GOG images usually come without extension and support _ggvgm_2x.jpg (Vertical Game Medium 2x)
            if (!/\.(jpg|jpeg|png|webp)$/i.test(coverUrl)) {
              coverUrl += '_ggvgm_2x.jpg'
            }
          }

          const stats = statsMap.get(platformGameId)
          const playtime = stats?.playtime || 0
          const lastPlayed = stats?.lastPlayed || null
          
          insertGame.run(gameId, platformGameId, accountId, title, normalizedTitle, coverUrl, playtime, lastPlayed)
          syncedCount++
        }
      })
      
      transaction(games)
      
      // Update last_synced
      db.prepare('UPDATE accounts SET last_synced = CURRENT_TIMESTAMP WHERE id = ?').run(accountId)
      
      // Scan for installed games to update status
      await this.scanInstalledGames()

      return { success: true, totalSynced: syncedCount }
    } catch (err: any) {
      console.error('GOG Sync Error:', err)
      return { success: false, error: err.message }
    }
  }
  async scanInstalledGames() {
    // We only scan on Windows for now
    if (process.platform !== 'win32') return

    const registryKey = 'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games'
    const db = dbManager.getDb()
    
    return new Promise<void>((resolve) => {
      exec(`reg query "${registryKey}" /s`, (err: ExecException | null, stdout: string) => {
        if (err) {
           console.error('GOG Registry Scan failed (ignoring)', err.message)
           resolve()
           return
        }
        
        const lines = stdout.toString().split('\r\n')
        let currentGameId: string | null = null
        let currentPath: string | null = null
        let currentExe: string | null = null
        
        const updates: {id: string, path: string, exe: string}[] = []

        for (const line of lines) {
           if (line.trim().startsWith('HKEY_')) {
               // New key found. Save previous if valid.
               if (currentGameId && currentPath) {
                   updates.push({ id: currentGameId, path: currentPath, exe: currentExe || '' })
               }

               const parts = line.trim().split('\\')
               const lastPart = parts[parts.length - 1]
               // Check if it looks like a game ID (numeric)
               if (/^\d+$/.test(lastPart)) {
                   currentGameId = lastPart
                   currentPath = null
                   currentExe = null
               } else {
                   currentGameId = null
               }
           } else if (currentGameId) {
               const trimmed = line.trim()
               if (trimmed.startsWith('path') || trimmed.startsWith('PATH')) {
                   const match = trimmed.match(/^(?:path|PATH)\s+REG_SZ\s+(.+)$/)
                   if (match) currentPath = match[1]
               } else if (trimmed.startsWith('exe') || trimmed.startsWith('EXE')) {
                   const match = trimmed.match(/^(?:exe|EXE)\s+REG_SZ\s+(.+)$/)
                   if (match) currentExe = match[1]
               }
           }
        }
        // Push last one
        if (currentGameId && currentPath) {
            updates.push({ id: currentGameId, path: currentPath, exe: currentExe || '' })
        }

        if (updates.length > 0) {
            const tx = db.transaction(() => {
                // Reset installation status for all GOG games
                db.prepare("UPDATE games SET is_installed = 0 WHERE id LIKE 'gog_%'").run()

                const updateStmt = db.prepare(`
                    UPDATE games 
                    SET is_installed = 1, install_path = ?, executable_path = ?
                    WHERE platform_game_id = ? AND id LIKE 'gog_%'
                `)
                
                const getIdStmt = db.prepare("SELECT id FROM games WHERE platform_game_id = ? AND id LIKE 'gog_%'")

                for (const update of updates) {
                    const fullExePath = update.exe ? join(update.path, update.exe) : null
                    updateStmt.run(update.path, fullExePath, update.id)
                    
                    const game = getIdStmt.get(update.id) as any
                    if (game) {
                        try {
                            classificationService.applyClassification(game.id)
                        } catch {}
                    }
                }
            })
            tx()
            console.log(`[GOG Scanner] Found ${updates.length} installed games via Registry.`)
        } else {
            console.log('[GOG Scanner] No installed games found in Registry.')
        }
        
        resolve()
      })
    })
  }
}

export const gogService = new GogService()
