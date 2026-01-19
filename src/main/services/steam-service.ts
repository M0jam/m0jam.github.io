import { ipcMain, BrowserWindow, app } from 'electron'
import { dbManager } from '../database'
import { randomUUID } from 'crypto'

export class SteamService {
  private autoSyncInterval: NodeJS.Timeout | null = null

  constructor() {
    this.registerHandlers()
    this.initAutoSync()
  }

  private registerHandlers() {
    ipcMain.handle('steam:auth', () => this.authenticate())
    ipcMain.handle('steam:sync', (_, { steamId }) => this.syncAll(steamId))
    ipcMain.handle('steam:get-inventory', () => this.getLocalInventory())
    ipcMain.handle('steam:get-sync-history', () => this.getSyncHistory())
    ipcMain.handle('steam:get-status', () => this.getConnectionStatus())
    ipcMain.handle('steam:disconnect', () => this.disconnect())
    ipcMain.handle('steam:save-api-key', (_, { apiKey }) => this.saveApiKey(apiKey))
    ipcMain.handle('steam:sync-friends', () => this.handleSyncFriends())
  }

  private async handleSyncFriends() {
    const status = this.getConnectionStatus()
    if (status.connected && status.steamId) {
      return this.syncFriendsOnly(status.steamId)
    }
    return { success: false, error: 'No connected Steam account' }
  }

  private initAutoSync() {
    // Check every hour
    this.autoSyncInterval = setInterval(() => {
      const status = this.getConnectionStatus()
      if (status.connected && status.steamId) {
        console.log('Starting auto-sync for Steam:', status.steamId)
        this.syncAll(status.steamId).catch(console.error)
      }
    }, 60 * 60 * 1000)
  }

