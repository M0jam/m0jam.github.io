import { HowLongToBeatService, HowLongToBeatEntry } from 'howlongtobeat'
import { ipcMain } from 'electron'
import { dbManager } from '../database'
import log from 'electron-log'

export class HLTBService {
  private hltb: HowLongToBeatService

  constructor() {
    this.hltb = new HowLongToBeatService()
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('hltb:search', async (_, title: string) => {
      return this.search(title)
    })
  }

  public async search(title: string): Promise<HowLongToBeatEntry | null> {
    try {
      // Clean title for better search results
      // Remove ™, ®, edition names, etc.
      const cleanTitle = title
        .replace(/[™®©]/g, '')
        .replace(/Game of the Year Edition/i, '')
        .replace(/GOTY/i, '')
        .replace(/Director's Cut/i, '')
        .trim()

      const results = await this.hltb.search(cleanTitle)
      
      if (!results || results.length === 0) {
        return null
      }

      // Find best match
      // 1. Exact match (case insensitive)
      const exact = results.find(r => r.name.toLowerCase() === cleanTitle.toLowerCase())
      if (exact) return exact

      // 2. Similarity (simple check: result name contains query or vice versa)
      // The library usually returns sorted by relevance, so taking the first one is often okay
      // but we want to avoid "Dark Souls II" when searching for "Dark Souls"
      
      // Heuristic: Prefer shortest title that contains the query if query is short?
      // For now, return the first result as it's usually best.
      return results[0]
    } catch (error) {
      log.error('HLTB Search failed:', error)
      return null
    }
  }

  public async updateGame(gameId: string, title: string) {
    try {
      const result = await this.search(title)
      if (result) {
        const db = dbManager.getDb()
        db.prepare(`
          UPDATE games 
          SET hltb_main = ?, hltb_extra = ?, hltb_completionist = ?
          WHERE id = ?
        `).run(result.gameplayMain, result.gameplayMainExtra, result.gameplayCompletionist, gameId)
        return true
      }
      return false
    } catch (error) {
      log.error(`Failed to update HLTB for ${title}:`, error)
      return false
    }
  }
}

export const hltbService = new HLTBService()
