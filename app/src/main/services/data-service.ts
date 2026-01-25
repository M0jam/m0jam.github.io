import { ipcMain } from 'electron'
import { dbManager } from '../database'
import { randomUUID } from 'crypto'

/**
 * Central data service responsible for IPC endpoints that expose
 * news, friends, and library data to the renderer process.
 */
export class DataService {
  private newsInterval: NodeJS.Timeout | null = null

  constructor() {
    this.registerHandlers()
  }

  /**
   * Fetches the latest news for a subset of owned Steam games and
   * upserts them into the local SQLite `news` table.
   *
   * This method is designed to be idempotent and safe to call on a schedule.
   */
  private async syncNews() {
    const db = dbManager.getDb()
    const games = db
      .prepare(
        `
        SELECT id, platform_game_id, title
        FROM games
        WHERE id LIKE 'steam_%'
        ORDER BY playtime_seconds DESC, last_played DESC
        LIMIT 10
      `
      )
      .all() as any[]

    if (!games || games.length === 0) {
      console.log('[News] No Steam games found for news sync')
      return
    }

    const insert = db.prepare(
      `
      INSERT OR REPLACE INTO news 
        (id, title, summary, url, image_url, source, published_at, related_game_id)
      VALUES 
        (@id, @title, @summary, @url, @image_url, @source, @published_at, @related_game_id)
    `
    )

    for (const game of games) {
      const appId = game.platform_game_id
      if (!appId) continue

      try {
        const res = await fetch(
          `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${appId}&count=3&maxlength=0&format=json`
        )
        if (!res.ok) {
          console.warn('[News] Steam news API returned non-OK status', {
            appId,
            status: res.status
          })
          continue
        }
        const data = (await res.json()) as any
        if (!data || !data.appnews || !Array.isArray(data.appnews.newsitems)) {
          console.warn('[News] Unexpected Steam news response format', { appId })
          continue
        }

        const items = data.appnews.newsitems as any[]
        for (const item of items) {
          const id = `steam_${item.gid}`
          const title = item.title || game.title
          const summary = item.contents ? item.contents.replace(/<[^>]+>/g, '').slice(0, 300) : ''
          const url = item.url || null
          const source = item.feedlabel || 'Steam'
          const publishedAt =
            item.date != null ? new Date(item.date * 1000).toISOString() : new Date().toISOString()

          // 1. Default to Steam header (using the most reliable CDN path)
          let imageUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`
          let imageSourceType = 'steam_header'

          // 2. Try to find image in content (often more relevant than generic header)
          if (item.contents) {
            const imgMatch = item.contents.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i)
            if (imgMatch && imgMatch[1]) {
              let src = imgMatch[1]
              // Fix relative URLs if they exist
              if (src.startsWith('//')) {
                src = 'https:' + src
              }
              
              // Filter out emoticons and small tracking pixels if possible
              if (!src.includes('emoticon') && !src.includes('1x1') && (src.startsWith('http') || src.startsWith('https'))) {
                imageUrl = src
                imageSourceType = 'content_scrape'
              }
            }
          }

          // 3. If external URL exists, try to fetch OG image (highest quality)
          if (url) {
            try {
              const controller = new AbortController()
              const timeout = setTimeout(() => controller.abort(), 8000) // Increased timeout
              const articleRes = await fetch(url, { 
                signal: controller.signal,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                  'Accept-Language': 'en-US,en;q=0.9'
                }
              })
              clearTimeout(timeout)
              if (articleRes.ok) {
                const html = await articleRes.text()
                // More robust regex for OG tags
                const ogMatch =
                  html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                  html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i) ||
                  html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i) ||
                  html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']twitter:image["']/i)
                
                if (ogMatch && ogMatch[1]) {
                  imageUrl = ogMatch[1]
                  imageSourceType = 'og_meta'
                }
              }
            } catch (error: any) {
              if (error.name === 'AbortError') {
                console.log('[News] Timeout fetching article thumbnail (skipped)', { appId })
              } else {
                console.warn('[News] Failed to fetch article thumbnail', { appId, url, error })
              }
            }
          }

          insert.run({
            id,
            title,
            summary,
            url,
            image_url: imageUrl,
            source,
            published_at: publishedAt,
            related_game_id: game.id
          })
        }
      } catch (e) {
        console.error('[News] Failed to sync news for app', appId, e)
      }
    }

    db.prepare(
      `
      DELETE FROM news
      WHERE id NOT IN (
        SELECT id FROM news
        ORDER BY published_at DESC
        LIMIT 200
      )
    `
    ).run()
  }

  /**
   * Starts periodic background news synchronization.
   * Runs an immediate sync on startup, then hourly thereafter.
   */
  public startNewsSync() {
    this.syncNews().catch((error) => {
      console.error('[News] Initial sync failed', error)
    })
    if (this.newsInterval) {
      clearInterval(this.newsInterval)
    }
    this.newsInterval = setInterval(() => {
      this.syncNews().catch((error) => {
        console.error('[News] Scheduled sync failed', error)
      })
    }, 60 * 60 * 1000)
  }

  private getNews() {
    const db = dbManager.getDb()
    return db
      .prepare(
        `
        SELECT * FROM news 
        ORDER BY published_at DESC 
        LIMIT 50
      `
      )
      .all()
  }

  private registerHandlers() {
    ipcMain.handle('news:sync', async () => {
      console.log('[News] Manual sync requested')
      await this.syncNews()
      return this.getNews()
    })

    ipcMain.handle('news:get', () => {
      return this.getNews()
    })

    ipcMain.handle('friends:get', async () => {
      const db = dbManager.getDb()
      // Return existing friends or empty list
      return db
        .prepare(
          `SELECT id, platform, external_id, username, avatar_url, status, game_activity 
           FROM friends 
           ORDER BY 
             CASE status 
               WHEN 'in-game' THEN 1 
               WHEN 'online' THEN 2 
               WHEN 'away' THEN 3 
               WHEN 'busy' THEN 4 
               ELSE 5 
             END ASC,
             username COLLATE NOCASE ASC`
        )
        .all()
    })

    ipcMain.handle('friends:add-local', async (_, { username }: { username: string }) => {
      const name = (username || '').trim()
      if (!name) {
        throw new Error('Username is required')
      }
      const db = dbManager.getDb()
      const id = `playhub_${randomUUID()}`
      db.prepare(
        'INSERT INTO friends (id, platform, external_id, username, avatar_url, status, game_activity) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, 'playhub', null, name, null, 'offline', null)
      return db
        .prepare(
          'SELECT id, platform, external_id, username, avatar_url, status, game_activity FROM friends WHERE id = ?'
        )
        .get(id)
    })

    ipcMain.handle('library:get', async (_, filter: string) => {
      const db = dbManager.getDb()
      let whereClause = ''

      if (filter === 'installed') {
        whereClause = 'WHERE g.is_installed = 1'
      } else if (filter === 'favorites') {
        whereClause = 'WHERE g.is_favorite = 1'
      } else if (filter && filter.startsWith('tag:')) {
        const tagId = parseInt(filter.split(':')[1])
        if (!isNaN(tagId)) {
          return db
            .prepare(
              `SELECT g.*,
                (
                  SELECT t.name
                  FROM tags t
                  JOIN game_tags gt ON gt.tag_id = t.id
                  WHERE gt.game_id = g.id
                    AND t.name IN ('Backlog','Playing','Completed','Abandoned')
                  LIMIT 1
                ) AS status_tag
               FROM games g
               JOIN game_tags gt_filter ON gt_filter.game_id = g.id
               WHERE gt_filter.tag_id = ?`
            )
            .all(tagId)
        }
      } else if (filter && filter !== 'all') {
        return db
          .prepare(
            `SELECT g.*,
              (
                SELECT t.name
                FROM tags t
                JOIN game_tags gt ON gt.tag_id = t.id
                WHERE gt.game_id = g.id
                  AND t.name IN ('Backlog','Playing','Completed','Abandoned')
                LIMIT 1
              ) AS status_tag
             FROM games g
             WHERE g.id LIKE ?`
          )
          .all(`${filter}_%`)
      }

      const baseQuery = `
        SELECT g.*,
          (
            SELECT t.name
            FROM tags t
            JOIN game_tags gt ON gt.tag_id = t.id
            WHERE gt.game_id = g.id
              AND t.name IN ('Backlog','Playing','Completed','Abandoned')
            LIMIT 1
          ) AS status_tag
        FROM games g
        ${whereClause}
      `

      return db.prepare(baseQuery).all()
    })

    ipcMain.handle('library:toggle-favorite', async (_, gameId: string) => {
      const db = dbManager.getDb()
      const game = db.prepare('SELECT is_favorite FROM games WHERE id = ?').get(gameId) as any
      if (game) {
        db.prepare('UPDATE games SET is_favorite = ? WHERE id = ?').run(game.is_favorite ? 0 : 1, gameId)
      }
    })

    ipcMain.handle('game:set-status', async (_, { gameId, status }: { gameId: string; status: string | null }) => {
      const db = dbManager.getDb()
      const validStatuses = ['Backlog', 'Playing', 'Completed', 'Abandoned']

      if (status && !validStatuses.includes(status)) {
        throw new Error('Invalid status')
      }

      const getTagId = (name: string) => {
        const existing = db.prepare('SELECT id FROM tags WHERE name = ?').get(name) as any
        if (existing && existing.id != null) return existing.id
        const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name)
        return result.lastInsertRowid as number
      }

      const statusTagIds = validStatuses.map(getTagId)

      const removeStmt = db.prepare(
        `DELETE FROM game_tags 
         WHERE game_id = ? 
           AND tag_id IN (${statusTagIds.map(() => '?').join(',')})`
      )
      removeStmt.run(gameId, ...statusTagIds)

      if (status) {
        const tagId = getTagId(status)
        db.prepare('INSERT OR IGNORE INTO game_tags (game_id, tag_id) VALUES (?, ?)').run(gameId, tagId)
      }

      return { success: true }
    })
  }
}

export const dataService = new DataService()
