import React, { useState, useEffect, useRef } from 'react'
import clsx from 'clsx'
import { electron } from '../utils/electron'
import { useTranslation } from 'react-i18next'

interface Friend {
  id: string
  platform: string
  external_id?: string
  username: string
  avatar_url?: string
  status: 'online' | 'offline' | 'in-game' | 'away' | 'busy'
  game_activity?: string
}

interface Message {
  id: string
  owner_id: string
  friend_id: string
  direction: 'incoming' | 'outgoing'
  body: string
  created_at: string
  is_quick: boolean
}

type PresenceState = 'offline' | 'online' | 'away' | 'do_not_disturb'

type IntentState =
  | 'open_for_coop'
  | 'looking_for_party'
  | 'story_mode'
  | 'competitive'
  | 'testing_mods'
  | 'idle'
  | 'custom'

interface IntentMetadata {
  current_game_id?: string | null
  estimated_session_length?: number | null
  voice_chat_allowed?: boolean | null
  joinable?: boolean | null
  instability_warning?: boolean | null
  custom_label?: string | null
}

interface PresenceStatus {
  user_id: string
  presence_state: PresenceState
  intent_state: IntentState
  intent_metadata: IntentMetadata
  visibility_scope: 'public' | 'friends' | 'favorites' | 'hidden'
  expires_at: string | null
  updated_at: string
  source: 'manual' | 'auto'
}

interface SocialPageProps {
  user: any
  friends: Friend[]
  selectedFriendId: string | null
  onSelectFriend: (id: string) => void
  messages: Message[]
  onSendMessage: (body: string) => void
  isLoadingMessages: boolean
  isSendingMessage: boolean
  onAddLocalFriend: (name: string) => Promise<void>
  onRefresh: () => void
}

