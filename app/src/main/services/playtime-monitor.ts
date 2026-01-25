import { dbManager } from '../database'
import { join } from 'path'
import fs from 'fs'
import { parseVdf } from '../utils/vdf-parser'
import { ipcMain } from 'electron'
import * as DiscordRPC from 'discord-rpc'
import { socialService, IntentState, PresenceStatus } from './social-service'

const discordClientId = process.env.DISCORD_RICH_PRESENCE_CLIENT_ID
let rpc: any | null = null
let rpcReady = false
let richPresenceEnabled = true

function getCurrentUserIdForPresence(): string | null {
  const db = dbManager.getDb()
  const nowIso = new Date().toISOString()
  const row = db
    .prepare('SELECT user_id FROM sessions WHERE expires_at > ? ORDER BY last_activity_at DESC LIMIT 1')
    .get(nowIso) as any
  if (!row) return null
  return row.user_id as string
}

function getDiscordStateText(intentState?: IntentState | null, customLabel?: string | null): string {
  if (intentState === 'custom' && customLabel) {
    return customLabel
  }
  if (intentState === 'open_for_coop') return 'Open for co-op'
  if (intentState === 'looking_for_party') return 'Looking for party'
  if (intentState === 'story_mode') return 'Story mode'
  if (intentState === 'competitive') return 'Competitive'
  if (intentState === 'testing_mods') return 'Testing mods'
  if (intentState === 'idle') return 'Idle'
  return 'Using PlayHub'
}

async function initDiscordRpc() {
  if (!discordClientId) return
  if (rpc) return

  try {
    DiscordRPC.register(discordClientId)
    rpc = new DiscordRPC.Client({ transport: 'ipc' })
    rpc.on('ready', () => {
      rpcReady = true
    })
    await rpc.login({ clientId: discordClientId })
  } catch (error) {
    rpc = null
    rpcReady = false
    console.error('[DiscordRPC] Failed to initialize rich presence:', error)
  }
}

async function setDiscordActivityForGame(
  gameId: string,
  title: string,
  startTime: string,
  intentState?: IntentState | null,
  customLabel?: string | null
) {
  if (!richPresenceEnabled) return
  if (!discordClientId) return
  if (!rpc) {
    await initDiscordRpc()
  }
  if (!rpc || !rpcReady) return
  const stateText = getDiscordStateText(intentState, customLabel)

  try {
    await rpc.setActivity({
      details: `Playing ${title}`,
      state: stateText,
      startTimestamp: new Date(startTime),
      largeImageKey: 'playhub',
      largeImageText: 'PlayHub',
      instance: false,
      buttons: [
        {
          label: 'View in Library',
          url: 'https://playhub.local'
        }
      ]
    })
  } catch (error) {
    console.error('[DiscordRPC] Failed to set activity:', error)
  }
}

async function clearDiscordActivity() {
  if (!rpc || !rpcReady) return
  try {
    await rpc.clearActivity()
  } catch (error) {
    console.error('[DiscordRPC] Failed to clear activity:', error)
  }
}

export class PlaytimeMonitor {
  private syncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startAutoSync()
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('playtime:sync', async () => {
      return this.syncSteamPlaytime()
    })

    ipcMain.handle('playtime:get-history', async (_, gameId) => {
      return this.getSessionHistory(gameId)
    })

    ipcMain.handle('playtime:get-current-session', async (_, gameId) => {
      return this.getCurrentSession(gameId)
    })

    ipcMain.handle('presence:get-enabled', async () => {
      return richPresenceEnabled
    })

