import { ipcMain } from 'electron'
import { dbManager } from '../database'
import log from 'electron-log'

export class NotesService {
  constructor() {
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('notes:get', async (_, gameId: string) => {
      return this.getNotes(gameId)
    })

    ipcMain.handle('notes:save', async (_, { gameId, content }: { gameId: string; content: string }) => {
      return this.saveNotes(gameId, content)
    })
  }

  getNotes(gameId: string): string {
    try {
      const db = dbManager.getDb()
      const row = db.prepare('SELECT content FROM game_notes WHERE game_id = ?').get(gameId) as { content: string } | undefined
      return row ? row.content : ''
    } catch (error) {
      log.error(`Failed to get notes for game ${gameId}:`, error)
      return ''
    }
  }

  saveNotes(gameId: string, content: string): boolean {
    try {
      const db = dbManager.getDb()
      const stmt = db.prepare(`
        INSERT INTO game_notes (game_id, content, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(game_id) DO UPDATE SET
        content = excluded.content,
        updated_at = CURRENT_TIMESTAMP
      `)
      stmt.run(gameId, content)
      return true
    } catch (error) {
      log.error(`Failed to save notes for game ${gameId}:`, error)
      return false
    }
  }
}

export const notesService = new NotesService()