export function SocialPage({
  user,
  friends,
  selectedFriendId,
  onSelectFriend,
  messages,
  onSendMessage,
  isLoadingMessages,
  isSendingMessage,
  onAddLocalFriend,
  onRefresh
}: SocialPageProps) {
  console.log('SocialPage rendering', { friendsCount: friends?.length, messagesCount: messages?.length });
  
  const [friendSearch, setFriendSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false)
  const [newFriendName, setNewFriendName] = useState('')
  const [presence, setPresence] = useState<PresenceStatus | null>(null)
  const [isPresenceLoading, setIsPresenceLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  const filteredFriends = (friends || []).filter(f => 
    f.username.toLowerCase().includes(friendSearch.toLowerCase())
  )

  const selectedFriend = (friends || []).find(f => f.id === selectedFriendId)

  useEffect(() => {
    let cancelled = false

    const loadPresence = async () => {
      if (!user?.id) return
      try {
        setIsPresenceLoading(true)
        const status = await electron.ipcRenderer.invoke('presence:get', { userId: user.id })
        if (!cancelled) {
          setPresence(status as PresenceStatus)
        }
      } catch {
        if (!cancelled) {
          setPresence(null)
        }
      } finally {
        if (!cancelled) {
          setIsPresenceLoading(false)
        }
      }
    }

    loadPresence()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const updatePresence = async (partial: Partial<PresenceStatus>) => {
    if (!user?.id) return
    try {
      const status = await electron.ipcRenderer.invoke('presence:set', {
        userId: user.id,
        presence_state: partial.presence_state,
        intent_state: partial.intent_state,
        intent_metadata: partial.intent_metadata,
        visibility_scope: partial.visibility_scope,
        expires_at: partial.expires_at,
        source: 'manual',
      })
      setPresence(status as PresenceStatus)
    } catch {
    }
  }

  const presenceDotClass =
    presence?.presence_state === 'online'
      ? 'bg-green-500'
      : presence?.presence_state === 'away'
      ? 'bg-yellow-500'
      : presence?.presence_state === 'do_not_disturb'
      ? 'bg-red-500'
      : 'bg-slate-500'

  const presenceLabel = () => {
    if (!presence) return ''
    if (presence.presence_state === 'online') return t('social.presence.presenceOnline')
    if (presence.presence_state === 'away') return t('social.presence.presenceAway')
    if (presence.presence_state === 'do_not_disturb') return t('social.presence.presenceDnd')
    if (presence.presence_state === 'offline') return t('social.presence.presenceOffline')
    return ''
  }

  const intentLabel = () => {
    if (!presence) return ''
    if (presence.intent_state === 'open_for_coop') return t('social.presence.intentOpenForCoop')
    if (presence.intent_state === 'looking_for_party') return t('social.presence.intentLookingForParty')
    if (presence.intent_state === 'story_mode') return t('social.presence.intentStoryMode')
    if (presence.intent_state === 'competitive') return t('social.presence.intentCompetitive')
    if (presence.intent_state === 'testing_mods') return t('social.presence.intentTestingMods')
    if (presence.intent_state === 'idle') return t('social.presence.intentIdle')
    if (presence.intent_state === 'custom') return t('social.presence.intentCustom')
    return ''
  }

  const intentSummary = () => {
    if (!presence) return ''
    if (presence.intent_state === 'story_mode') return t('social.presence.summaryStoryMode')
    if (presence.intent_state === 'open_for_coop') return t('social.presence.summaryOpenForCoop')
    if (presence.intent_state === 'looking_for_party') return t('social.presence.summaryLookingForParty')
    if (presence.intent_state === 'competitive') return t('social.presence.summaryCompetitive')
    if (presence.intent_state === 'testing_mods') return t('social.presence.summaryTestingMods')
    if (presence.intent_state === 'idle') return t('social.presence.summaryIdle')
    if (presence.intent_state === 'custom') {
      const text = presence.intent_metadata?.custom_label || ''
      return t('social.presence.summaryCustom', { text })
    }
    return ''
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim()) return
    onSendMessage(messageInput)
    setMessageInput('')
  }

  const handleAddFriendSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFriendName.trim()) return
    await onAddLocalFriend(newFriendName)
    setNewFriendName('')
    setIsAddFriendOpen(false)
  }

  const openSteamFriends = () => {
    if (electron.shell && electron.shell.openExternal) {
      electron.shell.openExternal('https://steamcommunity.com/my/friends/add')
    } else {
      window.open('https://steamcommunity.com/my/friends/add', '_blank')
    }
  }

  return (
    <div className="flex h-full bg-slate-950 text-slate-200 overflow-hidden">
      {/* Left Sidebar: Friends List */}
      <div className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/30">
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{t('social.friendsTitle')}</h2>
            <div className="flex gap-2">
                <button 
                    onClick={onRefresh}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title={t('social.syncFriendsTitle')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                </button>
                <button 
                    onClick={() => setIsAddFriendOpen(!isAddFriendOpen)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    title={t('social.addFriendTitle')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
                </button>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {t('social.presence.myStatusTitle')}
              </div>
              <div className="text-xs text-slate-500">
                {t('social.presence.myStatusSubtitle')}
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={presence?.presence_state || 'online'}
                onChange={e =>
                  updatePresence({
                    ...(presence || {
                      user_id: user?.id,
                      presence_state: 'online',
                      intent_state: 'idle',
                      intent_metadata: {},
                      visibility_scope: 'friends',
                      expires_at: null,
                      updated_at: new Date().toISOString(),
                      source: 'manual',
                    }),
                    presence_state: e.target.value as PresenceState,
                  })
                }
                disabled={isPresenceLoading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
              >
                <option value="online">{t('social.presence.presenceOnline')}</option>
                <option value="away">{t('social.presence.presenceAway')}</option>
                <option value="do_not_disturb">{t('social.presence.presenceDnd')}</option>
                <option value="offline">{t('social.presence.presenceOffline')}</option>
              </select>
              <select
                value={presence?.intent_state || 'idle'}
                onChange={e =>
                  updatePresence({
                    ...(presence || {
                      user_id: user?.id,
                      presence_state: 'online',
                      intent_state: 'idle',
                      intent_metadata: {},
                      visibility_scope: 'friends',
                      expires_at: null,
                      updated_at: new Date().toISOString(),
                      source: 'manual',
                    }),
                    intent_state: e.target.value as IntentState,
                  })
                }
                disabled={isPresenceLoading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
              >
                <option value="open_for_coop">{t('social.presence.intentOpenForCoop')}</option>
                <option value="looking_for_party">{t('social.presence.intentLookingForParty')}</option>
                <option value="story_mode">{t('social.presence.intentStoryMode')}</option>
                <option value="competitive">{t('social.presence.intentCompetitive')}</option>
                <option value="testing_mods">{t('social.presence.intentTestingMods')}</option>
                <option value="idle">{t('social.presence.intentIdle')}</option>
                <option value="custom">{t('social.presence.intentCustom')}</option>
              </select>
            </div>
            {presence?.intent_state === 'custom' && (
              <input
                type="text"
                value={presence.intent_metadata?.custom_label || ''}
                onChange={e =>
                  updatePresence({
                    ...(presence || {
                      user_id: user?.id,
                      presence_state: 'online',
                      intent_state: 'custom',
                      intent_metadata: {},
                      visibility_scope: 'friends',
                      expires_at: null,
                      updated_at: new Date().toISOString(),
                      source: 'manual',
                    }),
                    intent_metadata: {
                      ...(presence?.intent_metadata || {}),
                      custom_label: e.target.value,
                    },
                  })
                }
                disabled={isPresenceLoading}
                placeholder={t('social.presence.intentCustom')}
                className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
              />
            )}
            {intentSummary() && (
              <div className="text-[11px] text-slate-500 truncate">
                {intentSummary()}
              </div>
            )}
          </div>

          {isAddFriendOpen && (
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 animate-in fade-in slide-in-from-top-2">
                <form onSubmit={handleAddFriendSubmit} className="flex flex-col gap-2">
                    <input 
                        type="text" 
                        placeholder={t('social.localUsernamePlaceholder')} 
                        value={newFriendName}
                        onChange={(e) => setNewFriendName(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:border-primary-500"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-500 text-xs py-1 rounded text-white font-medium">
                          {t('social.addLocalButton')}
                        </button>
                        <button type="button" onClick={openSteamFriends} className="flex-1 bg-brand-steam hover:bg-brand-steam-hover text-xs py-1 rounded text-white font-medium flex items-center justify-center gap-1">
                            <span>{t('app.sidebar.steam')}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </button>
                    </div>
                </form>
            </div>
          )}

          <div className="relative">
            <input 
                type="text" 
                placeholder={t('social.searchFriendsPlaceholder')} 
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary-500 transition-colors"
            />
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-2.5 text-slate-500"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                    {friendSearch ? t('social.noFriendsFound') : t('social.noFriendsYet')}
                </div>
            ) : (
                filteredFriends.map(friend => (
                    <button
                        key={friend.id}
                        onClick={() => onSelectFriend(friend.id)}
                        className={clsx(
                            "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left group",
                            selectedFriendId === friend.id ? "bg-primary-600/10 border border-primary-500/30" : "hover:bg-slate-800 border border-transparent"
                        )}
                    >
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
                                {friend.avatar_url ? (
                                    <img src={friend.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                        {friend.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className={clsx(
                                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950",
                                friend.status === 'online' ? "bg-green-500" :
                                friend.status === 'in-game' ? "bg-green-400" :
                                friend.status === 'away' ? "bg-yellow-500" :
                                friend.status === 'busy' ? "bg-red-500" :
                                "bg-slate-500"
                            )} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className={clsx("text-sm font-medium truncate", selectedFriendId === friend.id ? "text-primary-400" : "text-slate-200")}>
                                {friend.username}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                                {friend.status === 'in-game' ? (
                                    <span className="text-green-400">{friend.game_activity || t('social.inGameFallback')}</span>
                                ) : (
                                    <span className="capitalize">{friend.status}</span>
                                )}
                            </div>
                        </div>
                        {friend.platform === 'steam' && (
                             <div className="text-slate-600 group-hover:text-slate-500">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.666 0 .52 4.908.016 11.127l3.868 1.597a3.57 3.57 0 0 1 .466-.178l1.41-2.028a3.784 3.784 0 0 1 6.22-2.583 3.783 3.783 0 0 1 2.373 6.645l4.636 6.72a6.38 6.38 0 0 0 4.996-6.175C23.985 6.68 18.605 0 11.979 0ZM7.606 13.064c-1.118 0-2.025.907-2.025 2.025 0 1.119.907 2.026 2.025 2.026 1.118 0 2.025-.907 2.025-2.026 0-1.118-.907-2.025-2.025-2.025Zm12.162 5.564-4.526-6.561a3.774 3.774 0 0 1-3.692 2.02 3.775 3.775 0 0 1-1.282-.224l-1.31 1.884a6.33 6.33 0 0 0 3.328.948c2.868 0 5.305-1.925 6.136-4.606l1.346-1.939ZM5.385 15.09l-3.95-1.63A6.416 6.416 0 0 0 10.96 23.99c.123.003.245.003.368 0a6.398 6.398 0 0 0 4.093-1.487l-1.442-2.09a3.565 3.565 0 0 1-1.397.283c-1.872 0-3.411-1.434-3.573-3.264l-3.624-2.342Z"/></svg>
                             </div>
                        )}
                    </button>
                ))
            )}
        </div>
      </div>

      {/* Right Area: Chat */}
      <div className="flex-1 flex flex-col bg-slate-950 relative">
        {selectedFriend ? (
            <>
                <div className="h-16 border-b border-slate-800 flex items-center px-6 justify-between bg-slate-900/20 backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                                {selectedFriend.avatar_url ? (
                                    <img src={selectedFriend.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                        {selectedFriend.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                             <div className={clsx(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900",
                                selectedFriend.status === 'online' ? "bg-green-500" :
                                selectedFriend.status === 'in-game' ? "bg-green-400" :
                                selectedFriend.status === 'away' ? "bg-yellow-500" :
                                selectedFriend.status === 'busy' ? "bg-red-500" :
                                "bg-slate-500"
                            )} />
                        </div>
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                {selectedFriend.username}
                                {selectedFriend.platform === 'steam' && (
                                    <span className="text-[10px] bg-[#171a21] text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">Steam</span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400">
                                {selectedFriend.status === 'in-game' ? (
                                    <span className="text-green-400 font-medium">{selectedFriend.game_activity}</span>
                                ) : (
                                    <span className="capitalize">{selectedFriend.status}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {isLoadingMessages && (!messages || messages.length === 0) ? (
                        <div className="flex items-center justify-center h-full text-slate-500 gap-2">
                             <span className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></span>
                             <span>{t('social.loadingChat')}</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center my-4">
                                <div className="text-xs text-slate-600 bg-slate-900/50 px-3 py-1 rounded-full">
                                    {t('social.startOfConversation')}
                                </div>
                            </div>
                            {(messages || []).map(msg => (
                                <div 
                                    key={msg.id} 
                                    className={clsx(
                                        "flex w-full",
                                        msg.direction === 'outgoing' ? "justify-end" : "justify-start"
                                    )}
                                >
                                    <div 
                                        className={clsx(
                                            "max-w-[70%] px-4 py-2 rounded-2xl text-sm leading-relaxed relative group",
                                            msg.direction === 'outgoing' 
                                                ? "bg-primary-600 text-white rounded-br-none" 
                                                : "bg-slate-800 text-slate-200 rounded-bl-none"
                                        )}
                                    >
                                        {msg.body}
                                        <div className={clsx(
                                            "text-[10px] mt-1 opacity-50",
                                            msg.direction === 'outgoing' ? "text-primary-200 text-right" : "text-slate-400"
                                        )}>
                                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <div className="p-4 bg-slate-900/30 border-t border-slate-800">
                    <form onSubmit={handleSend} className="relative flex items-center gap-3">
                        <button 
                            type="button" 
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                            title={t('social.addEmojiTitle')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                        </button>
                        <input 
                            type="text" 
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder={t('social.messagePlaceholder', { name: selectedFriend.username })}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all placeholder:text-slate-600"
                            disabled={isSendingMessage}
                        />
                        <button 
                            type="submit" 
                            disabled={!messageInput.trim() || isSendingMessage}
                            className={clsx(
                                "p-2.5 rounded-full transition-all flex-shrink-0",
                                messageInput.trim() && !isSendingMessage
                                    ? "bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-900/20" 
                                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                            )}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </button>
                    </form>
                    <div className="text-center mt-2 flex flex-col items-center gap-2">
                        {selectedFriend.platform === 'steam' && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (electron.shell && electron.shell.openExternal) {
                                        electron.shell.openExternal(`steam://friends/message/${selectedFriend.external_id}`)
                                    }
                                }}
                                className="text-xs bg-[#171a21] hover:bg-[#2a475e] text-primary-300 px-3 py-1.5 rounded-full flex items-center gap-2 border border-primary-900/30 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                                {t('social.openSteamChat')}
                            </button>
                        )}
                        <span className="text-[10px] text-slate-600">
                            {selectedFriend.platform === 'steam' 
                                ? t('social.steamMessageNote') 
                                : t('social.localMessageNote')}
                        </span>
                    </div>
                </div>
            </>
            ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">{t('social.selectFriendTitle')}</h3>
                <p className="max-w-xs text-sm">{t('social.selectFriendDescription')}</p>
            </div>
        )}
      </div>
    </div>
  )
}