    ipcMain.handle('presence:set-enabled', async (_event, enabled: boolean) => {
      richPresenceEnabled = !!enabled
      if (!richPresenceEnabled) {
        await clearDiscordActivity()
      }
      return richPresenceEnabled
    })
  }

  public startAutoSync() {
    // Sync every 5 minutes as requested
    this.syncInterval = setInterval(() => {
      this.syncSteamPlaytime()
    }, 5 * 60 * 1000)
    
    // Initial sync
    setTimeout(() => this.syncSteamPlaytime(), 5000)
  }

  public stopAutoSync() {
    if (this.syncInterval) clearInterval(this.syncInterval)
  }

  async syncSteamPlaytime() {
    console.log('[PlaytimeMonitor] Syncing Steam playtime...')
    try {
      const steamUserDataPath = this.detectSteamUserDataPath()
      if (!steamUserDataPath) {
        console.log('[PlaytimeMonitor] Steam userdata path not found.')
        return { success: false, reason: 'userdata_not_found' }
      }

      const userFolders = fs.readdirSync(steamUserDataPath)
      
      for (const userId of userFolders) {
        const localConfigPath = join(steamUserDataPath, userId, 'config', 'localconfig.vdf')
        if (fs.existsSync(localConfigPath)) {
          await this.processLocalConfig(localConfigPath)
        }
      }
      return { success: true }
    } catch (error) {
      console.error('[PlaytimeMonitor] Sync failed:', error)
      return { success: false, error }
    }
  }

  private detectSteamUserDataPath(): string | null {
    const programFiles = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles
    const defaultPath = join(programFiles || 'C:\\Program Files (x86)', 'Steam', 'userdata')
    if (fs.existsSync(defaultPath)) return defaultPath
    return null
  }

  private async processLocalConfig(configPath: string) {
    try {
      const content = fs.readFileSync(configPath, 'utf-8')
      const data = parseVdf(content)
      const root = data.UserLocalConfigStore || data.userlocalconfigstore
      if (!root) return

      const apps = root.Software?.Valve?.Steam?.apps || root.software?.valve?.steam?.apps
      if (!apps) return

      const db = dbManager.getDb()
      let updatedCount = 0

      for (const appId in apps) {
        const appData = apps[appId]
        const playTimeMinutes = parseInt(appData.PlayTimeMinutes || appData.playtimeminutes || '0')
        const lastPlayedUnix = parseInt(appData.LastPlayed || appData.lastplayed || '0')

        if (playTimeMinutes > 0) {
          const gameId = `steam_${appId}`
          const playTimeSeconds = playTimeMinutes * 60
          const lastPlayedDate = lastPlayedUnix > 0 ? new Date(lastPlayedUnix * 1000).toISOString() : null

          const stmt = db.prepare(`
            UPDATE games 
            SET playtime_seconds = ?, 
                last_played = COALESCE(?, last_played)
            WHERE id = ?
          `)
          
          const info = stmt.run(playTimeSeconds, lastPlayedDate, gameId)
          if (info.changes > 0) updatedCount++
        }
      }
      console.log(`[PlaytimeMonitor] Updated playtime for ${updatedCount} games from ${configPath}`)
    } catch (e) {
      console.error('[PlaytimeMonitor] Error parsing localconfig.vdf:', e)
    }
  }

  // --- Session Tracking (Local) ---

  // Called when launching a game via GameService
  public async trackSessionStart(gameId: string) {
    const db = dbManager.getDb()
    const sessionId = require('crypto').randomUUID()
    const startTime = new Date().toISOString()

    const gameRow = db
      .prepare('SELECT title FROM games WHERE id = ?')
      .get(gameId) as { title?: string } | undefined

    let intentStateForRpc: IntentState | null = null
    let customLabelForRpc: string | null = null

    const userId = getCurrentUserIdForPresence()
    if (userId) {
      try {
        const nextStatus: PresenceStatus = socialService.setPresence({
          userId,
          intent_state: 'open_for_coop',
          intent_metadata: { current_game_id: gameId },
          source: 'auto',
        })
        intentStateForRpc = nextStatus.intent_state
        customLabelForRpc = nextStatus.intent_metadata?.custom_label || null
      } catch {
      }
    }

    if (gameRow && gameRow.title) {
      setDiscordActivityForGame(gameId, gameRow.title, startTime, intentStateForRpc, customLabelForRpc)
    }

    db.prepare(`
        INSERT INTO play_sessions (id, game_id, start_time)
        VALUES (?, ?, ?)
    `).run(sessionId, gameId, startTime)

    return sessionId
  }

  public async trackSessionEnd(sessionId: string) {
    const db = dbManager.getDb()
    const endTime = new Date().toISOString()
    
    const session = db.prepare('SELECT game_id, start_time FROM play_sessions WHERE id = ?').get(sessionId) as any
    if (!session) return

    const start = new Date(session.start_time).getTime()
    const end = new Date(endTime).getTime()
    const durationSeconds = Math.floor((end - start) / 1000)

    db.prepare(`
      UPDATE play_sessions 
      SET end_time = ?, duration_seconds = ?
      WHERE id = ?
    `).run(endTime, durationSeconds, sessionId)

    const gameId: string = session.game_id
    if (!gameId) return

    clearDiscordActivity()

    const userId = getCurrentUserIdForPresence()
    if (userId) {
      try {
        const existing: PresenceStatus = socialService.getPresence(userId)
        const currentGameId = existing.intent_metadata?.current_game_id
        if (currentGameId === gameId) {
          socialService.setPresence({
            userId,
            intent_state: 'idle',
            intent_metadata: {
              ...existing.intent_metadata,
              current_game_id: null,
            },
            source: 'auto',
          })
        }
      } catch {
      }
    }

    if (gameId.startsWith('steam_')) {
      db.prepare(`
        UPDATE games 
        SET last_played = ?
        WHERE id = ?
      `).run(endTime, gameId)
    } else {
      db.prepare(`
        UPDATE games 
        SET playtime_seconds = playtime_seconds + ?,
            last_played = ?
        WHERE id = ?
      `).run(durationSeconds, endTime, gameId)
    }
  }

  public getSessionHistory(gameId: string) {
    const db = dbManager.getDb()
    return db.prepare(`
      SELECT * FROM play_sessions 
      WHERE game_id = ? AND end_time IS NOT NULL 
      ORDER BY start_time DESC
    `).all(gameId)
  }

  public getCurrentSession(gameId: string) {
    const db = dbManager.getDb()
    return db.prepare(`
      SELECT * FROM play_sessions
      WHERE game_id = ? AND end_time IS NULL
      ORDER BY start_time DESC
      LIMIT 1
    `).get(gameId)
  }
}

export const playtimeMonitor = new PlaytimeMonitor()
