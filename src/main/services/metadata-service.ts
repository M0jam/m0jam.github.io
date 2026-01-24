import { ipcMain } from 'electron'
import axios from 'axios'
import { dbManager } from '../database'
import log from 'electron-log'
import { hltbService } from './hltb-service'

// IGDB API Credentials (Client ID/Secret should ideally be env vars or proxied)
// For this local app, we'll need the user to provide them or use a proxy.
// However, to make it work out of the box for the user, we might need a public proxy or
// ask the user to input their Twitch Dev keys. 
// For now, I'll set up the structure and include a placeholder or a free alternative logic if possible.
// IGDB requires OAuth2 app access tokens.

interface IGDBGame {
  id: number
  name: string
  cover?: {
    url: string
  }
  summary?: string
  first_release_date?: number
  genres?: { name: string }[]
  rating?: number
}

export class MetadataService {
  private clientId: string | null = null
  private clientSecret: string | null = null
  private accessToken: string | null = null
  private tokenExpiry: number = 0

  constructor() {
    this.registerIpcHandlers()
    // Initialization moved to initialize() to wait for DB
  }

  public initialize() {
    this.loadCredentials()
  }

  // Initialize with credentials (can be stored in DB/Settings)
  public setCredentials(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.saveCredentials()
    this.authenticate()
  }

  private loadCredentials() {
    try {
      const db = dbManager.getDb()
      const row = db.prepare('SELECT auth_data FROM accounts WHERE platform = ?').get('igdb') as { auth_data: string } | undefined
      
      if (row && row.auth_data) {
        const data = JSON.parse(row.auth_data)
        this.clientId = data.clientId
        this.clientSecret = data.clientSecret
        this.accessToken = data.accessToken
        this.tokenExpiry = data.tokenExpiry || 0
        log.info('IGDB Credentials loaded from DB')
      }
    } catch (error) {
      log.error('Failed to load IGDB credentials:', error)
    }
  }

  private saveCredentials() {
    try {
      const db = dbManager.getDb()
      const authData = JSON.stringify({
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        accessToken: this.accessToken,
        tokenExpiry: this.tokenExpiry
      })
      
      db.prepare(`
        INSERT INTO accounts (id, platform, auth_data, status, last_synced)
        VALUES ('igdb_account', 'igdb', ?, 'online', CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
        auth_data = excluded.auth_data,
        last_synced = CURRENT_TIMESTAMP
      `).run(authData)
      
      log.info('IGDB Credentials saved to DB')
    } catch (error) {
      log.error('Failed to save IGDB credentials:', error)
    }
  }

