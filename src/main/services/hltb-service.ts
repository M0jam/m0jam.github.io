import { HowLongToBeatService, HowLongToBeatEntry } from 'howlongtobeat'
import { ipcMain, BrowserWindow, app } from 'electron'
import { dbManager } from '../database'
import log from 'electron-log'

// CONSTANTS
const SCRAPE_TIMEOUT_MS = 15000
const SCRAPE_WAIT_MS = 4000
const WINDOW_WIDTH = 800
const WINDOW_HEIGHT = 600
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/120.0.0.0 Safari/537.36'
const HLTB_BASE_URL = 'https://howlongtobeat.com/?q='

export class HLTBService {
  private hltb: HowLongToBeatService

  constructor() {
    this.hltb = new HowLongToBeatService()
    this.registerHandlers()
  }

  private registerHandlers(): void {
    ipcMain.handle('hltb:search', async (_, title: string) => {
      return this.search(title)
    })
  }

  /**
   * Searches for a game on HowLongToBeat.
   * Tries scraping first (to bypass potential 403s), then falls back to the library.
   * 
   * @param title The game title to search for
   * @returns The best matching HLTB entry or null
   */
  public async search(title: string): Promise<HowLongToBeatEntry | null> {
    try {
      const cleanTitle = this.cleanTitle(title)

      // 1. Try library first (Fastest)
      try {
        const results = await this.hltb.search(cleanTitle)
        if (results && results.length > 0) {
          const exact = results.find((r) => r.name.toLowerCase() === cleanTitle.toLowerCase())
          if (exact) return exact
          return results[0]
        }
      } catch (libError) {
        log.warn('HLTB Library search failed, falling back to scrape:', libError)
      }

      // 2. Fallback to scraping (Slow, but bypasses 403)
      try {
        log.info(`Scraping HLTB for: ${cleanTitle}`)
        const scraped = await this.scrape(cleanTitle)
        if (scraped && scraped.length > 0) {
          const exact = scraped.find((r) => r.name.toLowerCase() === cleanTitle.toLowerCase())
          if (exact) return exact
          return scraped[0]
        }
      } catch (scrapeError) {
        log.error('HLTB Scrape failed:', scrapeError)
      }

      return null
    } catch (error) {
      log.error('HLTB Search failed:', error)
      return null
    }
  }

  /**
   * Updates game HLTB data in the database.
   */
  public async updateGame(gameId: string, title: string): Promise<boolean> {
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

  private cleanTitle(title: string): string {
    return title
      .replace(/[™®©]/g, '')
      .replace(/Game of the Year Edition/i, '')
      .replace(/GOTY/i, '')
      .replace(/Director's Cut/i, '')
      .trim()
  }

  /**
   * Scrapes HLTB using a hidden BrowserWindow.
   * Required because the API/Library often gets 403 blocked.
   * 
   * @param title The game title to search for
   * @returns Array of found HLTB entries
   */
  private async scrape(title: string): Promise<HowLongToBeatEntry[]> {
    return new Promise((resolve, reject) => {
      if (!app.isReady()) {
        reject(new Error('App not ready'))
        return
      }

      const win = new BrowserWindow({
        show: false,
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      })

      const url = `${HLTB_BASE_URL}${encodeURIComponent(title)}`

      const cleanup = () => {
        if (!win.isDestroyed()) {
          win.destroy()
        }
      }

      const timeout = setTimeout(() => {
        cleanup()
        resolve([])
      }, SCRAPE_TIMEOUT_MS)

      win.loadURL(url, { userAgent: USER_AGENT })
        .then(async () => {
          // Wait for client-side rendering
          await new Promise((r) => setTimeout(r, SCRAPE_WAIT_MS))

          if (win.isDestroyed()) return

          try {
            const results = await win.webContents.executeJavaScript(this.getScrapeScript(title))
            clearTimeout(timeout)
            cleanup()
            resolve(results)
          } catch (err) {
            clearTimeout(timeout)
            cleanup()
            log.error('Scrape script execution failed', err)
            resolve([])
          }
        })
        .catch((err) => {
          clearTimeout(timeout)
          cleanup()
          log.error('Failed to load HLTB URL', err)
          resolve([])
        })
    })
  }

  /**
   * Returns the client-side script to parse HLTB results.
   */
  private getScrapeScript(searchTerm: string): string {
    return `
      (() => {
        const results = [];
        const items = document.querySelectorAll('li'); 
        for (const item of items) {
          // Identify game items: h3 or h2 with a link, or a.text_white
          const titleEl = item.querySelector('h3 a') || 
                          item.querySelector('h3') || 
                          item.querySelector('h2 a') || 
                          item.querySelector('h2') || 
                          item.querySelector('a.text_white');
          
          if (!titleEl) continue;
          
          const name = titleEl.textContent.trim();
          const text = item.innerText;
          
          // Validate content
          if (!text.includes('Main Story') && 
              !text.includes('Single-Player') && 
              !text.includes('Solo')) {
            continue;
          }

          const parseTime = (label) => {
            // Regex for "Label 12 Hours" or "Label 12½ Hours" or "Label 12 Mins"
            const regex = new RegExp(label + '[\\\\s\\\\n]*(\\\\d+(?:½|\\.5)?)[\\\\s\\\\n]*(Hours|Mins)', 'i');
            const match = text.match(regex);
            if (match) {
              let val = parseFloat(match[1].replace('½', '.5'));
              if (match[2] === 'Mins') val /= 60;
              return val;
            }
            return 0;
          };

          const img = item.querySelector('img');
          
          results.push({
            id: '',
            name: name,
            description: '',
            platforms: [],
            imageUrl: img ? img.src : '',
            timeLabels: [],
            gameplayMain: parseTime('Main Story') || parseTime('Solo') || parseTime('Single-Player'),
            gameplayMainExtra: parseTime('Main \\\\+ Extra') || parseTime('Co-Op'),
            gameplayCompletionist: parseTime('Completionist') || parseTime('Vs.'),
            similarity: 1,
            searchTerm: '${searchTerm}'
          });
        }
        return results;
      })()
    `
  }
}

export const hltbService = new HLTBService()
