import React, { useEffect, useMemo, useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { Logo } from './components/Logo'
import { SettingsModal } from './components/SettingsModal'
import { GameCard } from './components/GameCard'
import { OnboardingHints } from './components/OnboardingHints'
import { GameDetailsModal } from './components/GameDetailsModal'
import { AddGameModal } from './components/AddGameModal'
import { SteamLibrary } from './components/SteamLibrary'
import { GogLibrary } from './components/GogLibrary'
import { SocialPage } from './components/SocialPage'
import { WelcomeIntro } from './components/WelcomeIntro'
import { RegistrationSuccess } from './components/RegistrationSuccess'
import { Dashboard } from './components/Dashboard'
import { TitleBar } from './components/TitleBar'
import { CouchOverlay } from './components/CouchOverlay'
import { electron } from './utils/electron'
import clsx from 'clsx'
import i18n from './i18n'
import { useTranslation } from 'react-i18next'
import { Hash, Tag } from 'lucide-react'

const DISCORD_INVITE_URL: string | undefined =
  typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_DISCORD_INVITE_URL

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return i18n.t('app.greeting.morning')
  if (hour < 18) return i18n.t('app.greeting.afternoon')
  return i18n.t('app.greeting.evening')
}

function formatRelativeTime(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return i18n.t('time.unknown')

  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diffSeconds < 0) return i18n.t('time.justNow')

  if (diffSeconds < 60) return i18n.t('time.justNow')

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    if (diffMinutes === 1) return i18n.t('time.minuteAgo')
    return i18n.t('time.minutesAgo', { count: diffMinutes })
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    if (diffHours === 1) return i18n.t('time.hourAgo')
    return i18n.t('time.hoursAgo', { count: diffHours })
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    if (diffDays === 1) return i18n.t('time.dayAgo')
    return i18n.t('time.daysAgo', { count: diffDays })
  }

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) {
    if (diffWeeks === 1) return i18n.t('time.weekAgo')
    return i18n.t('time.weeksAgo', { count: diffWeeks })
  }

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    if (diffMonths === 1) return i18n.t('time.monthAgo')
    return i18n.t('time.monthsAgo', { count: diffMonths })
  }

  const diffYears = Math.floor(diffDays / 365)
  if (diffYears <= 1) return i18n.t('time.yearAgo')
  return i18n.t('time.yearsAgo', { count: diffYears })
}

function truncateDescription(text: string, maxLength = 150): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  const sliced = text.slice(0, maxLength)
  const trimmed = sliced.replace(/\s+\S*$/, '')
  return `${trimmed}…`
}

