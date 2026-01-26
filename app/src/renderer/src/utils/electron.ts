
// Safe electron IPC wrapper for browser development
// This module provides a "Simulated Backend" when running in a browser environment (Dev Mode).
// It uses localStorage to persist data, mimicking the behavior of the real Electron backend.

const MOCK_STORAGE_KEYS = {
  USER: 'mock:user',
  GAMES: 'mock:games',
  FRIENDS: 'mock:friends',
  MESSAGES: 'mock:messages'
}

// Helper to generate a consistent placeholder image based on title
const getPlaceholderImage = (title: string, type: 'game' | 'news' = 'game') => {
  const width = type === 'game' ? 600 : 800
  const height = type === 'game' ? 900 : 400
  // Generate a color based on title hash
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  const color1 = `hsl(${hue}, 70%, 20%)`
  const color2 = `hsl(${(hue + 40) % 360}, 70%, 15%)`
  
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:${encodeURIComponent(color1)};stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:${encodeURIComponent(color2)};stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='${width}' height='${height}' fill='url(%23grad)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='rgba(255,255,255,0.2)'%3E${encodeURIComponent(title)}%3C/text%3E%3C/svg%3E`
}

export const electron = (window as any).electron || {
  ipcRenderer: {
    invoke: async (channel: string, ...args: any[]) => {
      console.warn(`[Simulated Backend] invoked: ${channel}`, args)
      
      // --- Auth ---
      if (channel === 'auth:login' || channel === 'auth:register') {
        const payload = args[0] || {}
        const email = payload.email || 'user@example.com'
        const username = payload.username || email.split('@')[0]
        
        const user = {
          id: 'mock-user-1',
          email,
          username,
          avatar_url: null
        }
        localStorage.setItem(MOCK_STORAGE_KEYS.USER, JSON.stringify(user))
        return { user, token: 'mock-session-token' }
      }
      
      if (channel === 'auth:check') {
        const stored = localStorage.getItem(MOCK_STORAGE_KEYS.USER)
        return stored ? JSON.parse(stored) : null
      }

      if (channel === 'auth:logout') {
        localStorage.removeItem(MOCK_STORAGE_KEYS.USER)
        return true
      }

      // --- Window Controls ---
      if (channel.startsWith('window:')) {
        if (channel === 'window:is-maximized') return false
        return null
      }

      // --- Dashboard ---
      if (channel === 'dashboard:get-data') {
        const storedGames = localStorage.getItem(MOCK_STORAGE_KEYS.GAMES)
        const games = storedGames ? JSON.parse(storedGames) : []
        
        const installedGames = games.filter((g: any) => g.is_installed).length
        const totalPlaytime = games.reduce((acc: number, g: any) => acc + (g.playtime_seconds || 0), 0)
        
        return {
          stats: {
            totalGames: games.length,
            installedGames,
            totalPlaytime,
            completedGames: 0
          },
          recentGames: games.slice(0, 5),
          news: [
            { 
              id: '1', 
              title: 'PlayHub Update', 
              image_url: getPlaceholderImage('Update', 'news'), 
              summary: 'Welcome to the latest version of PlayHub.',
              published_at: Date.now() / 1000,
              source: 'PlayHub'
            }
          ],
          recommendation: games.length > 0 ? games[0] : null,
          friendsActivity: []
        }
      }

      // --- Epic / GOG / Steam (Stubs) ---
      if (channel.startsWith('epic:') || channel.startsWith('gog:') || channel.startsWith('steam:')) {
         if (channel.includes('scan')) return { success: true, added: 0 }
         if (channel.includes('sync')) return { success: true }
         if (channel.includes('status')) return { connected: false }
         return { success: true }
      }

      // --- Library ---
      if (channel === 'library:get') {
        const stored = localStorage.getItem(MOCK_STORAGE_KEYS.GAMES)
        let games = stored ? JSON.parse(stored) : []
        
        // If empty, return empty (don't force mock games, let user add them or see empty state)
        // To help development, we can seed one if absolutely nothing exists
        if (games.length === 0 && !localStorage.getItem('mock:initialized')) {
           games = [
             { 
               id: 'mock_1', 
               title: 'Welcome to PlayHub', 
               box_art_url: getPlaceholderImage('PlayHub'),
               platform: 'playhub',
               playtime_seconds: 0,
               is_installed: true,
               is_favorite: false
             }
           ]
           localStorage.setItem(MOCK_STORAGE_KEYS.GAMES, JSON.stringify(games))
           localStorage.setItem('mock:initialized', 'true')
        }
        
        const filter = args[0]
        if (filter === 'favorites') return games.filter((g: any) => g.is_favorite)
        if (filter === 'installed') return games.filter((g: any) => g.is_installed)
        return games
      }

      if (channel === 'game:add-custom') {
        const { title } = args[0]
        const stored = localStorage.getItem(MOCK_STORAGE_KEYS.GAMES)
        const games = stored ? JSON.parse(stored) : []
        const newGame = {
          id: `custom_${Date.now()}`,
          title,
          box_art_url: getPlaceholderImage(title),
          platform: 'playhub',
          playtime_seconds: 0,
          is_installed: true,
          is_favorite: false
        }
        games.push(newGame)
        localStorage.setItem(MOCK_STORAGE_KEYS.GAMES, JSON.stringify(games))
        return { success: true, id: newGame.id }
      }

      // --- News ---
      if (channel === 'news:get') {
        return [
          { 
            id: '1', 
            title: 'PlayHub Update', 
            image: getPlaceholderImage('Update', 'news'), 
            summary: 'Welcome to the latest version of PlayHub. This is a simulated news item.' 
          }
        ]
      }

      // --- Social ---
      if (channel === 'friends:get') {
        // Return empty if not set, or a simulated friend
        return [
          {
            id: 'friend_1',
            platform: 'steam',
            username: 'Online Friend',
            status: 'online',
            game_activity: 'Playing Something'
          }
        ]
      }

      if (channel === 'social:get-messages') {
        return []
      }
      
      if (channel === 'social:send-message') {
        return { success: true }
      }

      // --- Presence ---
      if (channel === 'presence:get') {
         return {
          user_id: 'mock-user-1',
          presence_state: 'online',
          intent_state: 'idle',
          intent_metadata: {},
          visibility_scope: 'friends',
          expires_at: null,
          updated_at: new Date().toISOString(),
          source: 'auto'
        }
      }

      // --- Game Details ---
      if (channel === 'game:get-details') {
         const gameId = args[0]
         const stored = localStorage.getItem(MOCK_STORAGE_KEYS.GAMES)
         const games = stored ? JSON.parse(stored) : []
         const game = games.find((g: any) => g.id === gameId)
         
         return game || {
            id: gameId,
            title: 'Unknown Game',
            description: 'Game details not found in simulation.',
            metadata: {},
            playtime_seconds: 0
         }
      }
      
      // Default fallback
      return null
    },
    on: () => {},
    removeListener: () => {},
    send: (channel: string, ...args: any[]) => {
       console.log(`[Simulated Backend] send: ${channel}`, args)
    }
  },
  shell: {
    openExternal: async (url: string) => { 
        console.log('[Simulated Backend] Open External:', url)
        window.open(url, '_blank')
    }
  }
}
