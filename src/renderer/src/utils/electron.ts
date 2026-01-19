// Safe electron IPC wrapper for browser development
export const electron = (window as any).electron || {
  ipcRenderer: {
    invoke: async (channel: string, ...args: any[]) => {
      console.warn(`[Mock IPC] invoked: ${channel}`, args)
      
      if (channel === 'auth:login' || channel === 'auth:register') {
        const payload = args[0] || {}
        const email = payload.email || 'mock@example.com'
        const username =
          payload.username || (typeof email === 'string' && email.includes('@') ? email.split('@')[0] : 'MockUser')
        return {
          user: {
            id: 'mock-user-1',
            email,
            username,
            avatar_url: null
          },
          token: 'mock-session-token'
        }
      }
      if (channel === 'auth:check') return null
      if (channel === 'epic:get-status') {
        return { connected: false }
      }
      if (channel === 'epic:auth') {
        return {
          success: true,
          epicId: 'mock-epic',
          displayName: 'Mock Epic User'
        }
      }
      if (channel === 'epic:sync') {
        return { success: true, totalSynced: 1 }
      }
      if (channel === 'epic:disconnect') {
        return { success: true }
      }
      if (channel === 'library:get') {
        if (args[0] === 'favorites') return []
        if (args[0] === 'installed') return []
        return [
            { id: '1', title: 'Mock Game 1', box_art_url: 'https://placehold.co/600x900' },
            { id: '2', title: 'Mock Game 2', box_art_url: 'https://placehold.co/600x900' }
        ]
      }
      if (channel === 'news:get') return [
        { id: '1', title: 'Welcome to PlayHub', image: 'https://placehold.co/800x400', summary: 'This is a mock news item.' }
      ]
      if (channel === 'friends:get') {
        return [
          {
            id: 'friend_1',
            platform: 'steam',
            external_id: null,
            username: 'MockFriend',
            avatar_url: null,
            status: 'online',
            game_activity: 'Playing Mock Game'
          }
        ]
      }
      if (channel === 'social:get-messages') {
        const { ownerId, friendId } = args[0] || {}
        const now = new Date().toISOString()
        return [
          {
            id: 'msg_1',
            owner_id: ownerId || 'mock_owner',
            friend_id: friendId || 'friend_1',
            platform: 'steam',
            direction: 'incoming',
            body: 'Hey, ready to play?',
            is_quick: false,
            created_at: now,
            read_at: now
          },
          {
            id: 'msg_2',
            owner_id: ownerId || 'mock_owner',
            friend_id: friendId || 'friend_1',
            platform: 'steam',
            direction: 'outgoing',
            body: 'Give me 5 minutes!',
            is_quick: false,
            created_at: now,
            read_at: now
          }
        ]
      }
      if (channel === 'social:send-message') {
        const { ownerId, friendId, platform, body, isQuick } = args[0] || {}
        const now = new Date().toISOString()
        return {
          id: 'msg_out_' + Math.random().toString(36).slice(2),
          owner_id: ownerId || 'mock_owner',
          friend_id: friendId || 'friend_1',
          platform: platform || 'steam',
          direction: 'outgoing',
          body: body || '',
          is_quick: !!isQuick,
          created_at: now,
          read_at: now
        }
      }
      if (channel === 'presence:get') {
        const { userId } = args[0] || {}
        const now = new Date().toISOString()
        return {
          user_id: userId || 'mock-user-1',
          presence_state: 'online',
          intent_state: 'idle',
          intent_metadata: {},
          visibility_scope: 'friends',
          expires_at: null,
          updated_at: now,
          source: 'auto'
        }
      }
      if (channel === 'presence:set') {
        const { userId, presence_state, intent_state, intent_metadata, visibility_scope, expires_at, source } =
          args[0] || {}
        const now = new Date().toISOString()
        return {
          user_id: userId || 'mock-user-1',
          presence_state: presence_state || 'online',
          intent_state: intent_state || 'idle',
          intent_metadata: intent_metadata || {},
          visibility_scope: visibility_scope || 'friends',
          expires_at: expires_at || null,
          updated_at: now,
          source: source || 'manual'
        }
      }
      if (channel === 'game:get-details') return {
        id: args[0],
        title: 'Mock Game Details',
        description: 'This is a mock description for the game.',
        metadata: {
          developer: 'Mock Dev',
          publisher: 'Mock Pub',
          release_date: '2023-01-01',
          genres: ['Action', 'RPG']
        },
        playtime_seconds: 3600,
        last_played: new Date().toISOString(),
        user_rating: 4.5
      }
      if (channel === 'game:launch') { console.log('Mock Launch'); return { success: true } }
      if (channel === 'game:verify') { console.log('Mock Verify'); return true }
      if (channel === 'playtime:get-history') return []
      if (channel === 'playtime:get-current-session') return null
      if (channel === 'playtime:sync') { console.log('Mock Playtime Sync'); return { success: true } }
      
      return null
    },
    on: () => {},
    removeListener: () => {},
    send: () => {}
  },
  shell: {
    openExternal: async (url: string) => { console.log('Mock Open External:', url) }
  }
}
