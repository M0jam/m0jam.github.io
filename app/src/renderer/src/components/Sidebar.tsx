import React from 'react'
import { Logo } from './Logo'
import { Search, LayoutGrid, Newspaper, Users, Wrench, Hash } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { electron } from '../utils/electron'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  libraryFilter: string
  setLibraryFilter: (filter: string) => void
  selectedTagId: number | null
  setSelectedTagId: (id: number | null) => void
  allTags: any[]
  user: any
  setIsSettingsOpen: (isOpen: boolean) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  activeTutorial: string | null
  setActiveTutorial: (tutorial: string | null) => void // Accepts string to be compatible with 'accounts' | 'library' etc.
}

const DISCORD_INVITE_URL: string | undefined =
  typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_DISCORD_INVITE_URL

export function Sidebar({
  activeTab,
  setActiveTab,
  libraryFilter,
  setLibraryFilter,
  selectedTagId,
  setSelectedTagId,
  allTags,
  user,
  setIsSettingsOpen,
  searchQuery,
  setSearchQuery,
  activeTutorial,
  setActiveTutorial
}: SidebarProps) {
  const { t } = useTranslation()

  return (
    <div className="relative z-10 glass-panel border-r-0 rounded-2xl flex flex-col flex-shrink-0 select-none overflow-hidden w-64 m-4 p-4 transition-all duration-300 ease-in-out">
      <div className="px-2 cursor-pointer mb-6" onClick={() => setActiveTab('home')}>
        <Logo className="h-10 w-auto" />
      </div>

      <div className="px-2 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('app.topbar.searchGames')}
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700/50 focus:border-primary-500/50 rounded-lg py-2 pl-9 pr-4 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-6 scrollbar-hide">
        <div className="space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={clsx(
              "w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg font-medium transition-colors text-sm",
              activeTab === 'dashboard' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <LayoutGrid size={16} />
            <span>{t('app.sidebar.dashboard', 'Dashboard')}</span>
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={clsx(
              "w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg font-medium transition-colors text-sm",
              activeTab === 'news' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800"
            )}
          >
            <Newspaper size={16} />
            <span>{t('app.topbar.news')}</span>
          </button>
          <div className="relative">
            {activeTutorial === 'social' && (
              <div className="absolute top-0 left-full ml-4 z-50 w-64">
                <div className="relative bg-slate-900 border border-primary-500/60 rounded-xl px-3 py-2 shadow-2xl text-xs text-slate-100 animate-in slide-in-from-left-2">
                  <div className="absolute top-3 -left-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-slate-900" />

                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-primary-200">
                      {t('app.onboarding.socialTitle')}
                    </div>
                    <div className="text-[10px] text-slate-400 border border-slate-600 rounded-full px-2 py-0.5">
                      3 / 4
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                    {t('app.onboarding.socialTutorialHint')}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTutorial('discord')}
                      className="inline-flex items-center px-2 py-1 rounded bg-primary-600/80 text-[10px] font-medium text-white hover:bg-primary-500"
                    >
                      {t('app.onboarding.nextStep')}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTutorial(null);
                      }}
                      className="inline-flex items-center px-2 py-1 rounded border border-slate-700 text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      {t('app.onboarding.skip')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setActiveTab('social')}
              className={clsx(
                "w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg font-medium transition-colors text-sm",
                activeTab === 'social' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <Users size={16} />
              <span>{t('app.topbar.social')}</span>
            </button>
            <button
              onClick={() => setActiveTab('utilities')}
              className={clsx(
                "w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg font-medium transition-colors text-sm",
                activeTab === 'utilities' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <Wrench size={16} />
              <span>{t('app.topbar.utilities', 'Utilities')}</span>
            </button>
          </div>
        </div>

        <div className="space-y-1 relative">
          {activeTutorial === 'library' && (
            <div className="absolute top-10 left-2 z-30">
              <div className="relative bg-slate-900 border border-primary-500/60 rounded-xl px-3 py-2 shadow-lg text-xs text-slate-100 max-w-xs">
                <div className="absolute top-6 -left-2 w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-slate-900" />
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-primary-200">
                    {t('app.onboarding.libraryTitle')}
                  </div>
                  <div className="text-[10px] text-slate-400 border border-slate-600 rounded-full px-2 py-0.5">
                    2 / 4
                  </div>
                </div>
                <div className="text-[11px] text-slate-300">
                  {t('app.onboarding.libraryTutorialHint')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTutorial('social')}
                    className="mt-2 inline-flex items-center px-2 py-1 rounded bg-primary-600/80 text-[10px] font-medium text-white hover:bg-primary-500"
                  >
                    {t('app.onboarding.nextStep')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTutorial(null);
                    }}
                    className="mt-2 inline-flex items-center px-2 py-1 rounded border border-slate-700 text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    {t('app.onboarding.skip')}
                  </button>
                </div>
              </div>
            </div>
          )}
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">{t('app.sidebar.library')}</h3>
          <button
            onClick={() => { setActiveTab('home'); setLibraryFilter('all'); setSelectedTagId(null); }}
            className={clsx("w-full text-left px-3 py-2 rounded-lg font-medium transition-colors", activeTab === 'home' && libraryFilter === 'all' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800")}
          >
            {t('app.sidebar.allGames')}
          </button>
          <button
            onClick={() => { setActiveTab('home'); setLibraryFilter('favorites'); setSelectedTagId(null); }}
            className={clsx("w-full text-left px-3 py-2 rounded-lg font-medium transition-colors", activeTab === 'home' && libraryFilter === 'favorites' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800")}
          >
            {t('app.sidebar.favorites')}
          </button>
          <button
            onClick={() => { setActiveTab('home'); setLibraryFilter('installed'); setSelectedTagId(null); }}
            className={clsx("w-full text-left px-3 py-2 rounded-lg font-medium transition-colors", activeTab === 'home' && libraryFilter === 'installed' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800")}
          >
            {t('app.sidebar.installed')}
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">{t('app.sidebar.collection')}</h3>
          <button
            onClick={() => setActiveTab('inventory')}
            className={clsx("w-full text-left px-3 py-2 rounded-lg font-medium transition-colors", activeTab === 'inventory' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800")}
          >
            {t('app.sidebar.inventory')}
          </button>
          <button
            onClick={() => setActiveTab('steam-games')}
            className={clsx("w-full text-left px-3 py-2 rounded-lg font-medium transition-colors", activeTab === 'steam-games' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800")}
          >
            {t('app.sidebar.steamLibrary')}
          </button>
          <button
            onClick={() => setActiveTab('gog-games')}
            className={clsx("w-full text-left px-3 py-2 rounded-lg font-medium transition-colors", activeTab === 'gog-games' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-slate-800")}
          >
            {t('app.sidebar.gogLibrary', 'GOG Galaxy')}
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2 mt-4">{t('app.sidebar.tags')}</h3>
          {allTags.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-600 italic">No tags created</div>
          )}
          {allTags.map(tag => (
            <button
              key={tag.id}
              onClick={() => {
                setActiveTab('home');
                if (tag.id === selectedTagId) {
                  setSelectedTagId(null)
                  setLibraryFilter('all')
                } else {
                  setSelectedTagId(tag.id)
                  setLibraryFilter(`tag:${tag.id}`)
                }
              }}
              className={clsx(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm",
                selectedTagId === tag.id ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400 hover:bg-slate-800"
              )}
            >
              <Hash className="w-3 h-3 opacity-70" />
              <span className="truncate">{tag.name}</span>
            </button>
          ))}
        </div>
      </div>

      {user && (
        <div className="pt-4 mt-4 border-t border-slate-800/50 flex-shrink-0 relative">
          {activeTutorial === 'accounts' && (
            <div className="absolute bottom-full left-0 mb-4 z-50 w-64">
              <div className="relative bg-slate-900 border border-primary-500/60 rounded-xl px-3 py-2 shadow-2xl text-xs text-slate-100 animate-in slide-in-from-bottom-2">
                <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />

                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-primary-200">
                    {t('app.onboarding.accountsTitle')}
                  </div>
                  <div className="text-[10px] text-slate-400 border border-slate-600 rounded-full px-2 py-0.5">
                    1 / 4
                  </div>
                </div>
                <div className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                  {t('app.onboarding.accountsTutorialHint')}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTutorial('library')}
                    className="inline-flex items-center px-2 py-1 rounded bg-primary-600/80 text-[10px] font-medium text-white hover:bg-primary-500"
                  >
                    {t('app.onboarding.nextStep')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTutorial(null);
                    }}
                    className="inline-flex items-center px-2 py-1 rounded border border-slate-700 text-[10px] font-medium text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    {t('app.onboarding.skip')}
                  </button>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 w-full hover:bg-white/5 p-2 rounded-lg transition-colors group text-left"
          >
            <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 overflow-hidden group-hover:border-primary-500 transition-colors shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-slate-200 group-hover:text-white truncate">
                {user.username}
              </div>
              <div className="text-[10px] text-slate-500 group-hover:text-slate-400 truncate">
                {t('app.settings.profile')}
              </div>
            </div>
          </button>
        </div>
      )}

      {DISCORD_INVITE_URL && (
        <div className="pt-4 mt-4 border-t border-slate-800/50 flex-shrink-0">
          <a
            href={DISCORD_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative w-full group overflow-hidden rounded-xl bg-brand-discord/10 hover:bg-brand-discord border border-brand-discord/20 hover:border-brand-discord transition-all duration-300 p-3 flex items-center gap-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
            <div className="w-8 h-8 rounded-lg bg-brand-discord/20 group-hover:bg-white/20 flex items-center justify-center text-brand-discord group-hover:text-white transition-colors">
              <img src="https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png" className="w-5 h-5 group-hover:brightness-0 group-hover:invert transition-all" alt="Discord" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-brand-discord group-hover:text-white transition-colors">Discord</span>
              <span className="text-[10px] text-slate-400 group-hover:text-brand-discord/20 transition-colors">Join Community</span>
            </div>
          </a>
        </div>
      )}
    </div>
  )
}