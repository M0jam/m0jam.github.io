import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

interface GogLibraryProps {
  games: any[]
  isLoading: boolean
  onPlay: (gameId: string) => void
  onLaunch: (gameId: string) => void
  onInstallToggle: (game: any) => void
  onRefresh: () => void
}

type ViewMode = 'grid' | 'list'
type SortOption = 'name' | 'playtime' | 'last_played'
type FilterOption = 'all' | 'installed' | 'uninstalled'

const GogGameImage = ({ src, title, className, fallbackClassName }: { src: string, title: string, className?: string, fallbackClassName?: string }) => {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  React.useEffect(() => {
    setCurrentSrc(src)
    setHasError(false)
  }, [src])

  const handleError = () => {
    if (currentSrc && currentSrc.includes('_ggvgm_2x.jpg')) {
      setCurrentSrc(currentSrc.replace('_ggvgm_2x.jpg', '_ggvgm.jpg'))
    } else if (currentSrc && currentSrc.includes('_ggvgm.jpg')) {
      setCurrentSrc(currentSrc.replace('_ggvgm.jpg', '.jpg'))
    } else {
      setHasError(true)
    }
  }

  if (hasError || !src) {
    return (
       <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-1 text-center">
          <span className={clsx("text-slate-600 font-bold line-clamp-3", fallbackClassName || "text-lg")}>{title}</span>
       </div>
    )
  }

  return (
    <img 
      src={currentSrc} 
      alt={title}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  )
}

