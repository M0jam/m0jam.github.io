import { ipcMain, shell } from 'electron'
import { dbManager } from '../database'
import { join } from 'path'
import fs from 'fs'
import { playtimeMonitor } from './playtime-monitor'
import { hltbService } from './hltb-service'
import { classificationService } from './classification-service'
import { randomUUID } from 'crypto'
import log from 'electron-log'

// CONSTANTS
const SESSION_TIMEOUT_MS = 60000 // 1 minute fallback
const PROCESS_CHECK_INTERVAL_MS = 10000 // 10 seconds

export class GameService {
  private metadataCache = new Map<string, any>()
  private searchCache = new Map<string, number>()

  constructor() {
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('game:get-details', async (_, gameId) => {
      return this.getGameDetails(gameId)
    })

    ipcMain.handle('game:launch', async (_, gameId) => {
      return this.launchGame(gameId)
    })

    ipcMain.handle('game:install', async (_, gameId) => {
      return this.installGame(gameId)
    })

    ipcMain.handle('game:browse-files', async (_, gameId) => {
      return this.browseGameFiles(gameId)
    })

    ipcMain.handle('game:uninstall', async (_, gameId) => {
      return this.uninstallGame(gameId)
    })

    ipcMain.handle('game:verify', async (_, gameId) => {
      return this.verifyGame(gameId)
    })

    ipcMain.handle('game:set-rating', async (_, { gameId, rating }) => {
      return this.setGameRating(gameId, rating)
    })

    ipcMain.handle('game:open-store', async (_, gameId) => {
      return this.openStorePage(gameId)
    })

    ipcMain.handle('game:view-achievements', async (_, gameId) => {
      return this.openAchievementsPage(gameId)
    })

    ipcMain.handle('game:add-custom', async (_, payload) => {
      return this.addCustomGame(payload)
    })

    ipcMain.handle('game:get-intro-suggestions', async () => {
      return this.getIntroSuggestions()
    })
  }

  async addCustomGame({ title, executablePath, imageUrl }: { title: string; executablePath: string; imageUrl?: string }) {
    const db = dbManager.getDb()
    
    // Ensure local account exists
    const localAccount = db.prepare("SELECT id FROM accounts WHERE id = 'local'").get()
    if (!localAccount) {
      db.prepare("INSERT INTO accounts (id, platform, username, status, last_synced) VALUES ('local', 'playhub', 'Local Library', 'online', CURRENT_TIMESTAMP)").run()
    }

    const id = `custom_${randomUUID()}`
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '')

    db.prepare(`
      INSERT INTO games (
        id, platform_game_id, account_id, title, normalized_title, 
        executable_path, install_path, box_art_url, is_installed, 
        playtime_seconds, last_played
      ) VALUES (
        ?, ?, 'local', ?, ?, 
        ?, ?, ?, 1, 
        0, null
      )
    `).run(
      id, 
      id, 
      title, 
      normalizedTitle, 
      executablePath, 
      join(executablePath, '..'), // infer install dir
      imageUrl || null
    )

