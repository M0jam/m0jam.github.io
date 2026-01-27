import { useEffect, useState, useRef } from 'react'
import clsx from 'clsx'
import { X, Play, Clock, Star, Download, Tag as TagIcon, Plus, StickyNote, Image as ImageIcon, Video } from 'lucide-react'
import { electron } from '../utils/electron'
import { useTranslation } from 'react-i18next'
import { MediaViewer } from './MediaViewer'

interface GameDetailsModalProps {
  gameId: string | null
  initialGameData?: any
  isOpen: boolean
  onClose: () => void
}

export function GameDetailsModal({ gameId, initialGameData, isOpen, onClose }: GameDetailsModalProps) {
  const [game, setGame] = useState<any>(initialGameData || null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'notes'>('overview')
  const [launching, setLaunching] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<any[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [currentSession, setCurrentSession] = useState<any | null>(null)
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0)
  
  // Notes state
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const notesTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Tags state
  const [allTags, setAllTags] = useState<any[]>([])
  const [gameTags, setGameTags] = useState<any[]>([])
  const [isManagingTags, setIsManagingTags] = useState(false)
  const [newTagInput, setNewTagInput] = useState('')

  // Media Viewer state
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false)
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0)

  const { t } = useTranslation()

  const officialRating = typeof game?.rating === 'number' ? game.rating : null
  const officialRatingClamped = officialRating != null ? Math.max(0, Math.min(officialRating, 100)) : null
  const officialRatingOutOfFive = officialRatingClamped != null ? Math.round((officialRatingClamped / 100) * 5) : null
  const releaseYear = (() => {
    const dateString = game?.metadata?.release_date || game?.release_date
    if (!dateString) return null
    const parsed = new Date(dateString)
    const year = parsed.getFullYear()
    return Number.isNaN(year) ? null : year
  })()

  useEffect(() => {
    if (isOpen && gameId) {
      let hasData = !!game
      if (initialGameData && initialGameData.id === gameId) {
        setGame(initialGameData)
        hasData = true
      } else if (game && game.id !== gameId) {
        setGame(null)
        hasData = false
      }

      loadGameDetails(gameId, hasData)
      loadHistory(gameId)
      loadCurrentSession(gameId)
      loadTags(gameId)
      loadNotes(gameId)
    } else {
      setGame(null)
      setMediaViewerOpen(false)
      setSessionHistory([])
      setCurrentSession(null)
      setCurrentSessionSeconds(0)
      setGameTags([])
      setIsManagingTags(false)
      setNewTagInput('')
      setNotes('')
    }
  }, [isOpen, gameId, initialGameData])

  const loadNotes = async (id: string) => {
    try {
      const content = await electron.ipcRenderer.invoke('notes:get', id)
      setNotes(content)
    } catch (error) {
      console.error('Failed to load notes:', error)
    }
  }

  const handleNotesChange = (content: string) => {
    setNotes(content)
    setSavingNotes(true)
    
    if (notesTimeoutRef.current) {
      clearTimeout(notesTimeoutRef.current)
    }

    notesTimeoutRef.current = setTimeout(async () => {
      if (gameId) {
        try {
          await electron.ipcRenderer.invoke('notes:save', { gameId, content })
        } catch (error) {
          console.error('Failed to save notes:', error)
        } finally {
          setSavingNotes(false)
        }
      }
    }, 1000)
  }

  const loadTags = async (id: string) => {
    try {
      const [all, assigned] = await Promise.all([
        electron.ipcRenderer.invoke('tags:get-all'),
        electron.ipcRenderer.invoke('tags:get-for-game', id)
      ])
      setAllTags(all)
      setGameTags(assigned)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const handleAddTag = async (tagName: string) => {
    if (!game || !tagName.trim()) return
    
    try {
      // Check if tag exists
      let tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase())
      
      if (!tag) {
        // Create new tag
        tag = await electron.ipcRenderer.invoke('tags:create', tagName)
        if (tag) {
          setAllTags(prev => [...prev, tag!].sort((a, b) => a.name.localeCompare(b.name)))
        }
      }

      if (tag) {
        // Add to game
        await electron.ipcRenderer.invoke('tags:add-to-game', { gameId: game.id, tagId: tag.id })
        await loadTags(game.id)
        setNewTagInput('')
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  }

  const handleRemoveTag = async (tagId: number) => {
    if (!game) return
    try {
      await electron.ipcRenderer.invoke('tags:remove-from-game', { gameId: game.id, tagId: tagId })
      await loadTags(game.id)
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  }


  const loadGameDetails = async (id: string, hasData: boolean = false) => {
    if (!hasData) setLoading(true)
    else setRefreshing(true)

    try {
      const details = await electron.ipcRenderer.invoke('game:get-details', id)
      setGame(details)
    } catch (error) {
      console.error('Failed to load game details:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadHistory = async (id: string) => {
    try {
      const history = await electron.ipcRenderer.invoke('playtime:get-history', id)
      setSessionHistory(history)
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const loadCurrentSession = async (id: string) => {
    try {
      const session = await electron.ipcRenderer.invoke('playtime:get-current-session', id)
      if (session) {
        setCurrentSession(session)
        const start = new Date(session.start_time).getTime()
        setCurrentSessionSeconds(Math.floor((Date.now() - start) / 1000))
      } else {
        setCurrentSession(null)
        setCurrentSessionSeconds(0)
      }
    } catch (err) {
      console.error('Failed to load current session:', err)
    }
  }

  const handleSync = async () => {
    if (!game) return
    setIsSyncing(true)
    await electron.ipcRenderer.invoke('playtime:sync')
    await loadGameDetails(game.id)
    await loadHistory(game.id)
    await loadCurrentSession(game.id)
    setIsSyncing(false)
  }

  useEffect(() => {
    if (!currentSession) return
    const start = new Date(currentSession.start_time).getTime()
    const interval = setInterval(() => {
      setCurrentSessionSeconds(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [currentSession])

  const formatDuration = (seconds: number) => {
    const total = Math.max(0, seconds || 0)
    const hours = Math.floor(total / 3600)
    const minutes = Math.floor((total % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  const handleLaunch = async () => {
    setLaunching(true)
    try {
      await electron.ipcRenderer.invoke('game:launch', game.id)
      // Maybe close modal or minimize?
    } catch (error) {
      console.error('Launch failed:', error)
    } finally {
      setLaunching(false)
    }
  }

  const handleInstall = async () => {
    try {
        await electron.ipcRenderer.invoke('game:install', game.id)
        onClose()
    } catch (error) {
        console.error('Install failed:', error)
    }
  }

  const handleRating = async (rating: number) => {
    if (!game) return
    setGame({ ...game, user_rating: rating })
    await electron.ipcRenderer.invoke('game:set-rating', { gameId: game.id, rating })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-slate-900 w-full max-w-6xl h-[85vh] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            type="button"
            aria-label={t('gameDetails.actions.close')}
            className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center rounded-full border border-slate-700/80 bg-slate-950/80 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-900 active:bg-slate-950 transition-colors shadow-lg shadow-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
            <X className="w-4 h-4" />
        </button>

        {loading || !game ? (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        ) : (
            <>
                {/* Hero Section */}
                <div className="relative h-80 shrink-0">
                    <div className="absolute inset-0">
                        {game.background_url ? (
                            <img src={game.background_url} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-slate-800" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 p-8 w-full flex items-end gap-6">
                        <div className="w-48 aspect-[2/3] rounded-lg shadow-2xl border border-slate-700 overflow-hidden bg-slate-800 shrink-0 transform translate-y-12 relative">
                            {game.box_art_url && <img src={game.box_art_url} className="w-full h-full object-cover" />}
                            <div className="absolute inset-0 pointer-events-none">
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-medium text-slate-100">
                                {releaseYear ?? '–'}
                              </div>
                              <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-[10px] font-medium text-slate-100 flex items-center gap-1">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <Star
                                      key={star}
                                      className={clsx(
                                        'w-3 h-3',
                                        (officialRatingOutOfFive || 0) >= star
                                          ? 'text-yellow-400 fill-yellow-400'
                                          : 'text-slate-600'
                                      )}
                                    />
                                  ))}
                                </div>
                                <span>{officialRatingClamped != null ? Math.round(officialRatingClamped) : '–'}</span>
                              </div>
                            </div>
                        </div>
                        <div className="flex-1 mb-4">
                            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-md flex items-center gap-3">
                                {game.title}
                                {refreshing && (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                )}
                            </h1>
                            <div className="flex items-center gap-4 text-sm text-slate-300">
                                {game.metadata?.developer && <span>{game.metadata.developer}</span>}
                                {game.metadata?.release_date && (
                                    <>
                                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                                        <span>{game.metadata.release_date}</span>
                                    </>
                                )}
                            </div>
                            <nav className="flex space-x-6 mt-8 border-b border-slate-700/50">
                                <button 
                                    onClick={() => setActiveTab('overview')}
                                    className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {t('gameDetails.tabs.overview')}
                                    {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-t-full"></div>}
                                </button>
                                <button 
                                    onClick={() => setActiveTab('stats')}
                                    className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'stats' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    {t('gameDetails.tabs.stats')}
                                    {activeTab === 'stats' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-t-full"></div>}
                                </button>
                                <button 
                                    onClick={() => setActiveTab('notes')}
                                    className={`pb-4 text-sm font-medium transition-colors relative ${activeTab === 'notes' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <StickyNote className="w-4 h-4" />
                                        {t('gameDetails.tabs.notes')}
                                    </div>
                                    {activeTab === 'notes' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-500 rounded-t-full"></div>}
                                </button>
                            </nav>
                        </div>
                        <div className="mb-4 flex gap-3">
                            {game.is_installed ? (
                                <button 
                                    onClick={handleLaunch}
                                    disabled={launching}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    {launching ? t('gameDetails.actions.launching') : t('gameDetails.actions.playNow')}
                                </button>
                            ) : (
                                <button 
                                    onClick={handleInstall}
                        className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-lg font-bold flex items-center gap-3 transition-all transform hover:scale-105 active:scale-95 shadow-lg shadow-primary-500/20"
                    >
                        <Download className="w-5 h-5" />
                        {t('gameDetails.actions.install')}
                                </button>
                            )}
                            
                            <div className="relative group">
                                <button className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-300 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                                </button>
                                {/* Context Menu */}
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all transform origin-bottom-right">
                                    <button onClick={() => electron.ipcRenderer.invoke('game:browse-files', game.id)} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm">Browse Files</button>
                                    <button onClick={() => electron.ipcRenderer.invoke('game:verify', game.id)} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm">Verify Integrity</button>
                                    <div className="h-px bg-slate-700 my-1"></div>
                                    <button onClick={() => electron.ipcRenderer.invoke('game:uninstall', game.id)} className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm text-red-400">Uninstall</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-5xl mx-auto pl-[15rem] pr-8 py-8 pt-16 grid grid-cols-3 gap-8 h-full">
                        {activeTab === 'overview' && (
                          <>
                            <div className="col-span-2 space-y-8">
                                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-800">
                                <div>
                                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('gameDetails.overview.playtime')}</div>
                                  <div className="text-xl font-medium text-white">
                                    {formatDuration(game.playtime_seconds)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('gameDetails.overview.lastPlayed')}</div>
                                  <div className="text-xl font-medium text-white">
                                    {game.last_played ? new Date(game.last_played).toLocaleDateString() : t('gameDetails.overview.never')}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('gameDetails.overview.myRating')}</div>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map(star => (
                                      <button 
                                        key={star}
                                        onClick={() => handleRating(star)}
                                        className={clsx("transition-colors", (game.user_rating || 0) >= star ? "text-yellow-400" : "text-slate-600 hover:text-yellow-400/50")}
                                      >
                                        ★
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="prose prose-invert max-w-none">
                                <h3 className="text-xl font-bold mb-4">{t('gameDetails.overview.about')}</h3>
                                {game.summary || game.metadata?.description ? (
                                  <div dangerouslySetInnerHTML={{ __html: game.summary || game.metadata?.description }} />
                                ) : (
                                  <p className="text-slate-400 italic">{t('gameDetails.overview.noDescription')}</p>
                                )}
                              </div>

                              {/* Media / Screenshots Section */}
                              {game.metadata?.screenshots && game.metadata.screenshots.length > 0 && (
                                <div className="mt-8">
                                  <h3 className="text-xl font-bold mb-4">{t('gameDetails.overview.media')}</h3>
                                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                                    {game.metadata.screenshots.map((url: string, index: number) => (
                                      <div key={index} className="flex-none w-64 aspect-video rounded-lg overflow-hidden border border-slate-700 snap-center shadow-lg group relative cursor-pointer" onClick={() => { setMediaViewerIndex(index); setMediaViewerOpen(true); }}>
                                          <img src={url} loading="lazy" alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                          </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* HowLongToBeat Section */}
                              {(game.hltb_main || game.hltb_extra || game.hltb_completionist) && (
                                <div className="mt-8">
                                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-emerald-500" />
                                    HowLongToBeat
                                  </h3>
                                  <div className="grid grid-cols-3 gap-4">
                                    {game.hltb_main && (
                                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Main Story</div>
                                        <div className="text-lg font-medium text-white">{game.hltb_main}h</div>
                                      </div>
                                    )}
                                    {game.hltb_extra && (
                                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Main + Extra</div>
                                        <div className="text-lg font-medium text-white">{game.hltb_extra}h</div>
                                      </div>
                                    )}
                                    {game.hltb_completionist && (
                                      <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 text-center">
                                        <div className="text-xs text-slate-400 uppercase font-bold mb-1">Completionist</div>
                                        <div className="text-lg font-medium text-white">{game.hltb_completionist}h</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {game.metadata?.requirements && (game.metadata.requirements.minimum || game.metadata.requirements.recommended) && (
                                <div className="mt-8">
                                  <h3 className="text-xl font-bold mb-4">{t('gameDetails.overview.requirements')}</h3>
                                  <div className="grid grid-cols-2 gap-8 text-sm text-slate-300">
                                    {game.metadata.requirements.minimum && (
                                      <div>
                                        <strong className="block text-slate-500 mb-2">{t('gameDetails.overview.minimum')}</strong>
                                        <div dangerouslySetInnerHTML={{ __html: game.metadata.requirements.minimum }} />
                                      </div>
                                    )}
                                    {game.metadata.requirements.recommended && (
                                      <div>
                                        <strong className="block text-slate-500 mb-2">{t('gameDetails.overview.recommended')}</strong>
                                        <div dangerouslySetInnerHTML={{ __html: game.metadata.requirements.recommended }} />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="space-y-6">
                              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
                                <h4 className="font-bold text-slate-400 mb-4 text-sm uppercase">{t('gameDetails.overview.gameInfo')}</h4>
                                <dl className="space-y-3 text-sm">
                                  {game.rating > 0 && (
                                      <div>
                                          <dt className="text-slate-500">Rating</dt>
                                          <dd className="text-slate-200 flex items-center gap-1">
                                              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                              {Math.round(game.rating)} / 100
                                          </dd>
                                      </div>
                                  )}
                                  {game.genres && (
                                      <div>
                                          <dt className="text-slate-500">Genres</dt>
                                          <dd className="text-slate-200">
                                              {(() => {
                                                  try {
                                                      const genres = JSON.parse(game.genres)
                                                      return Array.isArray(genres) ? genres.join(', ') : genres
                                                  } catch (e) {
                                                      return game.genres
                                                  }
                                              })()}
                                          </dd>
                                      </div>
                                  )}
                                  <div>
                                    <dt className="text-slate-500">{t('gameDetails.overview.developer')}</dt>
                                    <dd className="text-slate-200">{game.metadata?.developer || t('gameDetails.overview.unknown')}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">{t('gameDetails.overview.publisher')}</dt>
                                    <dd className="text-slate-200">{game.metadata?.publisher || t('gameDetails.overview.unknown')}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">{t('gameDetails.overview.releaseDate')}</dt>
                                    <dd className="text-slate-200">{game.metadata?.release_date || t('gameDetails.overview.unknown')}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-slate-500">{t('gameDetails.overview.platformLabel')}</dt>
                                    <dd className="text-slate-200 capitalize">
                                      {game.id.startsWith('steam_') ? t('gameDetails.overview.platformSteam') : 
                                       game.id.startsWith('gog_') ? t('gameDetails.overview.platformGog') : 
                                       t('gameDetails.overview.platformPc')}
                                    </dd>
                                  </div>
                                </dl>
                                {(game.id.startsWith('steam_') || game.id.startsWith('gog_')) && (
                                  <div className="mt-4 space-y-2">
                                    <button 
                                      onClick={() => electron.ipcRenderer.invoke('game:open-store', game.id)}
                                      className="block w-full text-center px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm transition-colors text-white font-medium shadow-lg shadow-primary-500/20"
                                    >
                                      {t('gameDetails.overview.storePage')}
                                    </button>
                                    {game.id.startsWith('steam_') && (
                                    <a 
                                      href={`https://steamcommunity.com/app/${game.platform_game_id}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block w-full text-center px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        const url = `https://steamcommunity.com/app/${game.platform_game_id}`
                                        if (electron.shell && typeof electron.shell.openExternal === 'function') {
                                          electron.shell.openExternal(url)
                                        } else {
                                          window.open(url, '_blank')
                                        }
                                      }}
                                    >
                                      {t('gameDetails.overview.communityHub')}
                                    </a>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Tags Section */}
                              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
                                <h4 className="font-bold text-slate-400 mb-4 text-sm uppercase flex items-center gap-2">
                                  <TagIcon className="w-4 h-4" />
                                  Tags
                                </h4>
                                
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {gameTags.map(tag => (
                                    <div key={tag.id} className="flex items-center gap-1 bg-slate-700/50 text-slate-200 px-2 py-1 rounded text-sm group border border-slate-700">
                                      <span>{tag.name}</span>
                                      <button 
                                        onClick={() => handleRemoveTag(tag.id)}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  {gameTags.length === 0 && !isManagingTags && (
                                    <span className="text-slate-500 text-sm italic">No tags</span>
                                  )}
                                </div>

                                {isManagingTags ? (
                                  <div className="space-y-2">
                                    <div className="relative">
                                      <input
                                        type="text"
                                        value={newTagInput}
                                        onChange={(e) => setNewTagInput(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleAddTag(newTagInput)
                                          if (e.key === 'Escape') setIsManagingTags(false)
                                        }}
                                        placeholder="Add tag..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                        autoFocus
                                      />
                                      {newTagInput && (
                                           <div className="absolute z-10 w-full bg-slate-800 border border-slate-700 rounded-b mt-1 shadow-xl max-h-40 overflow-y-auto">
                                             {allTags
                                               .filter(t => t.name.toLowerCase().includes(newTagInput.toLowerCase()) && !gameTags.some(gt => gt.id === t.id))
                                               .map(tag => (
                                                 <button
                                                   key={tag.id}
                                                   onClick={() => handleAddTag(tag.name)}
                                                   className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700"
                                                 >
                                                   {tag.name}
                                                 </button>
                                               ))
                                             }
                                             {!allTags.some(t => t.name.toLowerCase() === newTagInput.toLowerCase()) && (
                                                <button
                                                  onClick={() => handleAddTag(newTagInput)}
                                                  className="w-full text-left px-3 py-2 text-sm text-emerald-400 hover:bg-slate-700 border-t border-slate-700"
                                                >
                                                  Create &quot;{newTagInput}&quot;
                                                </button>
                                             )}
                                           </div>
                                      )}
                                    </div>
                                    <button 
                                      onClick={() => setIsManagingTags(false)}
                                      className="text-xs text-slate-500 hover:text-slate-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => setIsManagingTags(true)}
                                    className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                    Add Tag
                                  </button>
                                )}
                              </div>

                              {/* Media Section (Screenshots & Videos) */}
                              {(game.metadata?.screenshots?.length > 0 || game.metadata?.movies?.length > 0) && (
                                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
                                  <h4 className="font-bold text-slate-400 mb-4 text-sm uppercase flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" />
                                    {t('gameDetails.overview.media')}
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    {/* Videos */}
                                    {game.metadata.movies?.slice(0, 2).map((movie: string, i: number) => (
                                       <div key={`vid-${i}`} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black">
                                          <video 
                                              src={movie} 
                                              controls 
                                              className="w-full h-full object-contain"
                                              poster={game.metadata.screenshots?.[i]}
                                          />
                                          <div className="absolute top-2 right-2 bg-black/60 p-1 rounded text-white pointer-events-none">
                                              <Video className="w-3 h-3" />
                                          </div>
                                       </div>
                                    ))}
                                    
                                    {/* Screenshots (fill remaining slots up to 4 total) */}
                                    {game.metadata.screenshots?.slice(0, 4 - (game.metadata.movies?.slice(0,2).length || 0)).map((shot: string, i: number) => (
                                      <div key={`img-${i}`} className="relative group aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer" onClick={() => { setMediaViewerIndex(i); setMediaViewerOpen(true); }}>
                                          <img 
                                            src={shot} 
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                            loading="lazy"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                              <Plus className="w-6 h-6 text-white drop-shadow-md" />
                                          </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}

                        {activeTab === 'stats' && (
                          <div className="col-span-3 space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('gameDetails.stats.totalPlaytime')}</div>
                                  <div className="text-2xl font-bold text-white">
                                    {formatDuration(game.playtime_seconds)}
                                  </div>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                                  <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('gameDetails.stats.currentSession')}</div>
                                  <div className="text-lg font-medium text-white">
                                    {currentSession ? formatDuration(currentSessionSeconds) : t('gameDetails.stats.notPlaying')}
                                  </div>
                                </div>
                                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex items-center justify-between">
                                  <div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">{t('gameDetails.stats.syncStatus')}</div>
                                    <div className="text-sm font-medium text-slate-300">
                                      {isSyncing ? t('gameDetails.stats.syncing') : t('gameDetails.stats.upToDate')}
                                    </div>
                                  </div>
                                  <button 
                                    onClick={handleSync}
                                    disabled={isSyncing}
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white transition-colors disabled:opacity-50"
                                  >
                                    {t('gameDetails.actions.syncNow')}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                  <span>{t('gameDetails.stats.recentSessions')}</span>
                                </h3>
                                <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
                                  {sessionHistory.length > 0 ? (
                                    <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-800/80 text-slate-400">
                                        <tr>
                                          <th className="px-4 py-3 font-medium">{t('gameDetails.stats.table.date')}</th>
                                          <th className="px-4 py-3 font-medium">{t('gameDetails.stats.table.start')}</th>
                                          <th className="px-4 py-3 font-medium">{t('gameDetails.stats.table.duration')}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-700/50">
                                        {sessionHistory.map((session) => (
                                          <tr key={session.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-4 py-3 text-slate-300">
                                              {new Date(session.start_time).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400">
                                              {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-emerald-400 font-medium">
                                              {session.duration_seconds ? formatDuration(session.duration_seconds) : t('gameDetails.stats.table.inProgress')}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  ) : (
                                    <div className="p-8 text-center text-slate-500">
                                      {t('gameDetails.stats.noHistory')}
                                    </div>
                                  )}
                                </div>
                              </div>
                          </div>
                        )}

                        {activeTab === 'notes' && (
                            <div className="col-span-3 h-full flex flex-col min-h-[500px]">
                                <div className="bg-slate-800/30 p-6 rounded-xl border border-slate-700/50 flex-1 flex flex-col h-full">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <StickyNote className="w-5 h-5 text-primary-500" />
                                            {t('gameDetails.tabs.notes')}
                                        </h3>
                                        {savingNotes && (
                                            <span className="text-xs text-emerald-400 animate-pulse font-medium">Saving...</span>
                                        )}
                                    </div>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => handleNotesChange(e.target.value)}
                                        placeholder="Write your notes here... (Markdown supported)"
                                        className="flex-1 w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 text-slate-200 resize-none focus:outline-none focus:border-primary-500 transition-colors custom-scrollbar font-mono text-sm leading-relaxed"
                                        spellCheck={false}
                                    />
                                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                                        <span>Notes are saved locally.</span>
                                        <span>{notes.length} characters</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>
        )}
      </div>
      <MediaViewer 
        isOpen={mediaViewerOpen} 
        onClose={() => setMediaViewerOpen(false)} 
        items={game?.metadata?.screenshots || []} 
        initialIndex={mediaViewerIndex}
      />
    </div>
  )
}