export function GogLibrary({ games, isLoading, onPlay, onLaunch, onInstallToggle, onRefresh }: GogLibraryProps) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortOption, setSortOption] = useState<SortOption>('name')
  const [filterOption, setFilterOption] = useState<FilterOption>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCount, setVisibleCount] = useState(60)

  const filteredGames = useMemo(() => {
    let result = [...games]

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(g => g.title.toLowerCase().includes(q))
    }

    // Filter by Status
    if (filterOption === 'installed') {
      result = result.filter(g => g.is_installed)
    } else if (filterOption === 'uninstalled') {
      result = result.filter(g => !g.is_installed)
    }

    // Sort
    result.sort((a, b) => {
      if (sortOption === 'name') {
        return a.title.localeCompare(b.title)
      } else if (sortOption === 'playtime') {
        return (b.playtime_seconds || 0) - (a.playtime_seconds || 0)
      } else if (sortOption === 'last_played') {
        const dateA = a.last_played ? new Date(a.last_played).getTime() : 0
        const dateB = b.last_played ? new Date(b.last_played).getTime() : 0
        return dateB - dateA
      }
      return 0
    })

    return result
  }, [games, searchQuery, filterOption, sortOption])

  // Calculate stats
  const totalGames = games.length
  const installedCount = games.filter(g => g.is_installed).length
  const totalPlaytimeMinutes = games.reduce((acc, g) => acc + (g.playtime_seconds || 0) / 60, 0)
  const totalPlaytimeHours = Math.round(totalPlaytimeMinutes / 60)

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Header / Controls */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="w-8 h-8 bg-[#5d2d88] rounded flex items-center justify-center text-white font-bold">
                G
              </span>
              {t('gogLibrary.header', 'GOG Galaxy Library')}
            </h2>
            <div className="flex gap-4 text-xs text-slate-400 mt-1">
              <span>{t('gogLibrary.statsOwned', { count: totalGames })}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 self-center"></span>
              <span>{t('gogLibrary.statsInstalled', { count: installedCount })}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 self-center"></span>
              <span>{t('gogLibrary.statsHours', { count: totalPlaytimeHours })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
                onClick={onRefresh}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title={t('gogLibrary.refreshTitle')}
                disabled={isLoading}
            >
                <svg className={clsx("w-5 h-5", isLoading && "animate-spin")} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-2 w-full md:w-auto">
             <div className="relative w-full md:w-64">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('gogLibrary.searchPlaceholder')}
                  className="w-full bg-slate-900 border border-slate-700 text-sm rounded-md pl-9 pr-3 py-2 focus:outline-none focus:border-primary-500 transition-colors"
                />
                <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
             </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto">
             {/* Filter Toggles */}
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                <button 
                  onClick={() => setFilterOption('all')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    filterOption === 'all' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('gogLibrary.filters.all')}
                </button>
                <button 
                  onClick={() => setFilterOption('installed')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    filterOption === 'installed' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('gogLibrary.filters.installed')}
                </button>
                <button 
                  onClick={() => setFilterOption('uninstalled')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    filterOption === 'uninstalled' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('gogLibrary.filters.uninstalled')}
                </button>
             </div>

             <div className="w-px h-8 bg-slate-800 mx-1"></div>

             {/* Sort Dropdown */}
             <select 
               value={sortOption}
               onChange={(e) => setSortOption(e.target.value as SortOption)}
               className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-primary-500 cursor-pointer"
             >
               <option value="name">{t('gogLibrary.sort.name')}</option>
               <option value="playtime">{t('gogLibrary.sort.playtime')}</option>
               <option value="last_played">{t('gogLibrary.sort.lastPlayed')}</option>
             </select>

             {/* View Toggle */}
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
               <button 
                 onClick={() => setViewMode('grid')}
                 className={clsx(
                   "p-1.5 rounded-md transition-all",
                   viewMode === 'grid' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                 )}
                 title={t('gogLibrary.view.gridTitle')}
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={clsx(
                   "p-1.5 rounded-md transition-all",
                   viewMode === 'list' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                 )}
                 title={t('gogLibrary.view.listTitle')}
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
               </button>
             </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {isLoading && games.length === 0 ? (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
        ) : filteredGames.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
                </svg>
                <p>{t('steamLibrary.noGamesFound')}</p>
            </div>
        ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 md:gap-6">
                {filteredGames.slice(0, visibleCount).map(game => (
                    <button
                        key={game.id}
                        onClick={() => onPlay(game.id)}
                        className="group relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-primary-500/60 transition-all hover:shadow-xl hover:shadow-primary-900/20 text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <div className="aspect-[2/3] w-full bg-slate-950 relative overflow-hidden">
                            <GogGameImage 
                                src={game.box_art_url} 
                                title={game.title} 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                fallbackClassName="text-lg p-4"
                            />
                            
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 gap-2 backdrop-blur-[2px]">
                                <div className="font-bold text-white text-center line-clamp-2 mb-2">{game.title}</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (game.is_installed) {
                                            onLaunch(game.id)
                                        } else {
                                            onInstallToggle(game)
                                        }
                                    }}
                                    className={clsx(
                                        "px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300",
                                        game.is_installed ? "bg-emerald-600 hover:bg-emerald-500" : "bg-primary-600 hover:bg-primary-500"
                                    )}
                                    aria-label={game.is_installed ? `Play ${game.title}` : `Install ${game.title}`}
                                >
                                    {game.is_installed ? t('gogLibrary.play') : t('gogLibrary.install')}
                                </button>
                                {game.last_played && (
                                    <div className="text-[10px] text-slate-300 mt-2">
                                        {t('gogLibrary.lastPlayed')}: {new Date(game.last_played).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        ) : (
            <div className="flex flex-col gap-2">
                {filteredGames.slice(0, visibleCount).map(game => (
                    <div 
                        key={game.id}
                        className="flex items-center gap-4 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors group cursor-pointer"
                        onClick={() => onPlay(game.id)}
                    >
                        <div className="w-12 h-16 bg-slate-950 rounded overflow-hidden flex-shrink-0">
                            <GogGameImage 
                                src={game.box_art_url} 
                                title={game.title} 
                                className="w-full h-full object-cover"
                                fallbackClassName="text-[10px] p-1"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white truncate">{game.title}</h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                                {game.playtime_seconds > 0 && (
                                    <span>{Math.round(game.playtime_seconds / 3600)}h played</span>
                                )}
                                {game.last_played && (
                                    <span>Last played: {new Date(game.last_played).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity px-2">
                             <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (game.is_installed) {
                                        onLaunch(game.id)
                                    } else {
                                        onInstallToggle(game)
                                    }
                                }}
                                className={clsx(
                                    "px-3 py-1.5 rounded text-xs font-bold transition-colors",
                                    game.is_installed 
                                        ? "bg-emerald-600 hover:bg-emerald-500 text-white" 
                                        : "bg-slate-700 hover:bg-slate-600 text-white"
                                )}
                                aria-label={game.is_installed ? `Play ${game.title}` : `Install ${game.title}`}
                             >
                                {game.is_installed ? t('gogLibrary.play') : t('gogLibrary.install')}
                             </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        
        {/* Load More Trigger (if needed) */}
        {visibleCount < filteredGames.length && (
             <div className="mt-8 text-center">
                <button 
                  onClick={() => setVisibleCount(prev => prev + 60)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium transition-colors"
                >
                  {t('gogLibrary.loadMore')}
                </button>
             </div>
        )}
      </div>
    </div>
  )
}
