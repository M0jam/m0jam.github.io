import React, { useEffect, useState } from 'react'
import { electron } from '../utils/electron'
import { Logo } from './Logo'
import { Minus, Square, X, Menu, Plus, Search, PanelLeftClose, PanelLeftOpen, Tv, Clock, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

interface TitleBarProps {
  user?: any
  onOpenSettings?: () => void
  onAddGame?: () => void
  showTutorial?: boolean
  onTutorialNext?: () => void
  onTutorialSkip?: () => void
  activeTab?: string
  onTabChange?: (tab: string) => void
  searchQuery?: string
  onSearchChange?: (query: string) => void
  activeTutorial?: string | null
  onTutorialDiscord?: () => void
  isSidebarOpen?: boolean
  onToggleSidebar?: () => void
  viewMode?: 'grid' | 'couch'
  onToggleViewMode?: () => void
  timeFilter?: 'all' | 'short' | 'medium' | 'long' | 'hltb'
  onTimeFilterChange?: (filter: 'all' | 'short' | 'medium' | 'long' | 'hltb') => void
}

export function TitleBar({ 
  user, 
  onOpenSettings, 
  onAddGame, 
  showTutorial, 
  onTutorialNext, 
  onTutorialSkip,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  activeTutorial,
  onTutorialDiscord,
  isSidebarOpen,
  onToggleSidebar,
  viewMode = 'grid',
  onToggleViewMode,
  timeFilter = 'all',
  onTimeFilterChange
}: TitleBarProps) {
  const { t } = useTranslation()
  const [isMaximized, setIsMaximized] = useState(false)
  const [showTimeFilter, setShowTimeFilter] = useState(false)

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const max = await electron.ipcRenderer.invoke('window:is-maximized')
        setIsMaximized(max)
      } catch (e) {
        console.error('Failed to check maximized state', e)
      }
    }

    checkMaximized()

    const handleResize = () => {
      checkMaximized()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleMinimize = () => electron.ipcRenderer.invoke('window:minimize')
  
  const handleMaximize = async () => {
    await electron.ipcRenderer.invoke('window:maximize')
    const max = await electron.ipcRenderer.invoke('window:is-maximized')
    setIsMaximized(max)
  }
  
  const handleClose = () => electron.ipcRenderer.invoke('window:close')

  return (
    <div className="h-14 flex-none flex items-center justify-between select-none z-[9999] w-full" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Left Section: Logo & Navigation */}
      <div className="flex items-center gap-6 px-4 h-full">
        <div className="flex items-center gap-3">
            <div style={{ WebkitAppRegion: 'no-drag' } as any}>
                <button 
                    onClick={onToggleSidebar}
                    className={clsx(
                        "p-2 rounded-md transition-all focus:outline-none hover:scale-105 active:scale-95",
                        isSidebarOpen 
                            ? "text-primary-400" 
                            : "text-slate-400 hover:text-white"
                    )}
                    aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                >
                    {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>
            </div>

            <div 
                className="flex items-center gap-2 cursor-pointer opacity-80 hover:opacity-100 transition-opacity" 
                style={{ WebkitAppRegion: 'no-drag' } as any}
                onClick={() => onTabChange?.('dashboard')}
            >
                <Logo className="h-6 w-auto" />
                <span className="text-sm font-bold text-slate-200 tracking-wide uppercase hidden md:block">PlayHub</span>
            </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
            <button 
                onClick={() => onTabChange?.('home')}
                className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    activeTab === 'home' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                {t('app.sidebar.library', 'Library')}
            </button>
            
             <button 
                onClick={() => onTabChange?.('news')}
                className={clsx(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    activeTab === 'news' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
            >
                {t('app.topbar.news')}
            </button>
            
            <div className="relative">
                <button 
                    onClick={() => onTabChange?.('social')}
                    className={clsx(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                        activeTab === 'social' ? "bg-white/10 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    {t('app.topbar.social')}
                </button>
                
                {/* Social Tutorial Hint */}
                {activeTutorial === 'social' && (
                    <div className="absolute top-10 left-0 z-[10000]">
                      <div className="relative bg-slate-900 border border-primary-500/60 rounded-xl px-3 py-2 shadow-lg text-xs text-slate-100 min-w-[200px]">
                        <div className="absolute -top-2 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900" />
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-primary-200">
                            {t('app.onboarding.socialTitle')}
                          </div>
                          <div className="text-[10px] text-slate-400 border border-slate-600 rounded-full px-2 py-0.5">
                            3 / 4
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-300 max-w-xs mb-2">
                          {t('app.onboarding.socialTutorialHint')}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={onTutorialDiscord}
                            className="inline-flex items-center px-2 py-1 rounded bg-primary-600/80 text-[10px] font-medium text-white hover:bg-primary-500"
                          >
                            {t('app.onboarding.nextStep')}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onTutorialSkip?.()
                            }}
                            className="inline-flex items-center px-2 py-1 rounded border border-slate-700 text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                          >
                            {t('app.onboarding.skip')}
                          </button>
                        </div>
                      </div>
                    </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Center Section: Search Bar */}
      <div className="flex-1 max-w-xl mx-4 px-4" style={{ WebkitAppRegion: 'no-drag' } as any}>
         <div className="relative group w-full">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={14} className="text-slate-500 group-focus-within:text-primary-400 transition-colors" />
            </div>
            <input 
                type="text" 
                placeholder={t('app.topbar.searchGames')}
                value={searchQuery || ''}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full bg-white/5 hover:bg-white/10 border border-transparent focus:border-primary-500/50 rounded-full py-1.5 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50 focus:bg-black/40 transition-all placeholder:text-slate-500 h-8"
            />
        </div>
      </div>

      {/* Right Section: Actions & Window Controls */}
      <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* View & Filter Controls (Library & Dashboard) */}
        {(activeTab === 'home' || activeTab === 'dashboard') && (
            <div className="flex items-center gap-1 mr-4 border-r border-white/5 pr-4 h-6">
                <button
                    onClick={onToggleViewMode}
                    className={clsx(
                        "p-1.5 rounded-md transition-all hover:bg-white/10",
                        viewMode === 'couch' ? "text-primary-400 bg-white/5" : "text-slate-400 hover:text-white"
                    )}
                    title={viewMode === 'couch' ? t('viewMode.grid') : t('viewMode.couch')}
                >
                    <Tv size={18} />
                </button>

                <div className="relative">
                    <button
                        onClick={() => setShowTimeFilter(!showTimeFilter)}
                        className={clsx(
                            "flex items-center gap-1 p-1.5 rounded-md transition-all hover:bg-white/10",
                            timeFilter !== 'all' ? "text-primary-400 bg-white/5" : "text-slate-400 hover:text-white"
                        )}
                        title={t('timeFilter.label')}
                    >
                        <Clock size={18} />
                        {timeFilter !== 'all' && (
                            <span className="text-[10px] font-bold uppercase">{timeFilter === 'hltb' ? 'HLTB' : timeFilter}</span>
                        )}
                    </button>
                    
                    {showTimeFilter && (
                        <div className="absolute top-8 right-0 bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1 w-40 z-50 flex flex-col gap-1">
                            {(['all', 'hltb', 'short', 'medium', 'long'] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => {
                                        onTimeFilterChange?.(f)
                                        setShowTimeFilter(false)
                                    }}
                                    className={clsx(
                                        "px-3 py-2 text-xs text-left rounded hover:bg-white/5",
                                        timeFilter === f ? "text-primary-400 bg-white/5 font-medium" : "text-slate-300"
                                    )}
                                >
                                    {f === 'hltb' ? 'Has HLTB Data' : t(`timeFilter.${f}`)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* User Actions */}
        {user && (
            <div className="flex items-center gap-2 mr-2 h-6">
                 <button
                    onClick={onAddGame}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Add Game"
                >
                    <Plus size={18} />
                </button>
                
                <div className="relative">
                    <button
                        onClick={onOpenSettings}
                        className="flex items-center gap-2 hover:bg-white/5 pl-1 pr-2 py-1 rounded-full transition-colors group"
                        title="Settings & Profile"
                    >
                        <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 overflow-hidden group-hover:border-primary-500 transition-colors">
                            {user.avatar_url ? (
                                <img src={user.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                                    {user.username?.[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-medium text-slate-400 group-hover:text-white max-w-[100px] truncate hidden sm:block">
                            {user.username}
                        </span>
                    </button>
                    {showTutorial && (
                      <div className="absolute top-10 right-0 z-[10000]">
                        <div className="relative bg-slate-900 border border-primary-500/60 rounded-xl px-3 py-2 shadow-lg text-xs text-slate-100 max-w-xs text-left w-64">
                          <div className="absolute -top-2 right-8 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900" />
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-semibold text-primary-200">
                              {t('app.onboarding.accountsTitle')}
                            </div>
                            <div className="text-[10px] text-slate-400 border border-slate-600 rounded-full px-2 py-0.5">
                              1 / 4
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            {t('app.onboarding.accountsTutorialHint')}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={onTutorialNext}
                              className="inline-flex items-center px-2 py-1 rounded bg-primary-600/80 text-[10px] font-medium text-white hover:bg-primary-500"
                            >
                              {t('app.onboarding.nextStep')}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onTutorialSkip?.()
                              }}
                              className="inline-flex items-center px-2 py-1 rounded border border-slate-700 text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                            >
                              {t('app.onboarding.skip')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
            </div>
        )}

        {/* Window Controls */}
        <button
          onClick={handleMinimize}
          className="w-12 h-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white focus:outline-none"
          tabIndex={-1}
          aria-label="Minimize"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full hover:bg-white/10 flex items-center justify-center transition-colors text-slate-400 hover:text-white focus:outline-none"
          tabIndex={-1}
          aria-label={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
             <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5v9h9V5H3zm8 8H4V6h7v7z"/>
                <path fillRule="evenodd" d="M5 5h1V4h7v7h-1v1h2V3H5v2z"/>
             </svg>
          ) : (
            <Square size={12} />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors text-slate-400 focus:outline-none"
          tabIndex={-1}
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