    return { success: true, id }
  }

  async getGameDetails(gameId: string) {
    const db = dbManager.getDb()
    let game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any

    if (!game) throw new Error('Game not found')

    // Parse metadata if it's a string
    if (typeof game.metadata === 'string') {
      try {
        game.metadata = JSON.parse(game.metadata)
      } catch (e) {
        game.metadata = {}
      }
    } else if (!game.metadata) {
        game.metadata = {}
    }

    const tasks: Promise<any>[] = []

    // 1. Fetch Rich Metadata (Parallel)
    if (!game.metadata.description || !game.metadata.screenshots) {
        if (game.id.startsWith('steam_')) {
            tasks.push(this.fetchSteamMetadata(game))
        } else {
            // Also fetch for non-Steam games (GOG, Epic, etc.)
            tasks.push(this.fetchNonSteamMetadata(game))
        }
    }

    // 2. Lazy fetch HLTB data if missing (Parallel)
    if (!game.hltb_main && !game.hltb_extra && !game.hltb_completionist) {
        tasks.push((async () => {
            try {
                const updated = await hltbService.updateGame(game.id, game.title)
                if (updated) {
                    // We'll re-fetch the game object at the end anyway
                }
            } catch (error) {
                log.error('Failed to update HLTB data:', error)
            }
        })())
    }

    // Wait for all updates
    if (tasks.length > 0) {
        await Promise.all(tasks)
        
        // Re-fetch in case metadata/HLTB was updated
        game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any
        if (typeof game.metadata === 'string') {
          try { game.metadata = JSON.parse(game.metadata) } catch (e) { game.metadata = {} }
        }
    }

    return game
  }

  async fetchSteamMetadata(game: any) {
    const metadata = await this.getSteamMetadata(game.platform_game_id)
    if (metadata) {
      const db = dbManager.getDb()
      db.prepare('UPDATE games SET metadata = ? WHERE id = ?').run(JSON.stringify(metadata), game.id)
      // Update local object
      game.metadata = metadata
      try {
        await classificationService.applyClassification(game.id)
      } catch {}
    }
  }

  private async retry<T>(fn: () => Promise<T>, retries = 3, backoff = 1000): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries <= 0) throw error
      await new Promise(r => setTimeout(r, backoff))
      return this.retry(fn, retries - 1, backoff * 2)
    }
  }

  async fetchNonSteamMetadata(game: any) {
    try {
        // 1. Search Steam (or check cache)
        let appId = this.searchCache.get(game.title)
        
        if (!appId) {
            const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(game.title)}&l=english&cc=US`
            const searchRes = await this.retry(() => fetch(searchUrl))
            const searchData = await searchRes.json()

            if (searchData && searchData.items && searchData.items.length > 0) {
                appId = searchData.items[0].id
                if (appId) this.searchCache.set(game.title, appId)
            }
        }

        if (appId) {
            const metadata = await this.getSteamMetadata(appId)
            if (metadata) {
                const db = dbManager.getDb()
                
                let updates = 'metadata = ?'
                const params = [JSON.stringify(metadata)] as any[]
                
                // Update background if missing and we have one from Steam
                if (!game.background_url && metadata.background) {
                    updates += ', background_url = ?'
                    params.push(metadata.background)
                    game.background_url = metadata.background
                }

                // Update box_art_url if missing or broken (GOG often has broken/low-res ones)
                if (metadata.cover) {
                    // Only update if current is missing or we want to enforce high-quality Steam art
                    // For GOG, we often get valid but low-res or 404 URLs. 
                    // Let's prioritize Steam cover if we found a match, as it's high quality (600x900).
                    updates += ', box_art_url = ?'
                    params.push(metadata.cover)
                    game.box_art_url = metadata.cover
                }
                
                params.push(game.id)
                db.prepare(`UPDATE games SET ${updates} WHERE id = ?`).run(...params)
                
                game.metadata = metadata
                
                try {
                  await classificationService.applyClassification(game.id)
                } catch {}
            }
        }
    } catch (error) {
        log.error(`[GameService] Failed to fetch non-Steam metadata for ${game.title}:`, error)
    }
  }

  async getSteamMetadata(appId: string | number): Promise<any | null> {
    const cacheKey = String(appId)
    if (this.metadataCache.has(cacheKey)) {
        return this.metadataCache.get(cacheKey)
    }

    try {
      const response = await this.retry(() => fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`))
      const data = await response.json()
      
      if (data[appId] && data[appId].success) {
        const details = data[appId].data
        const result = {
            type: details.type,
            description: details.short_description,
            about: details.about_the_game,
            developer: details.developers ? details.developers.join(', ') : '',
            publisher: details.publishers ? details.publishers.join(', ') : '',
            release_date: details.release_date ? details.release_date.date : '',
            genres: details.genres ? details.genres.map((g: any) => g.description) : [],
            screenshots: details.screenshots ? details.screenshots.map((s: any) => s.path_thumbnail) : [],
            movies: details.movies ? details.movies.map((m: any) => m.mp4?.['480'] || m.mp4?.max || '').filter(Boolean) : [],
            requirements: details.pc_requirements || {},
            background: details.background,
            cover: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`
        }
        this.metadataCache.set(cacheKey, result)
        return result
      }
    } catch (error) {
      log.error(`[GameService] Failed to fetch Steam metadata for AppID ${appId}:`, error)
    }
    return null
  }

  async launchGame(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any
    if (!game) return { success: false, error: 'Game not found' }

    db.prepare('UPDATE games SET last_played = CURRENT_TIMESTAMP WHERE id = ?').run(gameId)

    const sessionId = await playtimeMonitor.trackSessionStart(gameId)

    if (game.id.startsWith('steam_')) {
        await shell.openExternal(`steam://run/${game.platform_game_id}`)
        
        // For Steam games, we can't easily detect exit without polling processes.
        // But for now, let's assume session lasts until we detect it stops, or we rely on Steam Sync.
        // IMPORTANT: Process polling for Steam games is tricky because 'steam://' returns immediately.
        // We'd need to watch for the game executable process.
        
        // Mock session end for now (1 hour) or implement process watcher later
        // In a real app, we'd spawn a watcher.
        // For this task, we'll rely on the periodic Steam Sync to correct the total playtime.
        // But we want "current session duration" in UI.
        
        // Let's TRY to find the executable name from installation path and poll it.
        this.watchGameProcess(game, sessionId)

        return { success: true }
    } else if (game.id.startsWith('gog_')) {
        // Prefer executable if known (scanned), otherwise Galaxy URI
        if (game.executable_path) {
             let execPath = game.executable_path
             
             // Portable Path Healing
             if (process.env.PLAYHUB_PORTABLE === 'true' && !fs.existsSync(execPath)) {
                 execPath = this.resolvePortablePath(execPath)
             }

             if (fs.existsSync(execPath)) {
                 await shell.openPath(execPath)
                 // Update game object for watcher
                 game.executable_path = execPath
                 game.install_path = join(execPath, '..')
                 this.watchGameProcess(game, sessionId)
                 return { success: true }
             }
        }
        
        // Fallback to Galaxy URI
        await shell.openExternal(`goggalaxy://launchGame/${game.platform_game_id}`)
        // Can't watch process if launched via Galaxy URI without knowing exe path
        // But if we have install_path we might guess
        if (game.install_path) {
             this.watchGameProcess(game, sessionId)
        } else {
             // Fallback: end session after timeout since we can't track
             setTimeout(() => playtimeMonitor.trackSessionEnd(sessionId), SESSION_TIMEOUT_MS)
        }
        return { success: true }
    } else if (game.executable_path) {
        let execPath = game.executable_path
        
        // Portable Path Healing
        if (process.env.PLAYHUB_PORTABLE === 'true' && !fs.existsSync(execPath)) {
             execPath = this.resolvePortablePath(execPath)
        }

        if (fs.existsSync(execPath)) {
            await shell.openPath(execPath)
            // Update game object for watcher
            game.executable_path = execPath
            game.install_path = join(execPath, '..')
            this.watchGameProcess(game, sessionId)
            return { success: true }
        } else {
            playtimeMonitor.trackSessionEnd(sessionId)
            return { success: false, error: 'Executable not found' }
        }
    }

    return { success: false, message: 'No launch method available' }
  }

  private resolvePortablePath(originalPath: string): string {
    // Attempt to resolve path relative to current drive/portable location
    try {
        const portableDir = process.env.PORTABLE_EXECUTABLE_DIR
        if (!portableDir) return originalPath

        const path = require('path')
        // Get current drive root from portable dir (e.g. "E:\")
        const currentRoot = path.parse(portableDir).root
        // Get original path's root (e.g. "F:\")
        const originalRoot = path.parse(originalPath).root

        if (currentRoot && originalRoot && currentRoot !== originalRoot) {
            // Replace drive letter
            const newPath = originalPath.replace(originalRoot, currentRoot)
            if (fs.existsSync(newPath)) {
                log.info(`[Portable] Healed path from ${originalPath} to ${newPath}`)
                return newPath
            }
        }
    } catch (e) {
        log.error('[Portable] Failed to resolve portable path', e)
    }
    return originalPath
  }

  async installGame(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT platform_game_id FROM games WHERE id = ?').get(gameId) as any
    if (game && gameId.startsWith('steam_')) {
      await shell.openExternal(`steam://install/${game.platform_game_id}`)
      return true
    } else if (game && gameId.startsWith('gog_')) {
      await shell.openExternal(`goggalaxy://installGame/${game.platform_game_id}`)
      return true
    }
    return false
  }

  /**
   * Monitors a game process to track playtime.
   * Currently uses a simplified 'tasklist' polling mechanism.
   */
  private async watchGameProcess(game: any, sessionId: string) {
    // This is a simplified watcher. 
    // In production, we'd use 'ps-list' to find the PID matching the executable in the install folder.
    
    // Better approach without native modules:
    // Use 'tasklist' command on Windows to check if process is running.
    
    // 1. Try to guess executable name
    // It's usually in install_path. We can scan for .exe files.
    if (!game.install_path || !fs.existsSync(game.install_path)) {
        // Can't watch if we don't know where it is.
        // We'll auto-close session after 1 minute as fallback if we can't track.
        setTimeout(() => playtimeMonitor.trackSessionEnd(sessionId), SESSION_TIMEOUT_MS)
        return
    }

    const execs = fs.readdirSync(game.install_path).filter(f => f.endsWith('.exe'))
    if (execs.length === 0) {
        setTimeout(() => playtimeMonitor.trackSessionEnd(sessionId), SESSION_TIMEOUT_MS)
        return
    }

    // Pick the largest exe or one matching title? largest is usually the game.
    // Simpler: Just pick the first one for now, or check all of them.
    // Let's check if ANY of them are running.
    
    log.info(`[GameService] Watching process for ${game.title}... Candidates: ${execs.join(', ')}`)

    const checkInterval = setInterval(async () => {
        const { exec } = require('child_process')
        exec('tasklist', (err: Error | null, stdout: string) => {
            if (err) return
            
            const running = execs.some(exe => stdout.toLowerCase().includes(exe.toLowerCase()))
            
            if (!running) {
                // Game stopped
                clearInterval(checkInterval)
                playtimeMonitor.trackSessionEnd(sessionId)
                log.info(`[GameService] Session ended for ${game.title}`)
            }
        })
    }, PROCESS_CHECK_INTERVAL_MS)
  }

  async browseGameFiles(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT install_path FROM games WHERE id = ?').get(gameId) as any
    
    if (game && game.install_path) {
        await shell.openPath(game.install_path)
        return true
    }
    return false
  }

  async uninstallGame(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT platform_game_id FROM games WHERE id = ?').get(gameId) as any
    
    if (game && gameId.startsWith('steam_')) {
        await shell.openExternal(`steam://uninstall/${game.platform_game_id}`)
        // We don't remove from DB immediately, let the scanner handle it or user refresh
        return true
    } else if (game && gameId.startsWith('gog_')) {
        // GOG Galaxy doesn't have a direct uninstall URI that is widely documented/reliable
        // Best effort: Open the game view so user can uninstall
        await shell.openExternal(`goggalaxy://openGameView/${game.platform_game_id}`)
        return true
    }
    return false
  }

  async verifyGame(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT platform_game_id FROM games WHERE id = ?').get(gameId) as any
    
    if (game && gameId.startsWith('steam_')) {
        await shell.openExternal(`steam://validate/${game.platform_game_id}`)
        return true
    }
    return false
  }

  async setGameRating(gameId: string, rating: number) {
    const db = dbManager.getDb()
    db.prepare('UPDATE games SET user_rating = ? WHERE id = ?').run(rating, gameId)
    return true
  }

  async openStorePage(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT platform_game_id FROM games WHERE id = ?').get(gameId) as any
    if (game && gameId.startsWith('steam_')) {
      await shell.openExternal(`https://store.steampowered.com/app/${game.platform_game_id}`)
      return true
    } else if (game && gameId.startsWith('gog_')) {
      await shell.openExternal(`https://www.gog.com/game/${game.platform_game_id}`) // This is a guess, GOG URLs are slug-based.
      // Better to open Galaxy view
      await shell.openExternal(`goggalaxy://openGameView/${game.platform_game_id}`)
      return true
    }
    return false
  }

  async openAchievementsPage(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT platform_game_id FROM games WHERE id = ?').get(gameId) as any
    if (game && gameId.startsWith('steam_')) {
      await shell.openExternal(`https://steamcommunity.com/stats/${game.platform_game_id}/achievements`)
      return true
    }
    return false
  }

  async getIntroSuggestions() {
    const db = dbManager.getDb()
    
    // 1. Last Played (Installed only)
    const lastPlayed = db.prepare(`
      SELECT * FROM games 
      WHERE is_installed = 1 AND last_played IS NOT NULL 
      ORDER BY last_played DESC 
      LIMIT 1
    `).get() as any

    // 2. Random Game (From ALL games, installed or not)
    const randomGameRaw = db.prepare(`
      SELECT * FROM games 
      ORDER BY RANDOM() 
      LIMIT 1
    `).get() as any

    let randomGame = randomGameRaw || null
    
    // Parse metadata for both if needed (simplified)
    const parseMeta = (g: any) => {
      if (!g) return null
      if (typeof g.metadata === 'string') {
        try { g.metadata = JSON.parse(g.metadata) } catch { g.metadata = {} }
      }
      return g
    }

    return {
      lastPlayed: parseMeta(lastPlayed),
      random: parseMeta(randomGame)
    }
  }
}

export const gameService = new GameService()
