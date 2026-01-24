import { dbManager } from '../database'
import { ipcMain, app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import os from 'os'

// Basic VDF parser (Valve Data Format) - simplified for finding app manifests
function parseVdf(content: string): any {
  // This is a very rough parser for libraryfolders.vdf
  // For production, use a library like @node-steam/vdf
  // Here we just look for "path" keys
  const paths: string[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.includes('"path"')) {
      const match = line.match(/"path"\s+"(.+?)"/)
      if (match) {
        paths.push(match[1].replace(/\\\\/g, '\\'))
      }
    }
  }
  return paths
}

export class SteamScanner {
  constructor() {
    this.registerHandlers()
  }

  private registerHandlers() {
    ipcMain.handle('steam:scan', async (_, customPath?: string) => {
      return this.scanInstalledGames(customPath)
    })
  }

  async scanInstalledGames(customPath?: string) {
    console.log('Scanning for Steam games...')
    const db = dbManager.getDb()
    
    // Check for an existing real Steam account
    const existingAccount = db.prepare("SELECT id, username FROM accounts WHERE platform = 'steam' AND id != 'local_steam_user' ORDER BY last_synced DESC LIMIT 1").get() as { id: string, username: string } | undefined
    
    let accountId = 'local_steam_user'
    
    if (existingAccount) {
        console.log(`Associating scanned games with Steam account: ${existingAccount.username} (${existingAccount.id})`)
        accountId = existingAccount.id
    } else {
        // Ensure the local_steam_user account exists if we don't have a real one
        db.prepare(`
          INSERT OR IGNORE INTO accounts (id, platform, username, status)
          VALUES (?, ?, ?, ?)
        `).run('local_steam_user', 'steam', 'Local Steam User', 'connected')
    }

    const steamPaths = this.detectSteamPaths()
    
    if (customPath && fs.existsSync(customPath)) {
        steamPaths.push(customPath)
    }

    const foundGameIds = new Set<string>()
    let foundGames = 0

    for (const steamPath of steamPaths) {
        const steamAppsPath = join(steamPath, 'steamapps')
        if (!fs.existsSync(steamAppsPath)) continue

        const files = fs.readdirSync(steamAppsPath)
        for (const file of files) {
            if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
                try {
                    const content = fs.readFileSync(join(steamAppsPath, file), 'utf-8')
                    const appIdMatch = content.match(/"appid"\s+"(\d+)"/)
                    const nameMatch = content.match(/"name"\s+"(.+?)"/)
                    const installDirMatch = content.match(/"installdir"\s+"(.+?)"/)

                    if (appIdMatch && nameMatch) {
                        const appId = appIdMatch[1]
                        const name = nameMatch[1]
                        const installDir = installDirMatch ? installDirMatch[1] : ''
                        
                        // Construct a high-res cover URL from Steam CDN
                        // Library Header: https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appId}/header.jpg
                        // Library Hero: https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appId}/library_hero.jpg
                        // Vertical Box Art (600x900): https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appId}/library_600x900.jpg
                        const boxArtUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`
                        const backgroundUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_hero.jpg`

                        const gameId = `steam_${appId}`
                        foundGameIds.add(gameId)
                        
                        // Upsert into DB
                        db.prepare(`
                            INSERT INTO games (
                                id, platform_game_id, account_id, title, normalized_title, 
                                install_path, is_installed, box_art_url, background_url
                            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                            ON CONFLICT(id) DO UPDATE SET 
                                is_installed = 1,
                                install_path = excluded.install_path,
                                box_art_url = excluded.box_art_url,
                                background_url = excluded.background_url,
                                account_id = ?
                        `).run(
                            gameId, 
                            appId, 
                            accountId, 
                            name, 
                            name.toLowerCase(), 
                            join(steamAppsPath, 'common', installDir),
                            boxArtUrl,
                            backgroundUrl,
                            accountId // Update account_id on conflict too
                        )
                        foundGames++
                    }
                } catch (e) {
                    console.error('Error parsing manifest:', file, e)
                }
            }
        }
    }