function App(): JSX.Element {
  const { t } = useTranslation()
  const [greeting, setGreeting] = useState(getGreeting())
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('dashboard') // dashboard, home, news, social
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)
  const [libraryFilter, setLibraryFilter] = useState('all') // all, favorites, installed
  const [games, setGames] = useState<any[]>([])
  const [news, setNews] = useState<any[]>([])
  const [friends, setFriends] = useState<any[]>([])

  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [activePlatform, setActivePlatform] = useState<string | null>(null)
  const [platformGames, setPlatformGames] = useState<any[]>([])
  const [isLoadingPlatformGames, setIsLoadingPlatformGames] = useState(false)
  const [platformError, setPlatformError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{title: string, body: string} | null>(null)
  const [steamGames, setSteamGames] = useState<any[]>([])
  const [isLoadingSteamGames, setIsLoadingSteamGames] = useState(false)
  const [steamGamesError, setSteamGamesError] = useState<string | null>(null)
  
  const [gogGames, setGogGames] = useState<any[]>([])
  const [isLoadingGogGames, setIsLoadingGogGames] = useState(false)
  const [gogGamesError, setGogGamesError] = useState<string | null>(null)

  // Tag filter state
  const [allTags, setAllTags] = useState<any[]>([])
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)

  const [steamSearch, setSteamSearch] = useState('')
  const [steamSort, setSteamSort] = useState<'title' | 'playtime' | 'last_played'>('title')
  const [steamInstallFilter, setSteamInstallFilter] = useState<'all' | 'installed' | 'not_installed'>('all')
  const [steamGenreFilter, setSteamGenreFilter] = useState('')
  const [steamVisibleCount, setSteamVisibleCount] = useState(60)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddGameOpen, setIsAddGameOpen] = useState(false)
  const [themePreference, setThemePreference] = useState<'system' | 'dark' | 'light'>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark')
  const [locale, setLocale] = useState<'en' | 'de'>('en')
  const [sessionStart] = useState(() => Date.now())
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0)
  const [memoryInfo, setMemoryInfo] = useState<{ usedJSHeapSize?: number; totalJSHeapSize?: number } | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showTutorialIntro, setShowTutorialIntro] = useState(false)
  const [activeTutorial, setActiveTutorial] = useState<'accounts' | 'library' | 'social' | 'discord' | null>(null)
  const [showWelcomeIntro, setShowWelcomeIntro] = useState(true)
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false)
  const [introData, setIntroData] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'couch'>(() => {
    if (typeof window !== 'undefined') {
      return (window.localStorage.getItem('playhub:viewMode') as 'grid' | 'couch') || 'grid'
    }
    return 'grid'
  })
  const [timeFilter, setTimeFilter] = useState<'all' | 'short' | 'medium' | 'long' | 'hltb'>(() => {
    if (typeof window !== 'undefined') {
        return (window.localStorage.getItem('playhub:timeFilter') as any) || 'all'
    }
    return 'all'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem('playhub:timeFilter', timeFilter)
    }
  }, [timeFilter])

  const [showOnboardingHints, setShowOnboardingHints] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('playhub:showOnboardingHints')
      return stored !== 'false'
    }
    return true
  })

  const handleDismissOnboardingHints = () => {
    setShowOnboardingHints(false)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('playhub:showOnboardingHints', 'false')
    }
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('playhub:sidebarOpen')
      return stored !== 'false'
    }
    return true
  })

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      const newState = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('playhub:sidebarOpen', String(newState))
      }
      return newState
    })
  }

  const toggleViewMode = () => {
    setViewMode(prev => {
      const newState = prev === 'grid' ? 'couch' : 'grid'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('playhub:viewMode', newState)
      }
      // Auto-collapse sidebar in couch mode
      if (newState === 'couch') {
        setIsSidebarOpen(false)
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('playhub:sidebarOpen', 'false')
        }
      }
      return newState
    })
  }

  const handleLogin = (u: any, notification?: { title: string; body: string }, isNewUser: boolean = false) => {
    setUser(u)
    if (notification) {
      setNotification(notification)
      setTimeout(() => setNotification(null), 5000)
    }
    if (isNewUser) {
        setActiveTab('dashboard')
        setShowRegistrationSuccess(true)
        if (typeof window !== 'undefined') {
             window.localStorage.setItem('playhub:onboardingSeen', 'true')
        }
    }
  }

  const homeStats = useMemo(() => {
    const base = activePlatform ? platformGames : games
    if (!base || base.length === 0) {
      return {
        total: 0,
        installed: 0,
        backlogCount: 0,
        playingCount: 0,
        completedCount: 0,
        totalPlaytimeHours: 0,
        recentlyPlayed: [] as any[],
        continuePlaying: [] as any[]
      }
    }

    const total = base.length
    const installed = base.filter(g => g.is_installed).length
    const backlogCount = base.filter(g => g.status_tag === 'Backlog').length
    const playingCount = base.filter(g => g.status_tag === 'Playing').length
    const completedCount = base.filter(g => g.status_tag === 'Completed').length
    const totalPlaytimeSeconds = base.reduce((acc, g) => acc + (g.playtime_seconds || 0), 0)
    const totalPlaytimeHours = Math.round(totalPlaytimeSeconds / 3600)

    const playable = base.filter(g => g.is_installed)
    const recentlyPlayed = playable
      .filter(g => g.last_played)
      .sort((a, b) => new Date(b.last_played).getTime() - new Date(a.last_played).getTime())
      .slice(0, 6)

    const continuePlaying = playable
      .filter(g => g.status_tag === 'Playing')
      .sort((a, b) => new Date(b.last_played || 0).getTime() - new Date(a.last_played || 0).getTime())
      .slice(0, 6)

    return {
      total,
      installed,
      backlogCount,
      playingCount,
      completedCount,
      totalPlaytimeHours,
      recentlyPlayed,
      continuePlaying
    }
  }, [games, platformGames, activePlatform])

  const selectedGameData = useMemo(() => {
    if (!selectedGameId) return undefined
    return games.find(g => g.id === selectedGameId) || 
           platformGames.find(g => g.id === selectedGameId) ||
           steamGames.find(g => g.id === selectedGameId) ||
           gogGames.find(g => g.id === selectedGameId)
  }, [selectedGameId, games, platformGames, steamGames, gogGames])

  const [isAppInitialized, setIsAppInitialized] = useState(false)

  useEffect(() => {
    let isMounted = true
    const initApp = async () => {
      try {
        const token = window.localStorage.getItem('playhub_session')
        
        // Helper to prevent infinite blocking
        const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
          return Promise.race([
            promise,
            new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
          ])
        }

        const u = await withTimeout(electron.ipcRenderer.invoke('auth:check', { token }), 5000, null)
        if (u) {
          if (isMounted) setUser(u)
          if (typeof window !== 'undefined') {
            const onboardingSeen = window.localStorage.getItem('playhub:onboardingSeen')
            if (!onboardingSeen) {
              if (isMounted) setShowTutorialIntro(true)
            }
          }
        }

        // Perform initial scan in background
        electron.ipcRenderer.invoke('steam:scan').catch(console.error)

        // Sync news and data in background
        electron.ipcRenderer.invoke('news:sync').catch((err: any) => {
          console.warn('News sync failed', err)
        })

        // Pre-load data with timeouts
        const initialGames = await withTimeout(electron.ipcRenderer.invoke('library:get', 'all'), 5000, [])
        if (isMounted) setGames(initialGames)

        const initialNews = await withTimeout(electron.ipcRenderer.invoke('news:get'), 3000, [])
        if (isMounted) setNews(initialNews)

        // Fetch intro suggestions to prevent flash
        try {
            const suggestions = await withTimeout<any>(electron.ipcRenderer.invoke('game:get-intro-suggestions'), 3000, null)
            if (suggestions && (suggestions.lastPlayed || suggestions.random)) {
                if (isMounted) {
                  setIntroData(suggestions)
                  setShowWelcomeIntro(true)
                }
            } else {
                if (isMounted) setShowWelcomeIntro(false)
            }
        } catch (e) {
            console.warn('Failed to fetch intro suggestions', e)
            if (isMounted) setShowWelcomeIntro(false)
        }

        // Sync tray behavior
        const minimizeToTray = window.localStorage.getItem('playhub:minimizeToTray')
        // Default to true if not set
        const shouldMinimize = minimizeToTray !== 'false'
        window.electron.ipcRenderer.send('settings:update-tray-behavior', shouldMinimize)

        // Signal main process that we are ready
        window.electron.ipcRenderer.send('app:initialized')
        if (isMounted) setIsAppInitialized(true)
      } catch (e) {
        console.error('Initialization failed', e)
        // Ensure we don't get stuck in intro mode if initialization fails
        if (isMounted) setShowWelcomeIntro(false)
        // Even if it fails, we should probably show the app
        window.electron.ipcRenderer.send('app:initialized')
        if (isMounted) setIsAppInitialized(true)
      }
    }
    
    initApp()

    // Safety timeout to ensure app always loads
    const safetyTimeout = setTimeout(() => {
        if (isMounted) {
            setIsAppInitialized((prev) => {
                if (!prev) {
                    console.warn('Initialization timed out, forcing load')
                    window.electron.ipcRenderer.send('app:initialized')
                    return true
                }
                return prev
            })
        }
    }, 5000)

    const storedTheme = window.localStorage.getItem('playhub:theme')
    if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system') {
      setThemePreference(storedTheme)
    } else {
      setThemePreference('system')
    }

    const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en'
    const storedLocale = window.localStorage.getItem('playhub:locale') as 'en' | 'de' | null
    if (storedLocale === 'en' || storedLocale === 'de') {
      setLocale(storedLocale)
      i18n.changeLanguage(storedLocale)
    } else if (browserLang.toLowerCase().startsWith('de')) {
      setLocale('de')
      i18n.changeLanguage('de')
    } else {
      setLocale('en')
      i18n.changeLanguage('en')
    }

    const timer = setInterval(() => setGreeting(getGreeting()), 60000)

    const handleNotification = (_: any, data: { title: string, body: string }) => {
      setNotification(data)
      setTimeout(() => setNotification(null), 5000)
    }
    electron.ipcRenderer.on('notification:new', handleNotification)

    return () => {
      isMounted = false
      clearTimeout(safetyTimeout)
      clearInterval(timer)
      electron.ipcRenderer.removeListener('notification:new', handleNotification)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setSessionElapsedSeconds(Math.floor((Date.now() - sessionStart) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [sessionStart])

  useEffect(() => {
    const anyPerf: any = performance
    if (!anyPerf || !anyPerf.memory) return
    const update = () => {
      const mem = anyPerf.memory
      setMemoryInfo({
        usedJSHeapSize: mem.usedJSHeapSize,
        totalJSHeapSize: mem.totalJSHeapSize
      })
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (user) {
        refreshData()
    }
  }, [user, libraryFilter, activeTab])



  useEffect(() => {
    if (activeTab === 'steam-games') {
      loadSteamGames()
    } else if (activeTab === 'gog-games') {
      loadGogGames()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'social' && friends.length > 0 && !selectedFriendId) {
      setSelectedFriendId(friends[0].id)
    }
  }, [activeTab, friends, selectedFriendId])

  useEffect(() => {
    if (activeTab !== 'social' || !user || !selectedFriendId) return

    let cancelled = false
    const load = async () => {
      setIsLoadingMessages(true)
      try {
        const data = await electron.ipcRenderer.invoke('social:get-messages', {
          ownerId: user.id,
          friendId: selectedFriendId
        })
        if (!cancelled) {
          setMessages(data || [])
        }
      } catch (e) {
        console.error('Failed to load messages', e)
        if (!cancelled) {
          setMessages([])
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [activeTab, user, selectedFriendId])

  const [isNewsSyncing, setIsNewsSyncing] = useState(false)

  const refreshData = async () => {
    try {
      // Always refresh tags
      electron.ipcRenderer.invoke('tags:get-all').then(setAllTags).catch(console.error)

      if (activeTab === 'home') {
        const data = await electron.ipcRenderer.invoke('library:get', libraryFilter)
        setGames(data)
      } else if (activeTab === 'news') {
        // Just fetch local data first
        const data = await electron.ipcRenderer.invoke('news:get')
        setNews(data)
      } else if (activeTab === 'social') {
        // Try to sync Steam friends first
        try {
            const _ = await electron.ipcRenderer.invoke('steam:sync-friends')
        } catch (e) {
            console.warn('Steam friend sync skipped/failed', e)
        }
        const data = await electron.ipcRenderer.invoke('friends:get')
        setFriends(data || [])
      } else if (activeTab === 'inventory') {
        const data = await electron.ipcRenderer.invoke('steam:get-inventory')
        setInventoryItems(data)
      }
    } catch (e) {
      console.error('Failed to refresh data', e)
    }
  }

  const loadSteamGames = async () => {
    try {
      setIsLoadingSteamGames(true)
      setSteamGamesError(null)
      const data = await electron.ipcRenderer.invoke('library:get', 'steam')
      const normalized = (data || []).map((g: any) => {
        let metadata = g.metadata
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata)
          } catch {
            metadata = null
          }
        }
        return { ...g, metadata }
      })
      setSteamGames(normalized)
      setSteamVisibleCount(60)
    } catch (e: any) {
      console.error('Failed to load Steam games', e)
      setSteamGamesError(i18n.t('errors.steamLibraryLoad'))
      setSteamGames([])
    } finally {
      setIsLoadingSteamGames(false)
    }
  }

  const loadGogGames = async () => {
    try {
      setIsLoadingGogGames(true)
      setGogGamesError(null)
      const data = await electron.ipcRenderer.invoke('library:get', 'gog')
      const normalized = (data || []).map((g: any) => {
        let metadata = g.metadata
        if (typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata)
          } catch {
            metadata = null
          }
        }
        return { ...g, metadata }
      })
      setGogGames(normalized)
    } catch (e: any) {
      console.error('Failed to load GOG games', e)
      setGogGamesError(i18n.t('errors.gogLibraryLoad', 'Failed to load GOG library'))
      setGogGames([])
    } finally {
      setIsLoadingGogGames(false)
    }
  }

  const loadPlatformGames = async (platform: string | null) => {
    if (!platform) {
      setPlatformGames([])
      setPlatformError(null)
      return
    }
    setIsLoadingPlatformGames(true)
    setPlatformError(null)
    try {
      const data = await electron.ipcRenderer.invoke('library:get', 'all')
      const filtered = (data || []).filter((g: any) => {
        if (platform === 'steam') return g.id?.startsWith('steam_') || g.platform === 'steam'
        return g.platform === platform
      })
      setPlatformGames(filtered)
    } catch (e: any) {
      console.error('Failed to load platform games', e)
      setPlatformError(i18n.t('errors.platformGamesLoad'))
    } finally {
      setIsLoadingPlatformGames(false)
    }
  }

  const toggleFavorite = async (gameId: string) => {
    await electron.ipcRenderer.invoke('library:toggle-favorite', gameId)
    refreshData()
  }



  const handleSocialAddFriend = async (name: string) => {
    try {
      await electron.ipcRenderer.invoke('friends:add-local', { username: name })
      await refreshData()
    } catch (err) {
      console.error('Failed to add local friend', err)
    }
  }



  const handleSocialSendMessage = async (body: string) => {
    if (!user || !selectedFriendId || !body.trim()) return
    const friend = friends.find(f => f.id === selectedFriendId)
    if (!friend) return
    setIsSendingMessage(true)
    try {
      const msg = await electron.ipcRenderer.invoke('social:send-message', {
        ownerId: user.id,
        friendId: friend.id,
        platform: friend.platform || null,
        body: body.trim(),
        isQuick: false
      })
      setMessages(prev => [...prev, msg])
    } catch (err) {
      console.error('Failed to send message', err)
    } finally {
      setIsSendingMessage(false)
    }
  }

  const handleLogout = async () => {
    const token = window.localStorage.getItem('playhub_session')
    await electron.ipcRenderer.invoke('auth:logout', { token })
    window.localStorage.removeItem('playhub_session')
    setUser(null)
    setIsSettingsOpen(false)
  }

  const handleAccountDisconnected = () => {
    window.localStorage.removeItem('playhub_session')
    setUser(null)
    setIsSettingsOpen(false)
  }

  const handleSteamPlay = async (gameId: string) => {
    await electron.ipcRenderer.invoke('game:launch', gameId)
  }

  const handleSteamRefresh = async () => {
    try {
        setIsLoadingSteamGames(true)
        await electron.ipcRenderer.invoke('steam:scan')
        await loadSteamGames()
    } catch (e) {
        console.error('Failed to refresh Steam games', e)
    } finally {
        setIsLoadingSteamGames(false)
    }
  }

  const handleGogRefresh = async () => {
    try {
        setIsLoadingGogGames(true)
        const status = await electron.ipcRenderer.invoke('gog:get-status')
        if (status.connected && status.gogId) {
             const result = await electron.ipcRenderer.invoke('gog:sync', { gogId: status.gogId })
             if (!result.success) {
                 setNotification({ title: 'GOG Sync Error', body: result.error || 'Unknown error' })
                 setTimeout(() => setNotification(null), 5000)
             }
             await loadGogGames()
        }
    } catch (e: any) {
        console.error('Failed to refresh GOG games', e)
        setNotification({ title: 'GOG Refresh Failed', body: e.message })
        setTimeout(() => setNotification(null), 5000)
    } finally {
        setIsLoadingGogGames(false)
    }
  }

  const handleGogInstallToggle = async (game: any) => {
    if (game.is_installed) {
      await electron.ipcRenderer.invoke('game:uninstall', game.id)
    } else {
      await electron.ipcRenderer.invoke('game:install', game.id)
    }
    // GOG status update depends on Galaxy, so we can't reliably scan immediately.
    // But we can refresh the view in case local state changed (e.g. optimistic update if implemented later)
    if (activeTab === 'gog-games') {
      loadGogGames()
    } else {
      refreshData()
    }
  }

  const handleSteamInstallToggle = async (game: any) => {
    if (game.is_installed) {
      await electron.ipcRenderer.invoke('game:uninstall', game.id)
    } else {
      await electron.ipcRenderer.invoke('game:install', game.id)
    }
    await electron.ipcRenderer.invoke('steam:scan')
    if (activeTab === 'steam-games') {
      loadSteamGames()
    } else {
      refreshData()
    }
  }

  const handleSteamStore = async (gameId: string) => {
    await electron.ipcRenderer.invoke('game:open-store', gameId)
  }

  const handleSteamAchievements = async (gameId: string) => {
    await electron.ipcRenderer.invoke('game:view-achievements', gameId)
  }

  const handleChangeStatus = async (gameId: string, status: string | null) => {
    try {
      await electron.ipcRenderer.invoke('game:set-status', { gameId, status })
      await refreshData()
    } catch (e) {
      console.error('Failed to change game status', e)
    }
  }

  const filteredHomeGames = useMemo(() => {
    const base = activePlatform ? platformGames : games
    let result = base
    const raw = searchQuery.trim()
    if (!raw) return result

    const tokens = raw.split(/\s+/)
    let statusFilter: string | null = null
    let platformFilter: string | null = null
    const textTokens: string[] = []

    tokens.forEach((token) => {
      const lower = token.toLowerCase()
      if (lower.startsWith('status:')) {
        statusFilter = lower.slice('status:'.length)
      } else if (lower.startsWith('platform:')) {
        platformFilter = lower.slice('platform:'.length)
      } else {
        textTokens.push(token)
      }
    })

    if (statusFilter) {
      result = result.filter((g: any) => g.status_tag && String(g.status_tag).toLowerCase().includes(statusFilter as string))
    }

    if (platformFilter) {
      result = result.filter((g: any) => g.platform && String(g.platform).toLowerCase().includes(platformFilter as string))
    }

    if (timeFilter !== 'all') {
        result = result.filter((g: any) => {
            const time = g.hltb_main || 0
            if (timeFilter === 'hltb') return time > 0
            if (timeFilter === 'short') return time > 0 && time <= 5
            if (timeFilter === 'medium') return time > 5 && time <= 20
            if (timeFilter === 'long') return time > 20
            return true
        })
    }

    if (!textTokens.length) return result

    const textQuery = textTokens.join(' ').toLowerCase()
    return result.filter((g: any) => {
      if (g.title && g.title.toLowerCase().includes(textQuery)) return true
      if (g.status_tag && g.status_tag.toLowerCase().includes(textQuery)) return true
      if (g.platform && String(g.platform).toLowerCase().includes(textQuery)) return true
      return false
    })
  }, [games, platformGames, activePlatform, searchQuery])

  return (
    <div className="h-screen w-screen flex flex-col bg-transparent text-slate-50 font-sans overflow-hidden relative">
      {/* Loading Overlay */}
      {!isAppInitialized && (
        <div className="absolute inset-0 z-[10000] flex flex-col items-center justify-center bg-slate-950 text-white">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-lg text-slate-400">Initializing PlayHub...</div>
        </div>
      )}

      {/* Animated Background Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-600/40 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-500/40 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-primary-700/40 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-slate-950/40 to-slate-950/60" />
      </div>

      <div className={clsx(
        "w-full transition-opacity duration-1000 ease-in-out relative z-[9999]",
        showWelcomeIntro ? "opacity-0 pointer-events-none" : "opacity-100"
      )}>
        <TitleBar 
          user={user} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          onAddGame={() => setIsAddGameOpen(true)}
          showTutorial={activeTutorial === 'accounts'}
          onTutorialNext={() => setActiveTutorial('library')}
          onTutorialSkip={() => setActiveTutorial(null)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTutorial={activeTutorial}
          onTutorialDiscord={() => setActiveTutorial('discord')}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
          viewMode={viewMode}
          onToggleViewMode={toggleViewMode}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
        />
      </div>

      <div className="flex-1 flex overflow-hidden relative z-10 w-full h-full">
      {!user ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <>
      {showRegistrationSuccess && (
        <RegistrationSuccess onComplete={() => {
          setShowRegistrationSuccess(false)
          setShowTutorialIntro(true)
        }} />
      )}
      {!showRegistrationSuccess && showWelcomeIntro && (
        <WelcomeIntro 
          username={user.username} 
          onComplete={() => setShowWelcomeIntro(false)} 
          onSelectGame={(id) => {
            setSelectedGameId(id)
            setShowWelcomeIntro(false)
          }}
          initialData={introData}
        />
      )}
      {showTutorialIntro && (
        <div className="absolute inset-0 z-40 flex items-start justify-center pointer-events-none">
          <div className="mt-24 w-full max-w-md px-4 pointer-events-auto">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 shadow-2xl text-sm text-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-1">
                    {t('app.onboarding.introLabel')}
                  </div>
                  <div className="text-base font-semibold mb-1">
                    {t('app.onboarding.introTitle')}
                  </div>
                  <div className="text-[13px] text-slate-300">
                    {t('app.onboarding.introBody')}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowTutorialIntro(false)
                    setActiveTutorial('accounts')
                  }}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs font-medium text-white"
                >
                  {t('app.onboarding.introStart')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <SettingsModal 
        user={user} 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onLogout={handleLogout}
        onUserUpdated={setUser}
        onDisconnected={handleAccountDisconnected}
        onResetOnboarding={() => {
          setIsSettingsOpen(false)
          setShowTutorialIntro(true)
        }}
      />
      <GameDetailsModal 
        gameId={selectedGameId}
        initialGameData={selectedGameData}
        isOpen={!!selectedGameId}
        onClose={() => {
          setSelectedGameId(null)
          // Refresh tags in case they were modified
          electron.ipcRenderer.invoke('tags:get-all').then(setAllTags).catch(console.error)
        }}
      />
      <AddGameModal 
        isOpen={isAddGameOpen} 
        onClose={() => setIsAddGameOpen(false)} 
        onGameAdded={() => {
          refreshData()
          setIsAddGameOpen(false)
        }} 
      />
      <div className={clsx(
        "relative z-10 glass-panel border-r-0 rounded-2xl flex flex-col flex-shrink-0 select-none overflow-hidden transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-64 m-4 p-4" : "w-0 m-0 p-0 border-none opacity-0"
      )}>
        <div className="px-2 cursor-pointer mb-6" onClick={() => setActiveTab('home')}>
            <Logo className="h-10 w-auto" />
        </div>
        
        <div className="flex-1 overflow-y-auto min-h-0 space-y-6 scrollbar-hide">
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

        {DISCORD_INVITE_URL && (
          <div className="pt-4 mt-4 border-t border-slate-800/50 flex-shrink-0">
             <button
              type="button"
              onClick={() => {
                if (!DISCORD_INVITE_URL) return
                if (electron.shell && electron.shell.openExternal) {
                  electron.shell.openExternal(DISCORD_INVITE_URL)
                } else {
                  window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer')
                }
              }}
              className="relative w-full group overflow-hidden rounded-xl bg-[#5865F2]/10 hover:bg-[#5865F2] border border-[#5865F2]/20 hover:border-[#5865F2] transition-all duration-300 p-3 flex items-center gap-3"
              title={t('app.topbar.joinDiscordTitle')}
            >
              <div className="w-8 h-8 rounded-lg bg-[#5865F2]/20 group-hover:bg-white/20 flex items-center justify-center text-[#5865F2] group-hover:text-white transition-colors">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="currentColor"
                >
                   <path d="M20.317 4.369A18.16 18.16 0 0 0 16.558 3a12.5 12.5 0 0 0-.6 1.237 16.63 16.63 0 0 0-3.918 0A12.5 12.5 0 0 0 11.44 3a18.23 18.23 0 0 0-3.76 1.376C4.18 9.123 3.38 13.707 3.73 18.237A18.52 18.52 0 0 0 8.06 20a12.9 12.9 0 0 0 1.04-1.687 11.68 11.68 0 0 1-1.65-.8c.14-.1.278-.205.41-.313 3.176 1.488 6.61 1.488 9.75 0 .134.108.272.213.41.313-.53.32-1.087.59-1.668.8A12.9 12.9 0 0 0 15.94 20a18.46 18.46 0 0 0 4.33-1.763c.355-4.27-.61-8.82-3.953-13.868ZM9.68 14.61c-.9 0-1.64-.82-1.64-1.828s.72-1.828 1.64-1.828c.92 0 1.66.824 1.64 1.828 0 1.008-.72 1.828-1.64 1.828Zm4.64 0c-.9 0-1.64-.82-1.64-1.828s.72-1.828 1.64-1.828c.92 0 1.66.824 1.64 1.828 0 1.008-.72 1.828-1.64 1.828Z" />
                </svg>
              </div>
              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-bold text-[#5865F2] group-hover:text-white transition-colors">Discord</span>
                <span className="text-[10px] text-slate-400 group-hover:text-primary-100 transition-colors">Join Community</span>
              </div>
              
              {activeTutorial === 'discord' && (
                <div className="absolute bottom-full left-0 w-64 mb-4 z-50">
                   <div className="relative bg-slate-900 border border-primary-500/60 rounded-xl px-3 py-2 shadow-lg text-xs text-slate-100">
                    <div className="absolute -bottom-2 left-8 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-primary-200">
                        {t('app.onboarding.socialTitle')}
                      </div>
                      <div className="text-[10px] text-slate-400 border border-slate-600 rounded-full px-2 py-0.5">
                        4 / 4
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      {t('app.onboarding.socialDiscordHint')}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTutorial(null);
                      }}
                      className="mt-2 inline-flex items-center px-2 py-1 rounded bg-emerald-600/80 text-[10px] font-medium text-white hover:bg-emerald-500"
                    >
                      {t('app.onboarding.finishTutorial')}
                    </button>
                  </div>
                </div>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 mr-4 my-4 gap-4">
        
        {/* Scrollable Content */}
        <div className={clsx("flex-1 relative z-10 rounded-2xl", (activeTab === 'social' || activeTab === 'dashboard') ? "flex flex-col p-0 overflow-hidden glass-panel" : "px-4 pb-4 overflow-y-auto custom-scrollbar")}>
            {activeTab === 'dashboard' && (
              <Dashboard 
                user={user}
                onNavigate={(tab, filter) => {
                  setActiveTab(tab)
                  if (filter) setLibraryFilter(filter)
                }}
                onPlayGame={async (gameId) => {
                  await electron.ipcRenderer.invoke('game:launch', gameId)
                }}
                onSelectGame={setSelectedGameId}
                viewMode={viewMode}
                onToggleViewMode={toggleViewMode}
                timeFilter={timeFilter}
                onTimeFilterChange={setTimeFilter}
                showOnboardingHints={showOnboardingHints}
                onDismissOnboardingHints={handleDismissOnboardingHints}
                onboardingStats={homeStats}
                hasTags={allTags.length > 0}
              />
            )}

            {activeTab === 'home' && (
                <>
                    {/* Onboarding Hints also shown on Home if desired, but maybe user wants it only on Dashboard. 
                        Let's keep it here too for now as it was original behavior, or remove it if redundant.
                        User asked for "Dashboard Onboarding Hints". 
                        I will COMMENT OUT the one in Home tab to avoid duplication if they switch tabs. 
                        Or keep it. If I dismiss it, it dismisses everywhere (state is shared).
                        Let's keep it for maximum visibility unless user complains.
                    */}
                    {showOnboardingHints && (
                      <OnboardingHints 
                        stats={homeStats} 
                        hasTags={allTags.length > 0} 
                        onDismiss={handleDismissOnboardingHints} 
                      />
                    )}
                    <header className="mb-8 mt-2">
                        <h2 className="text-4xl mb-2 flex items-center gap-2">
                            <span className="font-light text-slate-200 tracking-tight">{greeting},</span>
                            <span className="font-bold text-white drop-shadow-md">{user.username}</span>
                        </h2>
                        <p className="text-slate-400 text-lg font-light tracking-wide">
                            {libraryFilter === 'all' && t('app.home.heroAll')}
                            {libraryFilter === 'favorites' && t('app.home.heroFavorites')}
                            {libraryFilter === 'installed' && t('app.home.heroInstalled')}
                        </p>
                    </header>

                    {homeStats.total > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="glass-panel rounded-xl p-4 hover:bg-slate-800/40 transition-all duration-300 group">
                          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold group-hover:text-primary-400 transition-colors">{t('app.home.totalGames')}</div>
                          <div className="mt-1 text-3xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{homeStats.total}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {t('app.home.installedCount', { count: homeStats.installed })}
                          </div>
                        </div>
                        <div className="glass-panel rounded-xl p-4 hover:bg-slate-800/40 transition-all duration-300 group">
                          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold group-hover:text-amber-400 transition-colors">{t('app.home.backlog')}</div>
                          <div className="mt-1 text-3xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{homeStats.backlogCount}</div>
                          <div className="mt-1 text-xs text-slate-500">{t('app.home.backlogSubtitle')}</div>
                        </div>
                        <div className="glass-panel rounded-xl p-4 hover:bg-slate-800/40 transition-all duration-300 group">
                          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold group-hover:text-emerald-400 transition-colors">{t('app.home.currentlyPlaying')}</div>
                          <div className="mt-1 text-3xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{homeStats.playingCount}</div>
                          <div className="mt-1 text-xs text-slate-500">{t('app.home.currentlyPlayingSubtitle')}</div>
                        </div>
                        <div className="glass-panel rounded-xl p-4 hover:bg-slate-800/40 transition-all duration-300 group">
                          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold group-hover:text-purple-400 transition-colors">{t('app.home.hoursPlayed')}</div>
                          <div className="mt-1 text-3xl font-bold text-white group-hover:scale-105 transition-transform origin-left">{homeStats.totalPlaytimeHours}</div>
                          <div className="mt-1 text-xs text-slate-500">{t('app.home.hoursPlayedSubtitle')}</div>
                        </div>
                      </div>
                    )}

                    {(homeStats.continuePlaying.length > 0 || homeStats.backlogCount > 0) && (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
                        {homeStats.continuePlaying.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-semibold text-slate-200">{t('app.home.continuePlaying')}</h3>
                            </div>
                            <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                              {homeStats.continuePlaying.map((g: any) => (
                                <button
                                  key={g.id}
                                  onClick={() => setSelectedGameId(g.id)}
                                  className="min-w-[180px] bg-slate-900/70 border border-slate-800 rounded-lg p-3 flex gap-3 hover:border-primary-500/60 transition-colors"
                                >
                                  <div className="w-12 h-16 rounded bg-slate-800 overflow-hidden flex-shrink-0">
                                    {g.box_art_url && (
                                      <img src={g.box_art_url} className="w-full h-full object-cover" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-white truncate">{g.title}</div>
                                    <div className="text-xs text-slate-400 mt-1">
                                      {g.playtime_seconds
                                        ? t('app.home.continuePlayingPlayed', {
                                            hours: Math.round(g.playtime_seconds / 3600)
                                          })
                                        : t('app.home.continuePlayingGettingStarted')}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {homeStats.backlogCount > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="text-sm font-semibold text-slate-200">{t('app.home.backlogTitle')}</h3>
                            </div>
                            <div className="flex flex-col gap-2">
                              {filteredHomeGames
                                .filter((g: any) => g.status_tag === 'Backlog')
                                .slice(0, 6)
                                .map((g: any) => (
                                  <button
                                    key={g.id}
                                    onClick={() => setSelectedGameId(g.id)}
                                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/80 text-left border border-slate-800/80"
                                  >
                                    <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden flex-shrink-0">
                                      {g.box_art_url && (
                                        <img src={g.box_art_url} className="w-full h-full object-cover" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-white truncate">{g.title}</div>
                                      <div className="text-xs text-slate-500">
                                        {g.is_installed ? t('app.home.backlogReady') : t('app.home.backlogNotInstalled')}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {filteredHomeGames.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <p className="text-xl">{t('app.home.noGamesTitle')}</p>
                            <p className="text-sm mt-2">{t('app.home.noGamesSubtitle')}</p>
                        </div>
                    ) : (
                        <div className="flex gap-6">
                          {activePlatform && (
                            <div className="w-72 flex-shrink-0 space-y-4">
                              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-9 h-9 rounded bg-[#171a21] flex items-center justify-center text-xs font-semibold">
                                    {t('app.sidebar.steam')}
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">{t('app.sidebar.steamAccount')}</div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                      <span>{t('app.sidebar.steamConnected')}</span>
                                    </div>
                                  </div>
                                </div>
                                {isLoadingPlatformGames ? (
                                  <div className="text-xs text-slate-500 flex items-center gap-2">
                                    <span className="inline-block w-3 h-3 border-2 border-slate-500/50 border-t-transparent rounded-full animate-spin" />
                                    {t('app.platformPanel.loadingGames')}
                                  </div>
                                ) : platformError ? (
                                  <div className="text-xs text-red-400">{platformError}</div>
                                ) : (
                                  <div className="text-xs text-slate-400">
                                    {t('app.platformPanel.gamesLinked', { count: platformGames.length })}
                                  </div>
                                )}
                              </div>
                              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl h-[420px] overflow-y-auto custom-scrollbar">
                                {isLoadingPlatformGames ? (
                                  <div className="text-xs text-slate-500">{t('app.platformPanel.loadingGames')}</div>
                                ) : platformGames.length === 0 ? (
                                  <div className="text-xs text-slate-500">
                                    {t('app.platformPanel.noGames')}
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {platformGames.map(game => (
                                      <button
                                        key={game.id}
                                        onClick={() => setSelectedGameId(game.id)}
                                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/80 text-left"
                                      >
                                        <div className="w-10 h-14 bg-slate-800 rounded overflow-hidden flex-shrink-0">
                                          {game.box_art_url && (
                                            <img src={game.box_art_url} className="w-full h-full object-cover" />
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-xs font-semibold truncate">{game.title}</div>
                                          <div className="text-[10px] text-slate-400 truncate">
                                            {game.playtime_seconds
                                              ? t('app.platformPanel.playtimeShort', {
                                                  hours: Math.round(game.playtime_seconds / 3600)
                                                })
                                              : t('app.platformPanel.noPlaytime')}
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              await electron.ipcRenderer.invoke('game:launch', game.id)
                                            }}
                                            className="px-2 py-1 text-[10px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                                          >
                                            {t('app.platformPanel.play')}
                                          </button>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                            <div className={clsx(
                                "flex-1 grid gap-4 md:gap-6",
                                viewMode === 'couch' 
                                    ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" 
                                    : "grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
                            )}>
                            {filteredHomeGames.map((game) => (
                                <GameCard 
                                    key={game.id} 
                                    game={game} 
                                    onToggleFavorite={toggleFavorite} 
                                    onClick={setSelectedGameId}
                                    onChangeStatus={handleChangeStatus}
                                    showDetails={viewMode !== 'couch'}
                                />
                            ))}
                          </div>
                        </div>
                    )}
                </>
            )}

            {/* News tab: featured hero card + responsive grid of secondary stories */}
            {activeTab === 'social' && (
              <SocialPage
                user={user}
                friends={friends}
                selectedFriendId={selectedFriendId}
                onSelectFriend={setSelectedFriendId}
                messages={messages}
                onSendMessage={handleSocialSendMessage}
                isLoadingMessages={isLoadingMessages}
                isSendingMessage={isSendingMessage}
                onAddLocalFriend={handleSocialAddFriend}
                onRefresh={refreshData}
              />
            )}

            {activeTab === 'news' && (
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-3xl font-bold">{t('app.news.title')}</h2>
                      <button 
                        onClick={async () => {
                          setIsNewsSyncing(true)
                          try {
                            const data = await electron.ipcRenderer.invoke('news:sync')
                            setNews(data)
                          } finally {
                            setIsNewsSyncing(false)
                          }
                        }}
                        disabled={isNewsSyncing}
                        className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors disabled:opacity-50"
                        title={t('app.news.refreshTitle')}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="20" 
                          height="20" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className={isNewsSyncing ? "animate-spin text-primary-400" : "text-slate-400"}
                        >
                          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                          <path d="M3 3v5h5"/>
                          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                          <path d="M16 21h5v-5"/>
                        </svg>
                      </button>
                    </div>
                    {news.length === 0 ? (
                      <div className="text-slate-500 text-center py-16">
                        {t('app.news.empty')}
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const [featured, ...rest] = news
                          return (
                            <>
                              {featured && (
                                <button
                                  type="button"
                                  key={featured.id}
                                  className="w-full mb-8 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-primary-500/70 hover:shadow-xl hover:shadow-primary-900/30 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary-500 group"
                                  aria-label={`Read news article: ${featured.title}`}
                                  onClick={() => {
                                    if (featured.url) {
                                      if (electron.shell && electron.shell.openExternal) {
                                        electron.shell.openExternal(featured.url)
                                      } else {
                                        window.open(featured.url, '_blank', 'noopener,noreferrer')
                                      }
                                    }
                                  }}
                                >
                                  <div className="relative aspect-video bg-slate-800 overflow-hidden">
                                    {featured.image_url ? (
                                      <img
                                        src={featured.image_url}
                                        alt={featured.title}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement
                                          target.style.display = 'none'
                                          target.nextElementSibling?.classList.remove('hidden')
                                        }}
                                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                      />
                                    ) : null}
                                    <div className={clsx("w-full h-full flex items-center justify-center bg-slate-800", featured.image_url ? "hidden" : "")}>
                                      <span className="text-slate-600 text-4xl font-bold opacity-20">
                                        {(featured.title || '?')[0]}
                                      </span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                                    <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="w-7 h-7 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center text-[11px] font-semibold uppercase text-slate-200">
                                          {(featured.source || '?')[0]}
                                        </div>
                                        <div className="text-[11px] md:text-xs text-primary-300">
                                          {featured.source} • {formatRelativeTime(featured.published_at)}
                                        </div>
                                        <span className="ml-auto text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700">
                                          {t('app.news.badge')}
                                        </span>
                                      </div>
                                      <h3 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">
                                        {featured.title}
                                      </h3>
                                      <p className="text-slate-200/90 text-sm md:text-base line-clamp-3">
                                        {truncateDescription(featured.summary, 150)}
                                      </p>
                                    </div>
                                  </div>
                                </button>
                              )}

                              {rest.length > 0 && (
                                <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2" role="list">
                                  {rest.map((item) => (
                                    <button
                                      type="button"
                                      key={item.id}
                                      className="flex flex-col sm:flex-row bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-primary-500/60 hover:bg-slate-900/80 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary-500 group"
                                      role="listitem"
                                      aria-label={`Read news article: ${item.title}`}
                                      onClick={() => {
                                        if (item.url) {
                                          if (electron.shell && electron.shell.openExternal) {
                                            electron.shell.openExternal(item.url)
                                          } else {
                                            window.open(item.url, '_blank', 'noopener,noreferrer')
                                          }
                                        }
                                      }}
                                    >
                                      <div className="sm:w-40 md:w-48 aspect-video sm:aspect-auto sm:h-32 md:h-32 bg-slate-800 shrink-0 overflow-hidden relative">
                                        {item.image_url ? (
                                          <img
                                            src={item.image_url}
                                            alt={item.title}
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => {
                                              const target = e.target as HTMLImageElement
                                              target.style.display = 'none'
                                              target.nextElementSibling?.classList.remove('hidden')
                                            }}
                                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                                          />
                                        ) : null}
                                        <div className={clsx("absolute inset-0 flex items-center justify-center bg-slate-800", item.image_url ? "hidden" : "")}>
                                          <span className="text-slate-600 text-xl font-bold opacity-20">
                                            {(item.title || '?')[0]}
                                          </span>
                                        </div>
                                      </div>
                                      <div className="p-4 md:p-5 flex flex-col justify-center flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-semibold uppercase text-slate-200">
                                            {(item.source || '?')[0]}
                                          </div>
                                          <div className="text-[11px] text-primary-300">
                                            {item.source} • {formatRelativeTime(item.published_at)}
                                          </div>
                                          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-slate-900/80 text-slate-300 border border-slate-700">
                                            {t('app.news.badge')}
                                          </span>
                                        </div>
                                        <h3 className="text-base md:text-lg font-semibold text-white mb-1 line-clamp-2">
                                          {item.title}
                                        </h3>
                                        <p className="text-slate-400 text-xs md:text-sm line-clamp-2">
                                          {truncateDescription(item.summary, 150)}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </>
                    )}
                </div>
            )}
            {activeTab === 'inventory' && (
                <div className="max-w-7xl mx-auto">
                    <header className="mb-8 flex items-center justify-between">
                        <h2 className="text-3xl font-bold">{t('app.inventory.title')}</h2>
                        <div className="text-sm text-slate-400">
                            {t('app.inventory.itemsCount', { count: inventoryItems.length })}
                        </div>
                    </header>

                    {inventoryItems.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">
                            <p className="text-xl">{t('app.inventory.emptyTitle')}</p>
                            <p className="text-sm mt-2">{t('app.inventory.emptySubtitle')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {inventoryItems.map((item) => (
                                <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-all group relative">
                                    <div className="aspect-square bg-slate-950 p-4 flex items-center justify-center relative">
                                        {item.icon_url ? (
                                            <img 
                                                src={item.icon_url} 
                                                alt={item.name}
                                                className="max-w-full max-h-full object-contain drop-shadow-lg transition-transform group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="text-slate-700 text-4xl">?</div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <div className="text-xs text-slate-500 mb-1 truncate">{item.type}</div>
                                        <h3 className="font-semibold text-sm text-white truncate" title={item.name}>{item.name}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {activeTab === 'steam-games' && (
                <div className="h-full">
                    <SteamLibrary 
                      games={steamGames}
                      isLoading={isLoadingSteamGames}
                      onPlay={(id) => setSelectedGameId(id)}
                      onInstallToggle={handleSteamInstallToggle}
                      onToggleFavorite={toggleFavorite}
                      onRefresh={handleSteamRefresh}
                    />
                </div>
            )}
            {activeTab === 'gog-games' && (
            <div className="h-full">
                <GogLibrary 
                  games={gogGames}
                  isLoading={isLoadingGogGames}
                  onPlay={(id) => setSelectedGameId(id)}
                  onLaunch={(id) => electron.ipcRenderer.invoke('game:launch', id)}
                  onInstallToggle={handleGogInstallToggle}
                  onRefresh={handleGogRefresh}
                />
            </div>
          )}
        </div>
      </div>
      {notification && (
        <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm animate-in slide-in-from-bottom-2">
            <h4 className="font-bold text-sm mb-1">{notification.title}</h4>
            <p className="text-xs text-slate-300">{notification.body}</p>
        </div>
      )}
      {showOnboarding && (
        <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">{t('app.onboarding.title')}</h2>
                <p className="text-slate-400 text-sm">{t('app.onboarding.subtitle')}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xl mb-2">🧩</div>
                <div className="font-semibold mb-1 text-slate-100">{t('app.onboarding.accountsTitle')}</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  {t('app.onboarding.accountsBody')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOnboarding(false)
                    setActiveTutorial('accounts')
                  }}
                  className="mt-3 text-xs font-medium text-primary-400 hover:text-primary-300"
                >
                  {t('app.onboarding.showTutorial')}
                </button>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xl mb-2">🎮</div>
                <div className="font-semibold mb-1 text-slate-100">{t('app.onboarding.libraryTitle')}</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  {t('app.onboarding.libraryBody')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOnboarding(false)
                    setActiveTutorial('library')
                  }}
                  className="mt-3 text-xs font-medium text-primary-400 hover:text-primary-300"
                >
                  {t('app.onboarding.showTutorial')}
                </button>
              </div>
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="text-xl mb-2">👥</div>
                <div className="font-semibold mb-1 text-slate-100">{t('app.onboarding.socialTitle')}</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  {t('app.onboarding.socialBody')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowOnboarding(false)
                    setActiveTutorial('social')
                  }}
                  className="mt-3 text-xs font-medium text-primary-400 hover:text-primary-300"
                >
                  {t('app.onboarding.showTutorial')}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(true)
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('playhub:onboardingSeen', 'true')
                  }
                  setShowOnboarding(false)
                }}
                className="text-sm text-slate-300 hover:text-white underline-offset-2 hover:underline"
              >
                {t('app.onboarding.openSettings')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem('playhub:onboardingSeen', 'true')
                  }
                  setShowOnboarding(false)
                }}
                className="px-5 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-sm font-medium"
              >
                {t('app.onboarding.primaryAction')}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
      </div>
      <CouchOverlay 
        visible={viewMode === 'couch'} 
        games={filteredHomeGames} 
        onPlay={async (id) => {
            await electron.ipcRenderer.invoke('game:launch', id)
        }} 
        onClose={toggleViewMode} 
      />
    </div>
  )
}


export default App
