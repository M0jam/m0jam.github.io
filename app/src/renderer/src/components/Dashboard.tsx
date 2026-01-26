import React, { useEffect, useState, useMemo } from 'react'
import { electron } from '../utils/electron'
import { useTranslation } from 'react-i18next'
import { OnboardingHints } from './OnboardingHints'
import { 
  Gamepad2, 
  Clock, 
  Tv,
  Trophy, 
  Activity, 
  Play, 
  LayoutGrid, 
  Users, 
  Newspaper,
  ChevronRight,
  Zap,
  CheckCircle2,
  AlertCircle,
  Settings,
  X
} from 'lucide-react'
import clsx from 'clsx'

interface DashboardProps {
  user: any
  onNavigate: (tab: string, filter?: string) => void
  onPlayGame: (gameId: string) => void
  onSelectGame: (gameId: string) => void
  viewMode?: 'grid' | 'couch'
  onToggleViewMode?: () => void
  timeFilter?: 'all' | 'short' | 'medium' | 'long' | 'hltb'
  onTimeFilterChange?: (filter: 'all' | 'short' | 'medium' | 'long' | 'hltb') => void
  showOnboardingHints?: boolean
  onDismissOnboardingHints?: () => void
  onboardingStats?: { total: number; totalPlaytimeHours: number }
  hasTags?: boolean
}

interface DashboardData {
  stats: {
    totalGames: number
    installedGames: number
    totalPlaytime: number // seconds
    completedGames: number
  }
  recentGames: any[]
  friendsActivity: any[]
  news: any[]
  recommendation: any | null
}

interface WidgetConfig {
  showStats: boolean
  showRecent: boolean
  showNews: boolean
  showRecommendation: boolean
  showFriends: boolean
  showQuickAccess: boolean
  showSystemStatus: boolean
}

const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  showStats: true,
  showRecent: true,
  showNews: true,
  showRecommendation: true,
  showFriends: true,
  showQuickAccess: true,
  showSystemStatus: true
}