    // Handle uninstalled games
    // Find all games that are currently marked as installed but were NOT found in this scan
    const currentlyInstalled = db.prepare("SELECT id FROM games WHERE id LIKE 'steam_%' AND is_installed = 1").all() as {id: string}[]
    const installedIds = currentlyInstalled.map(g => g.id)
    const toUninstall = installedIds.filter(id => !foundGameIds.has(id))

    if (toUninstall.length > 0) {
        console.log(`Marking ${toUninstall.length} games as uninstalled.`)
        const uninstallStmt = db.prepare("UPDATE games SET is_installed = 0, install_path = NULL WHERE id = ?")
        const uninstallTx = db.transaction((ids: string[]) => {
            for (const id of ids) uninstallStmt.run(id)
        })
        uninstallTx(toUninstall)
    }

    console.log(`Found ${foundGames} installed Steam games.`)
    return foundGames
  }

  private getCacheFilePath(): string {
    const userData = app.getPath('userData')
    return join(userData, 'steam-paths.json')
  }

  private loadCachedPaths(): string[] {
    try {
      const cachePath = this.getCacheFilePath()
      if (!fs.existsSync(cachePath)) return []
      const raw = fs.readFileSync(cachePath, 'utf-8')
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed.filter(p => typeof p === 'string' && fs.existsSync(p))
    } catch {
      return []
    }
  }

  private saveCachedPaths(paths: string[]) {
    try {
      const unique = [...new Set(paths)]
      const cachePath = this.getCacheFilePath()
      fs.mkdirSync(join(cachePath, '..'), { recursive: true })
      fs.writeFileSync(cachePath, JSON.stringify(unique), 'utf-8')
    } catch {
    }
  }

  private detectSteamPaths(): string[] {
    const paths: string[] = []

    if (process.platform === 'win32') {
      const programFiles = process.env['ProgramFiles(x86)'] || process.env.ProgramFiles
      const defaultPath = join(programFiles || 'C:\\Program Files (x86)', 'Steam')
      if (fs.existsSync(defaultPath)) {
        paths.push(defaultPath)
        const vdfPath = join(defaultPath, 'steamapps', 'libraryfolders.vdf')
        if (fs.existsSync(vdfPath)) {
          try {
            const content = fs.readFileSync(vdfPath, 'utf-8')
            const extraPaths = parseVdf(content)
            paths.push(...extraPaths)
          } catch (e) {
            console.error('Failed to parse libraryfolders.vdf', e)
          }
        }
      }
    } else if (process.platform === 'linux') {
      const home = os.homedir()
      const candidates = [
        join(home, '.steam', 'steam'),
        join(home, '.local', 'share', 'Steam')
      ]
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          paths.push(candidate)
          const vdfPath = join(candidate, 'steamapps', 'libraryfolders.vdf')
          if (fs.existsSync(vdfPath)) {
            try {
              const content = fs.readFileSync(vdfPath, 'utf-8')
              const extraPaths = parseVdf(content)
              paths.push(...extraPaths)
            } catch (e) {
              console.error('Failed to parse libraryfolders.vdf', e)
            }
          }
        }
      }
    } else if (process.platform === 'darwin') {
      const home = os.homedir()
      const defaultPath = join(home, 'Library', 'Application Support', 'Steam')
      if (fs.existsSync(defaultPath)) {
        paths.push(defaultPath)
        const vdfPath = join(defaultPath, 'steamapps', 'libraryfolders.vdf')
        if (fs.existsSync(vdfPath)) {
          try {
            const content = fs.readFileSync(vdfPath, 'utf-8')
            const extraPaths = parseVdf(content)
            paths.push(...extraPaths)
          } catch (e) {
            console.error('Failed to parse libraryfolders.vdf', e)
          }
        }
      }
    }

    if (paths.length === 0) {
      const cached = this.loadCachedPaths()
      if (cached.length > 0) {
        return cached
      }
    } else {
      this.saveCachedPaths(paths)
    }

    return [...new Set(paths)]
  }
}

export const steamScanner = new SteamScanner()
