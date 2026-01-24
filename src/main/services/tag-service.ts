import { ipcMain } from 'electron'
import { dbManager } from '../database'
import log from 'electron-log'

export interface Tag {
  id: number
  name: string
}

export class TagService {
  constructor() {
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('tags:get-all', async () => {
      return this.getAllTags()
    })

    ipcMain.handle('tags:create', async (_, name: string) => {
      return this.createTag(name)
    })

    ipcMain.handle('tags:delete', async (_, id: number) => {
      return this.deleteTag(id)
    })

    ipcMain.handle('tags:get-for-game', async (_, gameId: string) => {
      return this.getGameTags(gameId)
    })

    ipcMain.handle('tags:add-to-game', async (_, { gameId, tagId }: { gameId: string; tagId: number }) => {
      return this.addTagToGame(gameId, tagId)
    })

    ipcMain.handle('tags:remove-from-game', async (_, { gameId, tagId }: { gameId: string; tagId: number }) => {
      return this.removeTagFromGame(gameId, tagId)
    })

    ipcMain.handle('tags:get-games', async (_, tagId: number) => {
      return this.getGamesByTag(tagId)
    })
  }

  getAllTags(): Tag[] {
    try {
      const db = dbManager.getDb()
      return db.prepare('SELECT * FROM tags ORDER BY name ASC').all() as Tag[]
    } catch (error) {
      log.error('Failed to get all tags:', error)
      return []
    }
  }

  createTag(name: string): Tag | null {
    try {
      const db = dbManager.getDb()
      const info = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name.trim())
      return { id: Number(info.lastInsertRowid), name: name.trim() }
    } catch (error) {
      log.error(`Failed to create tag ${name}:`, error)
      return null
    }
  }

  deleteTag(id: number): boolean {
    try {
      const db = dbManager.getDb()
      db.transaction(() => {
        db.prepare('DELETE FROM game_tags WHERE tag_id = ?').run(id)
        db.prepare('DELETE FROM tags WHERE id = ?').run(id)
      })()
      return true
    } catch (error) {
      log.error(`Failed to delete tag ${id}:`, error)
      return false
    }
  }

  getGameTags(gameId: string): Tag[] {
    try {
      const db = dbManager.getDb()
      return db.prepare(`
        SELECT t.* FROM tags t
        JOIN game_tags gt ON t.id = gt.tag_id
        WHERE gt.game_id = ?
        ORDER BY t.name ASC
      `).all(gameId) as Tag[]
    } catch (error) {
      log.error(`Failed to get tags for game ${gameId}:`, error)
      return []
    }
  }

  addTagToGame(gameId: string, tagId: number): boolean {
    try {
      const db = dbManager.getDb()
      db.prepare('INSERT OR IGNORE INTO game_tags (game_id, tag_id) VALUES (?, ?)').run(gameId, tagId)
      return true
    } catch (error) {
      log.error(`Failed to add tag ${tagId} to game ${gameId}:`, error)
      return false
    }
  }

  removeTagFromGame(gameId: string, tagId: number): boolean {
    try {
      const db = dbManager.getDb()
      db.prepare('DELETE FROM game_tags WHERE game_id = ? AND tag_id = ?').run(gameId, tagId)
      return true
    } catch (error) {
      log.error(`Failed to remove tag ${tagId} from game ${gameId}:`, error)
      return false
    }
  }

  getGamesByTag(tagId: number): string[] {
    try {
      const db = dbManager.getDb()
      const result = db.prepare('SELECT game_id FROM game_tags WHERE tag_id = ?').all(tagId) as { game_id: string }[]
      return result.map(r => r.game_id)
    } catch (error) {
      log.error(`Failed to get games for tag ${tagId}:`, error)
      return []
    }
  }
}

export const tagService = new TagService()
