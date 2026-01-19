import { ipcMain, shell } from 'electron'
import { dbManager } from '../database'
import { join } from 'path'
import fs from 'fs'
import { playtimeMonitor } from './playtime-monitor'
import { randomUUID } from 'crypto'
import { hltbService } from './hltb-service'

export class GameService {
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

    // If missing metadata and it's a Steam game, fetch it
    if ((!game.metadata.description || !game.metadata.screenshots) && game.id.startsWith('steam_')) {
      await this.fetchSteamMetadata(game)
    }

    // Lazy fetch HLTB data if missing
    if (!game.hltb_main && !game.hltb_extra && !game.hltb_completionist) {
        hltbService.updateGame(game.id, game.title).then(updated => {
            if (updated) {
                // We don't need to block response, next time it will be there.
                // Or we could try to push update to frontend? 
                // For now, let it be "eventual consistency" (user reopens modal or it updates next time)
            }
        })
    }

    // Re-fetch in case metadata was updated synchronously
    game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any
    if (typeof game.metadata === 'string') {
      try { game.metadata = JSON.parse(game.metadata) } catch (e) { game.metadata = {} }
    }

    return game
  }

  async fetchSteamMetadata(game: any) {
    try {
      const appId = game.platform_game_id
      const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}`)
      const data = await response.json()
      
      if (data[appId] && data[appId].success) {
        const details = data[appId].data
        const metadata = {
            description: details.short_description,
            about: details.about_the_game,
            developer: details.developers ? details.developers.join(', ') : '',
            publisher: details.publishers ? details.publishers.join(', ') : '',
            release_date: details.release_date ? details.release_date.date : '',
            genres: details.genres ? details.genres.map((g: any) => g.description) : [],
            screenshots: details.screenshots ? details.screenshots.map((s: any) => s.path_thumbnail) : [],
            movies: details.movies ? details.movies.map((m: any) => m.mp4?.['480'] || m.mp4?.max || '').filter(Boolean) : [],
            requirements: details.pc_requirements || {}
        }

        const db = dbManager.getDb()
        db.prepare('UPDATE games SET metadata = ? WHERE id = ?').run(JSON.stringify(metadata), game.id)
      }
    } catch (error) {
      console.error('Failed to fetch Steam metadata:', error)
    }
  }

  async launchGame(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any
    if (!game) throw new Error('Game not found')

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
    } else if (game.executable_path) {
        await shell.openPath(game.executable_path)
        this.watchGameProcess(game, sessionId)
        return { success: true }
    }

    return { success: false, message: 'No launch method available' }
  }

  async installGame(gameId: string) {
    const db = dbManager.getDb()
    const game = db.prepare('SELECT platform_game_id FROM games WHERE id = ?').get(gameId) as any
    if (game && gameId.startsWith('steam_')) {
      await shell.openExternal(`steam://install/${game.platform_game_id}`)
      return true
    }
    return false
  }

  private async watchGameProcess(game: any, sessionId: string) {
    // This is a simplified watcher. 
    // In production, we'd use 'ps-list' to find the PID matching the executable in the install folder.
    // For now, since we don't have ps-list installed and it's a native module, 
    // we'll simulate active session tracking for the UI demonstration, 
    // OR we rely on the fact that the user is "playing" until they close the app or launch another?
    // No, that's bad.
    
    // Better approach without native modules:
    // Use 'tasklist' command on Windows to check if process is running.
    
    // 1. Try to guess executable name
    // It's usually in install_path. We can scan for .exe files.
    if (!game.install_path || !fs.existsSync(game.install_path)) {
        // Can't watch if we don't know where it is.
        // We'll auto-close session after 1 minute as fallback if we can't track.
        setTimeout(() => playtimeMonitor.trackSessionEnd(sessionId), 60000)
        return
    }

    const execs = fs.readdirSync(game.install_path).filter(f => f.endsWith('.exe'))
    if (execs.length === 0) {
        setTimeout(() => playtimeMonitor.trackSessionEnd(sessionId), 60000)
        return
    }

    // Pick the largest exe or one matching title? largest is usually the game.
    // Simpler: Just pick the first one for now, or check all of them.
    // Let's check if ANY of them are running.
    
    console.log(`[GameService] Watching process for ${game.title}... Candidates: ${execs.join(', ')}`)

    const checkInterval = setInterval(async () => {
        const { exec } = require('child_process')
        exec('tasklist', (err: Error | null, stdout: string) => {
            if (err) return
            
            const running = execs.some(exe => stdout.toLowerCase().includes(exe.toLowerCase()))
            
            if (!running) {
                // Game stopped
                clearInterval(checkInterval)
                playtimeMonitor.trackSessionEnd(sessionId)
                console.log(`[GameService] Session ended for ${game.title}`)
            }
        })
    }, 10000) // Check every 10s
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
}

export const gameService = new GameService()
