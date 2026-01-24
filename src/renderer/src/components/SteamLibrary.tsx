import React, { useMemo, useState } from 'react'
import clsx from 'clsx'
import { GameCard } from './GameCard'
import { useTranslation } from 'react-i18next'

interface SteamLibraryProps {
  games: any[]
  isLoading: boolean
  onPlay: (gameId: string) => void
  onInstallToggle: (game: any) => void
  onToggleFavorite: (gameId: string) => void
  onRefresh: () => void
}

type ViewMode = 'grid' | 'list'
type SortOption = 'name' | 'playtime' | 'last_played'
type FilterOption = 'all' | 'installed' | 'uninstalled'

export function SteamLibrary({ games, isLoading, onPlay, onInstallToggle, onToggleFavorite, onRefresh }: SteamLibraryProps) {
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

  const visibleGames = filteredGames.slice(0, visibleCount)
  const hasMore = visibleCount < filteredGames.length

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 60)
  }

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
              <span className="w-8 h-8 bg-[#171a21] rounded flex items-center justify-center">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm.23 4.67a1.32 1.32 0 1 0 0 2.64 1.32 1.32 0 0 0 0-2.64zM9.06 8.52a2.86 2.86 0 1 0 0 5.72 2.86 2.86 0 0 0 0-5.72z"/></svg>
              </span>
              {t('steamLibrary.header')}
            </h2>
            <div className="flex gap-4 text-xs text-slate-400 mt-1">
              <span>{t('steamLibrary.statsOwned', { count: totalGames })}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 self-center"></span>
              <span>{t('steamLibrary.statsInstalled', { count: installedCount })}</span>
              <span className="w-1 h-1 rounded-full bg-slate-600 self-center"></span>
              <span>{t('steamLibrary.statsHours', { count: totalPlaytimeHours })}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
                onClick={onRefresh}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title={t('steamLibrary.refreshTitle')}
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
                  placeholder={t('steamLibrary.searchPlaceholder')}
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
                  {t('steamLibrary.filters.all')}
                </button>
                <button 
                  onClick={() => setFilterOption('installed')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    filterOption === 'installed' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('steamLibrary.filters.installed')}
                </button>
                <button 
                  onClick={() => setFilterOption('uninstalled')}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                    filterOption === 'uninstalled' ? "bg-slate-700 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('steamLibrary.filters.uninstalled')}
                </button>
             </div>

             <div className="w-px h-8 bg-slate-800 mx-1"></div>

             {/* Sort Dropdown */}
             <select 
               value={sortOption}
               onChange={(e) => setSortOption(e.target.value as SortOption)}
               className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-primary-500 cursor-pointer"
             >
               <option value="name">{t('steamLibrary.sort.name')}</option>
               <option value="playtime">{t('steamLibrary.sort.playtime')}</option>
               <option value="last_played">{t('steamLibrary.sort.lastPlayed')}</option>
             </select>

             {/* View Toggle */}
             <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
               <button 
                 onClick={() => setViewMode('grid')}
                 className={clsx(
                   "p-1.5 rounded-md transition-all",
                   viewMode === 'grid' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                 )}
                 title={t('steamLibrary.view.gridTitle')}
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
               </button>
               <button 
                 onClick={() => setViewMode('list')}
                 className={clsx(
                   "p-1.5 rounded-md transition-all",
                   viewMode === 'list' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
                 )}
                 title={t('steamLibrary.view.listTitle')}
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
            <div className="text-center py-20 text-slate-500">
                <p className="text-xl">{t('steamLibrary.empty.title')}</p>
                <button 
                    onClick={() => { setSearchQuery(''); setFilterOption('all'); }}
                    className="mt-4 text-primary-400 hover:underline"
                >
                    {t('steamLibrary.empty.clear')}
                </button>
            </div>
        ) : (
            <>
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4 sm:gap-5 lg:gap-6">
                        {visibleGames.map(game => (
                            <div 
                                key={game.id}
                                className="flex flex-col items-stretch"
                            >
                                <div className="w-full max-w-xs mx-auto">
                                    <GameCard 
                                        game={game} 
                                        onClick={onPlay}
                                        onToggleFavorite={onToggleFavorite}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                            <div className="col-span-6">{t('steamLibrary.listHeaders.name')}</div>
                            <div className="col-span-2">{t('steamLibrary.listHeaders.status')}</div>
                            <div className="col-span-2">{t('steamLibrary.listHeaders.playtime')}</div>
                            <div className="col-span-2 text-right">{t('steamLibrary.listHeaders.lastPlayed')}</div>
                        </div>
                        {visibleGames.map(game => (
                            <div 
                                key={game.id}
                                onClick={() => onPlay(game.id)}
                                className="grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-lg hover:bg-slate-800/50 cursor-pointer group transition-colors border border-transparent hover:border-slate-700"
                            >
                                <div className="col-span-6 flex items-center gap-3">
                                    <img 
                                        src={game.box_art_url} 
                                        alt="" 
                                        className="w-8 h-10 object-cover rounded bg-slate-800"
                                        onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                    <span className="font-medium text-slate-200 group-hover:text-white transition-colors">{game.title}</span>
                                </div>
                                <div className="col-span-2 flex items-center gap-2">
                                    {game.is_installed ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-500/10 px-2 py-1 rounded">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            {t('steamLibrary.status.ready')}
                                        </span>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-800 px-2 py-1 rounded">
                                                {t('steamLibrary.status.library')}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onInstallToggle(game)
                                                }}
                                                className="p-1 text-slate-500 hover:text-primary-400 hover:bg-primary-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title={t('steamLibrary.status.installTitle')}
                                            >
                                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="col-span-2 text-sm text-slate-400">
                                    {Math.round((game.playtime_seconds || 0) / 3600 * 10) / 10}h
                                </div>
                                <div className="col-span-2 text-right text-sm text-slate-400">
                                    {game.last_played ? new Date(game.last_played).toLocaleDateString() : '-'}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div className="mt-8 text-center">
                        <button 
                            onClick={handleLoadMore}
                            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium transition-colors"
                        >
                            {t('steamLibrary.loadMore')}
                        </button>
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  )
}