  private async authenticate() {
    if (!this.clientId || !this.clientSecret) return

    try {
      const response = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`
      )
      this.accessToken = response.data.access_token
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000
      this.saveCredentials() // Update DB with new token
      log.info('IGDB Authenticated successfully')
    } catch (error) {
      log.error('IGDB Authentication failed:', error)
    }
  }

  private async ensureAuth() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate()
    }
  }

  public async searchGame(query: string): Promise<IGDBGame[]> {
    if (!this.accessToken) return []
    
    try {
      await this.ensureAuth()
      const response = await axios.post(
        'https://api.igdb.com/v4/games',
        `search "${query}"; fields name, cover.url, summary, first_release_date, genres.name, rating; limit 10;`,
        {
          headers: {
            'Client-ID': this.clientId!,
            'Authorization': `Bearer ${this.accessToken}`,
          },
        }
      )
      
      // Process cover URLs (IGDB returns //images.igdb.com...)
      return response.data.map((game: any) => ({
        ...game,
        cover: game.cover ? { url: `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` } : undefined
      }))
    } catch (error) {
      log.error('IGDB Search failed:', error)
      return []
    }
  }

  private registerIpcHandlers() {
    ipcMain.handle('metadata:search', async (_, query: string) => {
      return this.searchGame(query)
    })

    ipcMain.handle('metadata:set-credentials', async (_, { clientId, clientSecret }) => {
      this.setCredentials(clientId, clientSecret)
      return true
    })

    ipcMain.handle('metadata:get-credentials', async () => {
      return {
        clientId: this.clientId,
        clientSecret: this.clientSecret
      }
    })
    
    ipcMain.handle('metadata:fetch-missing', async () => {
      return this.fetchMissingMetadata()
    })

    ipcMain.handle('metadata:fetch-all', async () => {
        return this.fetchMissingMetadata(true)
    })
  }

  public async fetchMissingMetadata(force = false) {
    const startTime = performance.now()
    let updatedCount = 0
    const db = dbManager.getDb()

    // 1. Fetch HLTB for all games missing it (Concurrent)
    try {
        const games = db.prepare(`
            SELECT id, title FROM games 
            WHERE hltb_main IS NULL ${force ? '' : ''}
        `).all() as { id: string, title: string }[]

        // Process in chunks of 5 concurrently
        const chunkSize = 5
        for (let i = 0; i < games.length; i += chunkSize) {
            const batch = games.slice(i, i + chunkSize)
            await Promise.all(batch.map(async (game) => {
                try {
                    const updated = await hltbService.updateGame(game.id, game.title)
                    if (updated) updatedCount++
                } catch (e) { 
                    log.warn(`HLTB update failed for ${game.title}:`, e)
                }
            }))
            // Minimal delay to prevent flooding
            await new Promise(resolve => setTimeout(resolve, 100))
        }
    } catch (e) {
        log.error('HLTB Batch sync failed:', e)
    }

    // 2. Fetch Rich Metadata (Steam - Batched)
    try {
      // Find Steam games with missing summary
      const games = db.prepare(`
        SELECT id, title, platform_game_id FROM games 
        WHERE (summary IS NULL OR summary = '') AND id LIKE 'steam_%' ${force ? '' : ''}
      `).all() as { id: string, title: string, platform_game_id: string }[]

      // Chunk into batches of 25 for Steam API
      const BATCH_SIZE = 25
      for (let i = 0; i < games.length; i += BATCH_SIZE) {
        const batch = games.slice(i, i + BATCH_SIZE)
        const appIds = batch.map(g => g.platform_game_id).join(',')

        try {
            const res = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appIds}&l=english&cc=US`, {
                timeout: 5000 // 5s timeout
            })
            
            if (res.data) {
                const transaction = db.transaction((updates: any[]) => {
                    for (const u of updates) {
                        db.prepare(`
                            UPDATE games 
                            SET summary = ?, genres = ?, release_date = ?, rating = ?, box_art_url = COALESCE(box_art_url, ?)
                            WHERE id = ?
                        `).run(u.summary, u.genres, u.release_date, u.rating, u.cover, u.id)
                    }
                })

                const updatesToRun: any[] = []

                for (const game of batch) {
                    const details = res.data[game.platform_game_id]
                    if (details && details.success && details.data) {
                        const d = details.data
                        updatesToRun.push({
                            id: game.id,
                            summary: d.short_description,
                            genres: d.genres ? d.genres.map((g: any) => g.description).join(', ') : '',
                            release_date: d.release_date ? d.release_date.date : '',
                            rating: d.metacritic ? d.metacritic.score : null,
                            cover: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${game.platform_game_id}/library_600x900.jpg`
                        })
                        updatedCount++
                    }
                }

                if (updatesToRun.length > 0) transaction(updatesToRun)
            }
        } catch (err) {
            log.error('Batch steam fetch failed:', err)
        }

        // Rate limit: 25 games per 500ms = 50 games/sec (Safe for Steam)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      const duration = ((performance.now() - startTime) / 1000).toFixed(2)
      log.info(`Metadata Sync completed in ${duration}s. Updated ${updatedCount} games.`)
      return { success: true, count: updatedCount, message: `Updated metadata for ${updatedCount} games in ${duration}s.` }
    } catch (error) {
      log.error('Fetch metadata failed:', error)
      return { success: false, message: 'Failed to fetch metadata' }
    }
  }
}

export const metadataService = new MetadataService()