  async authenticate(): Promise<{ success: boolean; steamId?: string; error?: string }> {
    return new Promise((resolve) => {
      const authWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      const steamLoginUrl = 'https://steamcommunity.com/openid/login' +
        '?openid.ns=http://specs.openid.net/auth/2.0' +
        '&openid.mode=checkid_setup' +
        '&openid.return_to=https://playhub.app/auth/callback' +
        '&openid.realm=https://playhub.app' +
        '&openid.identity=http://specs.openid.net/auth/2.0/identifier_select' +
        '&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select'

      authWindow.loadURL(steamLoginUrl)

      authWindow.webContents.on('will-redirect', async (event, url) => {
        if (url.startsWith('https://playhub.app/auth/callback')) {
          event.preventDefault()
          const urlObj = new URL(url)
          const params = new URLSearchParams()

          urlObj.searchParams.forEach((value, key) => {
            if (key.startsWith('openid.')) {
              params.append(key, value)
            }
          })

          params.set('openid.mode', 'check_authentication')

          try {
            const verifyResponse = await fetch('https://steamcommunity.com/openid/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: params.toString()
            })

            const text = await verifyResponse.text()
            const isValid = text.includes('is_valid:true')

            if (!isValid) {
              resolve({ success: false, error: 'Steam login could not be verified' })
              authWindow.close()
              return
            }

            const claimedId = urlObj.searchParams.get('openid.claimed_id')

            if (claimedId) {
              const steamId = claimedId.split('/').pop()
              if (steamId) {
                // Capture cookies for session management
                const cookies = await authWindow.webContents.session.cookies.get({ domain: 'steamcommunity.com' })
                this.saveSteamAccount(steamId, cookies)
                
                resolve({ success: true, steamId })
                authWindow.close()
                return
              }
            }

            resolve({ success: false, error: 'Failed to get Steam ID' })
            authWindow.close()
          } catch {
            resolve({ success: false, error: 'Network error during Steam verification' })
            authWindow.close()
          }
        }
      })

      authWindow.on('closed', () => {
        resolve({ success: false, error: 'Window closed' })
      })
    })
  }

  private disconnect() {
    const db = dbManager.getDb()
    db.prepare(`
      UPDATE accounts 
      SET status = 'disconnected', auth_data = NULL 
      WHERE platform = 'steam'
    `).run()
    return { success: true }
  }

  private getConnectionStatus() {
    const db = dbManager.getDb()
    const row = db.prepare(`
      SELECT id, last_synced 
      FROM accounts 
      WHERE platform = 'steam' AND status = 'connected'
      ORDER BY last_synced DESC NULLS LAST
      LIMIT 1
    `).get() as { id: string; last_synced?: string } | undefined

    if (!row) {
      return { connected: false }
    }

    const steamId = row.id.startsWith('steam_') ? row.id.slice('steam_'.length) : row.id
    return {
      connected: true,
      steamId,
      lastSynced: row.last_synced || null
    }
  }

  private saveSteamAccount(steamId: string, cookies: any[] = []) {
    const db = dbManager.getDb()
    const existing = db.prepare('SELECT id, auth_data FROM accounts WHERE id = ?').get(`steam_${steamId}`) as any
    
    let authData: any = { cookies }
    
    // Preserve API key if it exists
    if (existing && existing.auth_data) {
        try {
            const parsed = JSON.parse(existing.auth_data)
            if (!Array.isArray(parsed) && parsed.apiKey) {
                authData.apiKey = parsed.apiKey
            }
        } catch {}
    }
    
    const authDataStr = JSON.stringify(authData)
    
    if (!existing) {
      db.prepare(`
        INSERT INTO accounts (id, platform, username, status, last_synced, auth_data)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(`steam_${steamId}`, 'steam', `Steam User ${steamId.slice(-4)}`, 'connected', new Date().toISOString(), authDataStr)
    } else {
      // Update cookies on re-login
      db.prepare(`
        UPDATE accounts 
        SET auth_data = ?, status = 'connected' 
        WHERE id = ?
      `).run(authDataStr, `steam_${steamId}`)
    }
  }

  private saveApiKey(apiKey: string) {
    const db = dbManager.getDb()
    const account = db.prepare("SELECT id, auth_data FROM accounts WHERE platform = 'steam' AND status = 'connected'").get() as any
    
    if (account) {
      let authData: any = { cookies: [] }
      try {
        const parsed = JSON.parse(account.auth_data || '[]')
        if (Array.isArray(parsed)) {
            authData.cookies = parsed
        } else {
            authData = parsed
        }
      } catch {}
      
      authData.apiKey = apiKey
      
      db.prepare("UPDATE accounts SET auth_data = ? WHERE id = ?").run(JSON.stringify(authData), account.id)
      return { success: true }
    }
    return { success: false, error: 'No connected Steam account found' }
  }


  private broadcastProgress(message: string, percent: number) {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('steam:sync-progress', { message, percent }))
  }

  private broadcastNotification(title: string, body: string) {
    const wins = BrowserWindow.getAllWindows()
    wins.forEach(w => w.webContents.send('notification:new', { title, body }))
  }

  async syncAll(steamId: string) {
    const syncId = randomUUID()
    this.logSyncStart(syncId, 'full')
    this.broadcastProgress('Starting Steam sync...', 0)

    try {
      // Get cookies from DB
      const db = dbManager.getDb()
      const account = db.prepare('SELECT auth_data FROM accounts WHERE id = ?').get(`steam_${steamId}`) as { auth_data: string }
      let cookies = []
      let apiKey = null

      try {
        const parsed = account?.auth_data ? JSON.parse(account.auth_data) : null
        if (Array.isArray(parsed)) {
            cookies = parsed
        } else if (parsed && typeof parsed === 'object') {
            cookies = parsed.cookies || []
            apiKey = parsed.apiKey || null
        }
      } catch (e) {
        console.error('Failed to parse Steam auth data', e)
      }

      const cookieHeader = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      
      let totalSynced = 0
      
      // 1. Profile (HTML Scrape or XML - stick to XML for profile basics as it's simple)
      this.broadcastProgress('Updating profile...', 10)
      const profile = await this.fetchProfile(steamId, cookieHeader)
      if (profile) {
        this.updateProfile(steamId, profile)
      }

      // 2. Friends (HTML Scrape for Status/Avatar)
      this.broadcastProgress('Syncing friends list...', 30)
      const friends = await this.fetchFriends(steamId, cookieHeader)
      if (friends && friends.length > 0) {
        await this.importFriends(friends)
        totalSynced += friends.length
      }

      // 3. Games (HTML Scrape for rgGames JSON - includes uninstalled)
      this.broadcastProgress('Syncing game library...', 60)
      const games = await this.fetchGames(steamId, cookieHeader, apiKey)
      if (games && games.length > 0) {
        this.importGames(steamId, games)
        totalSynced += games.length
      }


      // 4. Inventory (JSON with Pagination)
      this.broadcastProgress('Syncing inventory...', 80)
      const inventory = await this.fetchInventory(steamId, cookieHeader)
      if (inventory && inventory.length > 0) {
        this.importInventory(steamId, inventory)
        totalSynced += inventory.length
      }

      this.logSyncComplete(syncId, totalSynced)
      this.broadcastProgress('Sync complete!', 100)
      return { success: true, totalSynced }

    } catch (error: any) {
      console.error('Steam sync failed:', error)
      this.logSyncError(syncId, error.message)
      this.broadcastProgress('Sync failed: ' + error.message, 0)
      return { success: false, error: error.message }
    }
  }

  async syncFriendsOnly(steamId: string) {
    const syncId = randomUUID()
    this.logSyncStart(syncId, 'friends')
    
    try {
      const db = dbManager.getDb()
      const account = db.prepare('SELECT auth_data FROM accounts WHERE id = ?').get(`steam_${steamId}`) as { auth_data: string }
      let cookies = []

      try {
        const parsed = account?.auth_data ? JSON.parse(account.auth_data) : null
        if (Array.isArray(parsed)) {
            cookies = parsed
        } else if (parsed && typeof parsed === 'object') {
            cookies = parsed.cookies || []
        }
      } catch (e) {
        console.error('Failed to parse Steam auth data', e)
      }

      const cookieHeader = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
      let totalSynced = 0

      // 1. Profile
      const profile = await this.fetchProfile(steamId, cookieHeader)
      if (profile) {
        this.updateProfile(steamId, profile)
      }

      // 2. Friends
      const friends = await this.fetchFriends(steamId, cookieHeader)
      if (friends && friends.length > 0) {
        await this.importFriends(friends)
        totalSynced += friends.length
      }

      this.logSyncComplete(syncId, totalSynced)
      return { success: true, totalSynced }

    } catch (error: any) {
      console.error('Steam friends sync failed:', error)
      this.logSyncError(syncId, error.message)
      return { success: false, error: error.message }
    }
  }

  // --- Data Fetchers ---

  private async fetchProfile(steamId: string, cookieHeader: string) {
    try {
      // The XML feed is still the most reliable way to get the persona name quickly
      const url = `https://steamcommunity.com/profiles/${steamId}/?xml=1`
      const res = await fetch(url, { headers: { Cookie: cookieHeader } })
      if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
      
      const xml = await res.text()
      const steamID = this.extractXmlTag(xml, 'steamID')
      const avatarFull = this.extractXmlTag(xml, 'avatarFull')
      
      if (!steamID) return null

      return {
        personaname: steamID,
        avatarfull: avatarFull
      }
    } catch (e) {
      console.error('Fetch profile failed', e)
      return null
    }
  }

  private async fetchFriends(steamId: string, cookieHeader: string) {
    try {
      // Scrape the friends page for status and rich data
      const url = `https://steamcommunity.com/profiles/${steamId}/friends/`
      const res = await fetch(url, { headers: { Cookie: cookieHeader } })
      if (!res.ok) throw new Error(`Friends fetch failed: ${res.status}`)
      
      const html = await res.text()
      
      // Regex to match friend blocks
      // <div class="friend_block_holder" data-steamid="[ID]">
      //   ... <img src="[AVATAR]"> ...
      //   ... <div class="friend_block_content"> [NAME] <br> ...
      //   ... <span class="friend_small_text"> [STATUS] </span> ...
      // </div>
      
      const friends = []
      const blockRegex = /<div[^>]+class="friend_block_holder"[^>]+data-steamid="(\d+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/g
      let match

      while ((match = blockRegex.exec(html)) !== null) {
        const steamid = match[1]
        const content = match[2]
        
        // Extract Avatar
        const avatarMatch = content.match(/<img[^>]+src="([^"]+)"/)
        const avatarUrl = avatarMatch ? avatarMatch[1] : null

        // Extract Name (text inside friend_block_content before <br>)
        const nameMatch = content.match(/<div[^>]+class="friend_block_content"[^>]*>([\s\S]*?)<br/)
        const name = nameMatch ? nameMatch[1].trim().replace(/<[^>]+>/g, '') : 'Unknown'

        // Extract Status
        const statusMatch = content.match(/<span[^>]+class="friend_small_text"[^>]*>([\s\S]*?)<\/span>/)
        const statusText = statusMatch ? statusMatch[1].trim().replace(/<[^>]+>/g, '') : 'Offline'
        
        let status = 'offline'
        if (statusText.toLowerCase().includes('online')) status = 'online'
        else if (statusText.toLowerCase().includes('away')) status = 'away'
        else if (statusText.toLowerCase().includes('busy')) status = 'busy'
        else if (statusText.toLowerCase().includes('in-game') || statusText.toLowerCase().startsWith('playing')) status = 'in-game'

        friends.push({
          steamid,
          username: name,
          avatar_url: avatarUrl,
          status,
          status_text: statusText
        })
      }
      
      return friends
    } catch (e) {
      console.error('Fetch friends failed', e)
      return []
    }
  }

  private async fetchGames(steamId: string, cookieHeader: string, apiKey?: string | null) {
    if (apiKey) {
      try {
        console.log('Fetching games using Steam Web API...')
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`API fetch failed: ${res.status}`)
        const data = await res.json()
        
        if (data.response && data.response.games) {
          const gamesData = data.response.games.map((g: any) => ({
            appid: String(g.appid),
            name: g.name,
            playtime_forever: g.playtime_forever,
            logo: g.img_logo_url || null,
            last_played: g.rtime_last_played ? new Date(g.rtime_last_played * 1000).toISOString() : null
          }))
          console.log(`API fetched ${gamesData.length} games`)
          return gamesData
        }
      } catch (e) {
        console.error('Steam Web API fetch failed, falling back to scrape', e)
      }
    }

    try {
      const url = `https://steamcommunity.com/profiles/${steamId}/games/?tab=all&xml=1`
      const res = await fetch(url, { headers: { Cookie: cookieHeader } })
      if (!res.ok) throw new Error(`Games fetch failed: ${res.status}`)
      const xml = await res.text()
      const segments = xml.split('<game>').slice(1)
      const gamesData: any[] = []
      for (const segment of segments) {
        const appIdMatch = segment.match(/<appID>([^<]*)<\/appID>/)
        const nameMatch = segment.match(/<name>([^<]*)<\/name>/)
        if (!appIdMatch || !nameMatch) continue
        const appid = appIdMatch[1].trim()
        const name = nameMatch[1].trim()
        const logoMatch = segment.match(/<logo>([^<]*)<\/logo>/)
        const hoursMatch = segment.match(/<hoursOnRecord>([^<]*)<\/hoursOnRecord>/)
        const lastPlayedMatch = segment.match(/<lastPlayed>([^<]*)<\/lastPlayed>/)
        let playtimeMinutes = 0
        if (hoursMatch && hoursMatch[1].trim()) {
          const hours = parseFloat(hoursMatch[1].trim().replace(',', '.'))
          if (!isNaN(hours) && isFinite(hours)) {
            playtimeMinutes = hours * 60
          }
        }
        gamesData.push({
          appid,
          name,
          playtime_forever: playtimeMinutes,
          logo: logoMatch ? logoMatch[1].trim() : null,
          last_played: lastPlayedMatch ? lastPlayedMatch[1].trim() : null
        })
      }
      if (gamesData.length > 0) {
        return gamesData
      }
    } catch (e) {
      console.error('Fetch games failed (XML)', e)
    }
    try {
      const url = `https://steamcommunity.com/profiles/${steamId}/games/?tab=all`
      const res = await fetch(url, { headers: { Cookie: cookieHeader } })
      if (!res.ok) throw new Error(`Games HTML fetch failed: ${res.status}`)
      const html = await res.text()
      const match = html.match(/var\s+rgGames\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/)
      if (!match) {
        return []
      }
      const jsonText = match[1]
      const data = JSON.parse(jsonText)
      const gamesData: any[] = []
      if (Array.isArray(data)) {
        for (const g of data as any[]) {
          if (!g || !g.appid || !g.name) continue
          let minutes = 0
          if (g.hours_forever) {
            const normalized = String(g.hours_forever).replace(',', '.')
            const hours = parseFloat(normalized)
            if (!isNaN(hours) && isFinite(hours)) {
              minutes = hours * 60
            }
          }
          gamesData.push({
            appid: String(g.appid),
            name: String(g.name),
            playtime_forever: minutes,
            logo: g.logo || null,
            last_played: g.last_played ? String(g.last_played) : null
          })
        }
      } else {
        for (const key of Object.keys(data)) {
          const g = (data as any)[key]
          if (!g || !g.appid || !g.name) continue
          let minutes = 0
          if (g.hours_forever) {
            const normalized = String(g.hours_forever).replace(',', '.')
            const hours = parseFloat(normalized)
            if (!isNaN(hours) && isFinite(hours)) {
              minutes = hours * 60
            }
          }
          gamesData.push({
            appid: String(g.appid),
            name: String(g.name),
            playtime_forever: minutes,
            logo: g.logo || null,
            last_played: g.last_played ? String(g.last_played) : null
          })
        }
      }
      return gamesData
    } catch (e) {
      console.error('Fetch games failed (HTML)', e)
      return []
    }
  }
  
  private async fetchInventory(steamId: string, cookieHeader: string) {
    // Loop through inventory pages for AppID 753 (Steam)
    // To support all games, we would need to know which apps have inventory.
    // For now, we enhance the Steam context fetch to handle pagination and rich data.
    
    let allItems: any[] = []
    let startAssetId: string | undefined = undefined
    let hasMore = true
    const MAX_PAGES = 10 // Safety limit
    let page = 0

    try {
      while (hasMore && page < MAX_PAGES) {
        page++
        let url = `https://steamcommunity.com/inventory/${steamId}/753/6?l=english&count=500`
        if (startAssetId) {
          url += `&start_assetid=${startAssetId}`
        }

        const res = await fetch(url, { headers: { Cookie: cookieHeader } })
        if (!res.ok) break
        
        const data = await res.json() as any
        if (!data.success) break
        
        if (data.assets && data.descriptions) {
            const items = data.assets.map((asset: any) => {
                const desc = data.descriptions.find((d: any) => d.classid === asset.classid && d.instanceid === asset.instanceid)
                return { ...asset, description: desc }
            })
            allItems = [...allItems, ...items]
        }

        if (data.more_items && data.last_assetid) {
            startAssetId = data.last_assetid
        } else {
            hasMore = false
        }
        
        // Rate limit pause
        await new Promise(r => setTimeout(r, 500))
      }
      
      return allItems
    } catch (e) {
      console.error('Fetch inventory failed', e)
      return allItems // Return what we got
    }
  }

  private extractXmlTag(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`, 's'))
    return match ? match[1].trim() : null
  }

  // --- Importers ---

  private updateProfile(steamId: string, profile: any) {
    const db = dbManager.getDb()
    db.prepare(`
      UPDATE accounts 
      SET username = ?, status = 'connected', last_synced = ?, auth_data = auth_data -- touch
      WHERE id = ?
    `).run(profile.personaname, new Date().toISOString(), `steam_${steamId}`)
  }

  private async importFriends(friends: any[]) {
    if (friends.length === 0) return

    const db = dbManager.getDb()
    
    // Check for new friends
    const existingIds = new Set(
        db.prepare("SELECT external_id FROM friends WHERE platform = 'steam'").all().map((row: any) => row.external_id)
    )
    
    let newFriendsCount = 0

    // Update or Insert friend
    const stmt = db.prepare(`
      INSERT INTO friends (id, platform, external_id, username, avatar_url, status, game_activity)
      VALUES (?, 'steam', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        username = excluded.username,
        avatar_url = excluded.avatar_url,
        status = excluded.status,
        game_activity = excluded.game_activity
    `)

    const tx = db.transaction((friendList: any[]) => {
        for (const f of friendList) {
            if (!existingIds.has(f.steamid)) {
                newFriendsCount++
            }
            stmt.run(
                `steam_${f.steamid}`, 
                f.steamid, 
                f.username,
                f.avatar_url,
                f.status,
                f.status_text
            )
        }
    })
    tx(friends)

    if (newFriendsCount > 0) {
        this.broadcastNotification('New Steam Friends', `Found ${newFriendsCount} new friends on Steam.`)
    }
  }

  private importGames(steamId: string, games: any[]) {
    const db = dbManager.getDb()
    
    // Check for new games
    const existingIds = new Set(
        db.prepare("SELECT platform_game_id FROM games WHERE id LIKE 'steam_%'").all().map((row: any) => row.platform_game_id)
    )
    
    let newGamesCount = 0

    const stmt = db.prepare(`
      INSERT INTO games (id, platform_game_id, account_id, title, normalized_title, is_installed, playtime_seconds, box_art_url, background_url)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        playtime_seconds = excluded.playtime_seconds,
        box_art_url = excluded.box_art_url,
        background_url = excluded.background_url
    `)

    const tx = db.transaction((games: any[]) => {
      for (const g of games) {
        if (!existingIds.has(g.appid.toString())) {
            newGamesCount++
        }
        
        const gameId = `steam_${g.appid}`
        const boxArt = g.logo 
            ? `https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.logo}.jpg` 
            : `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`
        
        const bgArt = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${g.appid}/header.jpg`
        
        stmt.run(
          gameId,
          g.appid.toString(),
          `steam_${steamId}`,
          g.name,
          g.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
          g.playtime_forever * 60,
          boxArt,
          bgArt
        )
      }
    })
    tx(games)

    if (newGamesCount > 0) {
        this.broadcastNotification('New Steam Games', `Added ${newGamesCount} new games to your library.`)
    }
  }

  private importInventory(steamId: string, items: any[]) {
    const db = dbManager.getDb()
    const stmt = db.prepare(`
      INSERT INTO inventory_items (id, owner_id, platform, external_id, name, description, icon_url, type, rarity, appid, contextid)
      VALUES (?, ?, 'steam', ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        icon_url = excluded.icon_url
    `)

    const tx = db.transaction((items: any[]) => {
      for (const item of items) {
        const desc = item.description || {}
        const iconUrl = desc.icon_url ? `https://community.cloudflare.steamstatic.com/economy/image/${desc.icon_url}` : null
        const typeTag = desc.tags?.find((t: any) => t.category === 'item_class')?.name || 'Item'
        const rarityTag = desc.tags?.find((t: any) => t.category === 'rarity')?.name || 'Common'
        const marketable = desc.marketable ? ' (Marketable)' : ''

        stmt.run(
          `steam_${item.assetid}`,
          `steam_${steamId}`, // owner
          item.assetid,
          (desc.market_name || desc.name || 'Unknown Item') + marketable,
          desc.descriptions?.map((d: any) => d.value).join('\n') || '',
          iconUrl,
          typeTag,
          rarityTag,
          753, // appid
          6 // contextid (Steam Community items are usually 6, Coupons 2? Actually it varies. URL used 6)
        )
      }
    })
    tx(items)
  }

  // --- Sync History Logging ---

  private logSyncStart(id: string, type: string) {
    const db = dbManager.getDb()
    db.prepare('INSERT INTO sync_history (id, platform, sync_type, status, started_at) VALUES (?, ?, ?, ?, ?)').run(id, 'steam', type, 'in_progress', new Date().toISOString())
  }

  private logSyncComplete(id: string, count: number) {
    const db = dbManager.getDb()
    db.prepare('UPDATE sync_history SET status = ?, items_synced = ?, completed_at = ? WHERE id = ?').run('success', count, new Date().toISOString(), id)
  }

  private logSyncError(id: string, error: string) {
    const db = dbManager.getDb()
    db.prepare('UPDATE sync_history SET status = ?, error_message = ?, completed_at = ? WHERE id = ?').run('failed', error, new Date().toISOString(), id)
  }

  private getSyncHistory() {
    const db = dbManager.getDb()
    return db.prepare('SELECT * FROM sync_history ORDER BY started_at DESC LIMIT 10').all()
  }

  private getLocalInventory() {
    const db = dbManager.getDb()
    return db.prepare('SELECT * FROM inventory_items ORDER BY created_at DESC').all()
  }
}

export const steamService = new SteamService()