export function Dashboard({ 
  user, 
  onNavigate, 
  onPlayGame, 
  onSelectGame,
  viewMode = 'grid',
  onToggleViewMode,
  timeFilter = 'all',
  onTimeFilterChange,
  showOnboardingHints,
  onDismissOnboardingHints,
  onboardingStats,
  hasTags
}: DashboardProps) {
  const { t } = useTranslation()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showTimeFilter, setShowTimeFilter] = useState(false)
  const [config, setConfig] = useState<WidgetConfig>(() => {
    try {
      const stored = localStorage.getItem('playhub:dashboardWidgets')
      return stored ? { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(stored) } : DEFAULT_WIDGET_CONFIG
    } catch {
      return DEFAULT_WIDGET_CONFIG
    }
  })
  const [showConfig, setShowConfig] = useState(false)

  const toggleWidget = (key: keyof WidgetConfig) => {
    setConfig(prev => {
      const next = { ...prev, [key]: !prev[key] }
      localStorage.setItem('playhub:dashboardWidgets', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      // 1. Try to load from cache first for immediate display
      try {
        const cached = localStorage.getItem('playhub:dashboardData')
        if (cached) {
          setData(JSON.parse(cached))
          setLoading(false)
        }
      } catch (e) {
        console.error('Failed to load cached dashboard data', e)
      }

      // 2. Fetch fresh data
      try {
        const result = await electron.ipcRenderer.invoke('dashboard:get-data')
        
        if (result) {
          setData(result)
          localStorage.setItem('playhub:dashboardData', JSON.stringify(result))
          setError(null)
        } else {
          console.warn('Dashboard data is null or undefined')
          setError('Received empty data from backend')
        }
      } catch (err: any) {
        console.error('Failed to fetch dashboard data', err)
        setError(err.message || 'Failed to communicate with backend')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Helper to safely access data
  const stats = data?.stats || { totalGames: 0, installedGames: 0, totalPlaytime: 0, completedGames: 0 }
  
  // Filter recent games based on time budget
  const recentGames = useMemo(() => {
    const games = data?.recentGames || []
    if (timeFilter === 'all') return games
    
    return games.filter(g => {
      const time = g.hltb_main || 0
      if (timeFilter === 'hltb') return time > 0
      if (timeFilter === 'short') return time > 0 && time <= 5
      if (timeFilter === 'medium') return time > 5 && time <= 20
      if (timeFilter === 'long') return time > 20
      return true
    })
  }, [data?.recentGames, timeFilter])

  const news = data?.news || []
  const friendsActivity = data?.friendsActivity || []
  
  // Filter recommendation based on time budget
  const recommendation = useMemo(() => {
    const game = data?.recommendation
    if (!game) return null
    if (timeFilter === 'all') return game

    const time = game.hltb_main || 0
    let matches = true
    if (timeFilter === 'hltb') matches = time > 0
    else if (timeFilter === 'short') matches = time > 0 && time <= 5
    else if (timeFilter === 'medium') matches = time > 5 && time <= 20
    else if (timeFilter === 'long') matches = time > 20
    
    return matches ? game : null
  }, [data?.recommendation, timeFilter])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-[200px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 h-full min-h-[200px]">
        <AlertCircle size={48} className="mb-4 text-red-400" />
        <p className="mb-2 text-lg font-medium text-slate-300">Unable to load dashboard data</p>
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg max-w-md text-center">
            <p className="text-sm text-red-400 font-mono">{error}</p>
          </div>
        )}
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-semibold text-slate-200 transition-colors border border-slate-700"
        >
          Reload PlayHub
        </button>
      </div>
    )
  }

  const formatPlaytime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    return `${hours}h`
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('dashboard.greeting.morning', 'Good morning')
    if (hour < 18) return t('dashboard.greeting.afternoon', 'Good afternoon')
    return t('dashboard.greeting.evening', 'Good evening')
  }

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-6 lg:p-8 space-y-8">
      
      {/* 1. Header & Stats */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {getGreeting()}, <span className="text-primary-400">{user?.username || 'Gamer'}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-400 text-sm">
              {t('dashboard.subtitle', 'Ready for your next adventure?')}
            </p>
            
            <div className="h-4 w-px bg-white/10 mx-2" />

            <button 
              onClick={() => setShowConfig(!showConfig)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
              title={t('dashboard.customize', 'Customize Dashboard')}
            >
              <Settings size={14} />
            </button>
          </div>
          
          {showConfig && (
            <div className="absolute z-50 mt-2 bg-slate-900 border border-slate-700 rounded-xl p-4 shadow-xl w-64 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t('dashboard.widgets', 'Widgets')}</span>
                <button onClick={() => setShowConfig(false)} aria-label="Close"><X size={14} className="text-slate-500 hover:text-white" /></button>
              </div>
              <div className="space-y-2">
                {Object.keys(DEFAULT_WIDGET_CONFIG).map((key) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
                      {t(`dashboard.widget.${key}`, key.replace('show', ''))}
                    </span>
                    <input 
                      type="checkbox" 
                      checked={config[key as keyof WidgetConfig]} 
                      onChange={() => toggleWidget(key as keyof WidgetConfig)}
                      className="rounded bg-slate-800 border-slate-700 text-primary-500 focus:ring-offset-slate-900 focus:ring-primary-500/50"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Onboarding Hints */}
        {showOnboardingHints && onboardingStats && (
            <div className="mb-6">
                <OnboardingHints 
                    stats={onboardingStats} 
                    hasTags={!!hasTags} 
                    onDismiss={onDismissOnboardingHints!} 
                />
            </div>
        )}
        
        {config.showStats && (
        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 min-w-[120px] flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-lg">
              <Gamepad2 size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{stats.totalGames}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{t('dashboard.stats.games', 'Games')}</div>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 min-w-[120px] flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{formatPlaytime(stats.totalPlaytime)}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{t('dashboard.stats.playtime', 'Hours')}</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 min-w-[120px] flex items-center gap-3">
            <div className="p-2 bg-green-500/20 text-green-400 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{stats.installedGames}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{t('dashboard.stats.installed', 'Ready')}</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-3 min-w-[120px] flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-xl font-bold text-white">{stats.completedGames}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{t('dashboard.stats.completed', 'Completed')}</div>
            </div>
          </div>
        </div>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Main Content (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 2. Recent Activity */}
          {config.showRecent && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Activity size={18} className="text-primary-400" />
                {t('dashboard.recentGames', 'Jump Back In')}
              </h2>
              <button 
                onClick={() => onNavigate('home', 'all')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                {t('dashboard.viewAll', 'View Library')} <ChevronRight size={12} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentGames.map((game) => (
                <div 
                  key={game.id} 
                  className="group relative aspect-[3/4] bg-slate-800 rounded-xl overflow-hidden cursor-pointer border border-white/5 hover:border-primary-500/50 transition-all hover:shadow-lg hover:shadow-primary-500/10"
                  onClick={() => onSelectGame(game.id)}
                >
                  {game.box_art_url ? (
                    <img 
                      src={game.box_art_url} 
                      alt={game.title} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 font-bold p-4 text-center">
                      {game.title}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlayGame(game.id)
                      }}
                      className="w-full py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform"
                    >
                      <Play size={12} fill="currentColor" /> {t('dashboard.play', 'Play')}
                    </button>
                  </div>
                </div>
              ))}
              
              {recentGames.length === 0 && (
                <div className="col-span-2 sm:col-span-4 h-32 flex flex-col items-center justify-center bg-white/5 rounded-xl border border-white/5 border-dashed text-slate-500">
                  <p className="text-sm">{t('dashboard.noRecent', 'No recent activity')}</p>
                  <button onClick={() => onNavigate('home', 'all')} className="mt-2 text-primary-400 hover:text-primary-300 text-xs">
                    {t('dashboard.browseLibrary', 'Browse Library')}
                  </button>
                </div>
              )}
            </div>
          </section>
          )}

          {/* 4. News Feed */}
          {config.showNews && (
          <section>
             <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Newspaper size={18} className="text-primary-400" />
                {t('dashboard.news', 'Latest Updates')}
              </h2>
              <button 
                onClick={() => onNavigate('news')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                {t('dashboard.viewNews', 'All News')} <ChevronRight size={12} />
              </button>
            </div>
            
            <div className="space-y-3">
              {news.map((item, idx) => (
                <a 
                  key={idx} 
                  href={item.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="block bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-4 transition-colors group"
                >
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-primary-400 transition-colors mb-1 line-clamp-1">{item.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{item.contents || item.summary || 'No description available.'}</p>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{new Date(item.published_at * 1000).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{item.feedlabel || 'Steam'}</span>
                  </div>
                </a>
              ))}
              
              {news.length === 0 && (
                 <div className="p-6 text-center text-slate-500 bg-white/5 rounded-xl border border-white/5">
                  {t('dashboard.noNews', 'No news available right now.')}
                 </div>
              )}
            </div>
          </section>
          )}
        </div>

        {/* Sidebar Content (4 cols) */}
        <aside className="lg:col-span-4 space-y-8">
          
          {/* 3. Quick Actions / Recommendation */}
          {config.showRecommendation && recommendation && (
            <section className="bg-gradient-to-br from-primary-900/40 to-slate-900/40 border border-primary-500/20 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Zap size={100} />
              </div>
              
              <div className="relative z-10">
                <div className="text-xs font-bold text-primary-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Zap size={12} /> {t('dashboard.recommended', 'Suggested for you')}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4 line-clamp-2">{recommendation.title}</h3>
                
                <div className="aspect-video bg-slate-800 rounded-lg overflow-hidden mb-4 shadow-lg">
                   {recommendation.metadata?.background || recommendation.box_art_url ? (
                      <img 
                        src={recommendation.metadata?.background || recommendation.box_art_url} 
                        className="w-full h-full object-cover" 
                      />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800">
                        <Gamepad2 className="text-slate-600" />
                      </div>
                   )}
                </div>

                <button 
                  onClick={() => onPlayGame(recommendation.id)}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={16} fill="currentColor" /> {t('dashboard.playNow', 'Play Now')}
                </button>
              </div>
            </section>
          )}

          {/* Friends Activity */}
          {config.showFriends && (
            <section className="bg-white/5 border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Users size={16} /> {t('dashboard.friends', 'Friends Activity')}
                </h3>
                <button 
                  onClick={() => onNavigate('social')}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {t('dashboard.viewAll', 'View All')}
                </button>
              </div>
              
              <div className="space-y-3">
                {friendsActivity.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3">
                    <div className="relative">
                      {friend.avatar_url ? (
                        <img src={friend.avatar_url} alt={friend.username} className="w-8 h-8 rounded-full bg-slate-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={clsx(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900",
                        friend.status === 'in-game' ? "bg-green-500" :
                        friend.status === 'online' ? "bg-blue-500" : "bg-slate-500"
                      )}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">{friend.username}</div>
                      <div className="text-xs text-slate-400 truncate">
                        {friend.status === 'in-game' ? (
                          <span className="text-green-400">{friend.game_activity || 'Playing a game'}</span>
                        ) : (
                          friend.status
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {friendsActivity.length === 0 && (
                  <div className="text-center text-xs text-slate-500 py-2">
                    {t('dashboard.noFriendsOnline', 'No friends online')}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Quick Access */}
          {config.showQuickAccess && (
          <section className="bg-white/5 border border-white/5 rounded-2xl p-5">
             <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <LayoutGrid size={16} /> {t('dashboard.quickAccess', 'Quick Access')}
             </h3>
             
             <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => onNavigate('home', 'installed')}
                  className="p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 text-left transition-all"
                >
                   <CheckCircle2 size={18} className="text-green-400 mb-2" />
                   <div className="text-xs font-medium text-slate-300">Installed</div>
                </button>
                <button 
                  onClick={() => onNavigate('home', 'favorites')}
                  className="p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 text-left transition-all"
                >
                   <Trophy size={18} className="text-yellow-400 mb-2" />
                   <div className="text-xs font-medium text-slate-300">Favorites</div>
                </button>
                <button 
                  onClick={() => onNavigate('inventory')}
                  className="p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 text-left transition-all"
                >
                   <LayoutGrid size={18} className="text-blue-400 mb-2" />
                   <div className="text-xs font-medium text-slate-300">Collection</div>
                </button>
                 <button 
                  onClick={() => onNavigate('social')}
                  className="p-3 bg-slate-900/50 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 text-left transition-all"
                >
                   <Users size={18} className="text-pink-400 mb-2" />
                   <div className="text-xs font-medium text-slate-300">Friends</div>
                </button>
             </div>
          </section>
          )}

          {/* 5. System Status (Simplified) */}
          {config.showSystemStatus && (
          <section className="bg-white/5 border border-white/5 rounded-2xl p-5">
             <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <Activity size={16} /> {t('dashboard.systemStatus', 'System Status')}
             </h3>
             <div className="space-y-3">
               <div className="flex items-center justify-between text-xs">
                 <span className="text-slate-400">Network</span>
                 <span className={clsx("flex items-center gap-1.5 font-medium", isOnline ? "text-green-400" : "text-red-400")}>
                   <span className={clsx("w-1.5 h-1.5 rounded-full", isOnline ? "bg-green-400" : "bg-red-400")}></span> 
                   {isOnline ? 'Online' : 'Offline'}
                 </span>
               </div>
               <div className="flex items-center justify-between text-xs">
                 <span className="text-slate-400">Database</span>
                 <span className="flex items-center gap-1.5 text-green-400 font-medium">
                   <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span> Healthy
                 </span>
               </div>
                <div className="flex items-center justify-between text-xs">
                 <span className="text-slate-400">App Version</span>
                 <span className="text-slate-500">v1.0.4</span>
               </div>
             </div>
          </section>
          )}

        </aside>
      </div>
    </div>
  )
}
