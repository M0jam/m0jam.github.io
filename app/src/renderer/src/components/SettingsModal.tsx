import React, { useEffect, useState } from 'react'
import clsx from 'clsx'
import { electron } from '../utils/electron'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import { BackgroundKey } from '@renderer/utils/theme'

const DISCORD_INVITE_URL: string | undefined =
  typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_DISCORD_INVITE_URL

export function shouldShowUpdateDialog(lastPromptedVersion: string | null, availableVersion: string | null): boolean {
  if (!availableVersion) return false
  if (!lastPromptedVersion) return true
  return lastPromptedVersion !== availableVersion
}

export function hasUnreadChangelog(lastSeenVersion: string | null, currentVersion: string | null): boolean {
  if (!currentVersion) return false
  if (!lastSeenVersion) return true
  return lastSeenVersion !== currentVersion
}

interface SettingsModalProps {
  user: any
  isOpen: boolean
  onClose: () => void
  onLogout: () => void
  onUserUpdated: (user: any) => void
  onDisconnected: () => void
  onResetOnboarding?: () => void
}

export function SettingsModal({ user, isOpen, onClose, onLogout, onUserUpdated, onDisconnected, onResetOnboarding }: SettingsModalProps) {
  const { 
    theme, 
    toggleTheme, 
    colorTheme, 
    setColorTheme, 
    availableThemes, 
    backgroundTheme, 
    setBackgroundTheme, 
    availableBackgrounds 
  } = useTheme()
  const { t, i18n } = useTranslation()
  const [activeTab, setActiveTab] = useState('account') // account, integrations, general
  const [steamPath, setSteamPath] = useState('C:\\Program Files (x86)\\Steam')
  const [isScanning, setIsScanning] = useState(false)
  const [steamId, setSteamId] = useState<string | null>(null)
  const [isSteamConnecting, setIsSteamConnecting] = useState(false)
  const [isSteamSyncing, setIsSteamSyncing] = useState(false)
  const [steamSyncStatus, setSteamSyncStatus] = useState('')
  const [epicId, setEpicId] = useState<string | null>(null)
  const [epicDisplayName, setEpicDisplayName] = useState<string | null>(null)
  const [isEpicConnecting, setIsEpicConnecting] = useState(false)
  const [isEpicSyncing, setIsEpicSyncing] = useState(false)
  const [epicStatusMessage, setEpicStatusMessage] = useState('')
  const [epicSyncStatus, setEpicSyncStatus] = useState('')
  const [displayName, setDisplayName] = useState(user.username)
  const [email, setEmail] = useState(user.email)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_url || null)
  const [profileError, setProfileError] = useState('')
  const [profileStatus, setProfileStatus] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [showPasswordField, setShowPasswordField] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)
  const [steamStatusMessage, setSteamStatusMessage] = useState('')
  const [updateState, setUpdateState] = useState<any | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [isDownloadingUpdate, setIsDownloadingUpdate] = useState(false)
  const [isInstallingUpdate, setIsInstallingUpdate] = useState(false)
  const [updatePrefs, setUpdatePrefs] = useState<{ autoCheck: boolean; intervalMinutes: number }>({
    autoCheck: true,
    intervalMinutes: 240
  })
  const [hasUnreadChangelogFlag, setHasUnreadChangelogFlag] = useState(false)
  const [currentVersion, setCurrentVersion] = useState<string | null>(null)
  const [isSteamDisconnecting, setIsSteamDisconnecting] = useState(false)
  
  // Disconnect Flow State
  const [disconnectStep, setDisconnectStep] = useState<'idle' | 'confirm' | 'verify'>('idle')
  const [disconnectCode, setDisconnectCode] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [syncPercent, setSyncPercent] = useState(0)
  const [steamApiKey, setSteamApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(false)
  const [isSavingKey, setIsSavingKey] = useState(false)
  const [steamScanStatus, setSteamScanStatus] = useState('')
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)
  const [updateToast, setUpdateToast] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null)
  const [remindDays, setRemindDays] = useState(3)
  const [shouldAutoInstall, setShouldAutoInstall] = useState(false)
  const [isEpicDisconnecting, setIsEpicDisconnecting] = useState(false)
  const [gogId, setGogId] = useState<string | null>(null)
  const [gogDisplayName, setGogDisplayName] = useState<string | null>(null)
  const [isGogConnecting, setIsGogConnecting] = useState(false)
  const [isGogSyncing, setIsGogSyncing] = useState(false)
  const [gogStatusMessage, setGogStatusMessage] = useState('')
  const [gogSyncStatus, setGogSyncStatus] = useState('')
  const [isGogDisconnecting, setIsGogDisconnecting] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'bug',
    content: '',
    rating: 5,
    contactEmail: user.email || ''
  })
  const [sendFeedbackToDiscord, setSendFeedbackToDiscord] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem('playhub:feedbackSendToDiscord')
    if (stored === 'false') return false
    if (stored === 'true') return true
    return true
  })
  const [discordPresenceEnabled, setDiscordPresenceEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem('playhub:discordPresenceEnabled')
    if (stored === 'false') return false
    if (stored === 'true') return true
    return true
  })
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = window.localStorage.getItem('playhub:minimizeToTray')
    if (stored === 'false') return false
    return true
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('playhub:minimizeToTray', minimizeToTray ? 'true' : 'false')
      electron.ipcRenderer.send('settings:update-tray-behavior', minimizeToTray)
    }
  }, [minimizeToTray])

  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)
  const [feedbackStatus, setFeedbackStatus] = useState('')

  const [igdbClientId, setIgdbClientId] = useState('')
  const [igdbClientSecret, setIgdbClientSecret] = useState('')
  const [isFetchingCovers, setIsFetchingCovers] = useState(false)
  const [fetchCoverStatus, setFetchCoverStatus] = useState('')

  const saveIgdbCredentials = async () => {
    await window.electron.ipcRenderer.invoke('metadata:set-credentials', {
      clientId: igdbClientId,
      clientSecret: igdbClientSecret
    })
    alert(t('settings.integrations.igdbSaved') || 'Credentials saved.')
  }

  const fetchMissingCovers = async () => {
    if (!igdbClientId || !igdbClientSecret) return
    setIsFetchingCovers(true)
    setFetchCoverStatus('Starting scan...')
    
    try {
      // First save credentials to be sure
      await window.electron.ipcRenderer.invoke('metadata:set-credentials', {
        clientId: igdbClientId,
        clientSecret: igdbClientSecret
      })
      
      const result = await window.electron.ipcRenderer.invoke('metadata:fetch-missing')
      if (result.success) {
        setFetchCoverStatus(result.message)
      } else {
        setFetchCoverStatus('Scan failed: ' + result.message)
      }
    } catch (error) {
      console.error(error)
      setFetchCoverStatus('Scan failed due to an error.')
    } finally {
      setIsFetchingCovers(false)
    }
  }
  const [systemStats, setSystemStats] = useState<any>(null)
  const [onboardingResetMessage, setOnboardingResetMessage] = useState('')
  const [showIntegrationOnboarding, setShowIntegrationOnboarding] = useState(false)
  const [backupJson, setBackupJson] = useState('')
  const [backupStatus, setBackupStatus] = useState('')
  const [isReclassifying, setIsReclassifying] = useState(false)
  const [reclassifyStatus, setReclassifyStatus] = useState('')

  const handleReclassifyAll = async () => {
    setIsReclassifying(true)
    setReclassifyStatus('Reclassifying library...')
    try {
      await electron.ipcRenderer.invoke('classification:reclassify-all')
      setReclassifyStatus('Reclassification started')
      setTimeout(() => setReclassifyStatus(''), 3000)
    } catch (e) {
      console.error(e)
      setReclassifyStatus('Failed to start reclassification')
    } finally {
      setIsReclassifying(false)
    }
  }

  useEffect(() => {
    const handleSteamProgress = (_: any, data: { message: string; percent: number }) => {
      setSteamSyncStatus(data.message)
      setSyncPercent(data.percent)
      if (data.percent < 100) {
        setIsSteamSyncing(true)
      } else {
        setIsSteamSyncing(false)
      }
    }

    const handleEpicProgress = (_: any, data: { message: string; percent: number }) => {
      setEpicSyncStatus(data.message)
      // Reuse syncPercent if we want to show a progress bar for Epic too, 
      // or create a separate epicSyncPercent state. 
      // For now, let's just update the status message which is visible in the UI.
      // If we want a progress bar, we need to add a state for it or reuse the logic carefully.
      if (data.percent < 100) {
        setIsEpicSyncing(true)
      } else {
        setIsEpicSyncing(false)
      }
    }

    try {
      electron.ipcRenderer.on('steam:sync-progress', handleSteamProgress)
      electron.ipcRenderer.on('epic:sync-progress', handleEpicProgress)
    } catch (e) {
      console.error(e)
    }

    return () => {
      try {
        electron.ipcRenderer.removeListener('steam:sync-progress', handleSteamProgress)
        electron.ipcRenderer.removeListener('epic:sync-progress', handleEpicProgress)
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return

    electron.ipcRenderer
      .invoke('steam:get-status')
      .then((status: any) => {
        if (status?.connected) {
          setSteamId(status.steamId)
          if (status.lastSynced) {
            const time = new Date(status.lastSynced).toLocaleString()
            setSteamStatusMessage(
              t('settings.messages.steamConnectedLastSync', {
                id: status.steamId,
                time
              })
            )
          } else {
            setSteamStatusMessage(
              t('settings.messages.steamConnected', {
                id: status.steamId
              })
            )
          }
        } else {
          setSteamId(null)
          setSteamStatusMessage('')
        }
      })
      .catch(() => {
        setSteamStatusMessage(t('settings.messages.steamStatusFailed'))
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    electron.ipcRenderer
      .invoke('epic:get-status')
      .then((status: any) => {
        if (status?.connected) {
          setEpicId(status.epicId)
          setEpicDisplayName(status.displayName || null)
          const label = status.displayName || status.epicId
          if (status.lastSynced) {
            const time = new Date(status.lastSynced).toLocaleString()
            setEpicStatusMessage(
              t('settings.messages.epicConnectedLastSync', {
                id: label,
                time
              })
            )
          } else {
            setEpicStatusMessage(
              t('settings.messages.epicConnected', {
                id: label
              })
            )
          }
        } else {
          setEpicId(null)
          setEpicDisplayName(null)
          setEpicStatusMessage('')
          setEpicSyncStatus('')
        }
      })
      .catch(() => {
        setEpicStatusMessage('Could not load Epic Games connection status')
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    electron.ipcRenderer
      .invoke('gog:get-status')
      .then((status: any) => {
        if (status?.connected) {
          setGogId(status.gogId)
          setGogDisplayName(status.displayName || null)
          setGogStatusMessage(t('settings.integrations.connectedMessage', { platform: 'GOG Galaxy' }))
        } else {
          setGogId(null)
          setGogDisplayName(null)
          setGogStatusMessage('')
          setGogSyncStatus('')
        }
      })
      .catch(() => {
        setGogStatusMessage('Could not load GOG connection status')
      })
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false

    const loadUpdateState = async () => {
      try {
        const [state, prefs] = await Promise.all([
          electron.ipcRenderer.invoke('update:get-state'),
          electron.ipcRenderer.invoke('update:get-preferences')
        ])
        if (cancelled) return
        setUpdateState(state)
        if (state?.currentVersion) {
          setCurrentVersion(state.currentVersion)
          const lastSeen = window.localStorage.getItem('playhub:lastChangelogVersionSeen')
          setHasUnreadChangelogFlag(hasUnreadChangelog(lastSeen, state.currentVersion))
        }
        if (prefs) {
          setUpdatePrefs({
            autoCheck: !!prefs.autoCheck,
            intervalMinutes: prefs.intervalMinutes || 240
          })
        }
      } catch (error) {
        console.error(error)
      }
    }

    loadUpdateState()

    const handler = (_event: any, state: any) => {
        setUpdateState(state)
        if (state?.currentVersion) {
          setCurrentVersion(state.currentVersion)
          const lastSeen = window.localStorage.getItem('playhub:lastChangelogVersionSeen')
          setHasUnreadChangelogFlag(hasUnreadChangelog(lastSeen, state.currentVersion))
        }
    }

    try {
      electron.ipcRenderer.on('update:status', handler)
    } catch (error) {
      console.error(error)
    }

    return () => {
      cancelled = true
      try {
        electron.ipcRenderer.removeListener('update:status', handler)
      } catch (error) {
        console.error(error)
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (!updateToast) return
    const timer = setTimeout(() => {
      setUpdateToast(null)
    }, 4000)
    return () => clearTimeout(timer)
  }, [updateToast])

  useEffect(() => {
    if (activeTab !== 'system' || !isOpen) return
    
    const fetchStats = async () => {
      try {
        const stats = await electron.ipcRenderer.invoke('system:get-stats')
        setSystemStats(stats)
      } catch (err) {
        console.error(err)
      }
    }
    
    fetchStats()
    const interval = setInterval(fetchStats, 2000)
    return () => clearInterval(interval)
  }, [activeTab, isOpen])

  useEffect(() => {
    electron.ipcRenderer
      .invoke('presence:set-enabled', discordPresenceEnabled)
      .catch(() => {})
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('playhub:discordPresenceEnabled', discordPresenceEnabled ? 'true' : 'false')
    }
  }, [discordPresenceEnabled])

  useEffect(() => {
    if (!shouldAutoInstall) return
    if (!updateState || updateState.status !== 'downloaded') return
    const install = async () => {
      try {
        await electron.ipcRenderer.invoke('update:install')
      } catch (error) {
        console.error(error)
        setUpdateToast({
          type: 'error',
          message: 'Failed to install update. Please restart PlayHub and try again.'
        })
      } finally {
        setShouldAutoInstall(false)
        setIsInstallingUpdate(false)
      }
    }
    install()
  }, [shouldAutoInstall, updateState])

  useEffect(() => {
    if (updateState?.status === 'available' && updateState.availableVersion) {
      const lastPrompted = window.localStorage.getItem('playhub:lastUpdatePromptVersion')
      if (lastPrompted !== updateState.availableVersion) {
        setShowUpdateDialog(true)
        window.localStorage.setItem('playhub:lastUpdatePromptVersion', updateState.availableVersion)
      }
    }
  }, [updateState?.status, updateState?.availableVersion])

  useEffect(() => {
    if (activeTab === 'integrations' && isOpen) {
      const loadIgdb = async () => {
        try {
          const creds = await electron.ipcRenderer.invoke('metadata:get-credentials')
          if (creds && creds.clientId) setIgdbClientId(creds.clientId)
          if (creds && creds.clientSecret) setIgdbClientSecret(creds.clientSecret)
        } catch (error) {
          console.error('Failed to load IGDB credentials:', error)
        }
      }
      loadIgdb()
    }
  }, [activeTab, isOpen])

  if (!isOpen) return null

  const handleScanSteam = async () => {
    setIsScanning(true)
    setSteamScanStatus('Scanning common Steam locations...')
    try {
      const found = await electron.ipcRenderer.invoke('steam:scan', steamPath)
      if (typeof found === 'number') {
        if (found > 0) {
          setSteamScanStatus(`Found ${found} installed Steam ${found === 1 ? 'game' : 'games'}.`)
        } else {
          setSteamScanStatus('No games found. Try adding a custom Steam path below.')
        }
      } else {
        setSteamScanStatus('Scan completed.')
      }
    } catch (e) {
      console.error(e)
      setSteamScanStatus('Scan failed. Please check the path and try again.')
    } finally {
      setIsScanning(false)
    }
  }

  const formatBytes = (bytes?: number | null) => {
    if (!bytes || bytes <= 0) return 'Unknown'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = bytes
    let unitIndex = 0
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex += 1
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`
  }

  const handleSaveApiKey = async () => {
    setIsSavingKey(true)
    try {
      await electron.ipcRenderer.invoke('steam:save-api-key', { apiKey: steamApiKey })
      setSteamStatusMessage('API Key saved successfully')
      setShowApiKeyInput(false)
    } catch (e) {
      console.error(e)
      setSteamStatusMessage('Failed to save API Key')
    } finally {
      setIsSavingKey(false)
    }
  }

  const handleSteamConnect = async () => {
    setIsSteamConnecting(true)
    setSteamStatusMessage('Opening secure Steam login...')
    try {
      const result = await electron.ipcRenderer.invoke('steam:auth')
      if (result.success) {
        setSteamId(result.steamId)
        setSteamStatusMessage('Successfully connected to Steam')
        setSteamSyncStatus('Connected as ' + result.steamId)
        if (typeof window !== 'undefined') {
          const seen = window.localStorage.getItem('playhub:postAccountOnboardingSeen')
          if (!seen) {
            setShowIntegrationOnboarding(true)
          }
        }
      } else {
        setSteamStatusMessage(result.error ? 'Connection failed: ' + result.error : 'Connection failed')
      }
    } catch (e) {
      console.error(e)
      setSteamStatusMessage('Connection error. Please check your connection and try again.')
    } finally {
      setIsSteamConnecting(false)
    }
  }

  const handleEpicConnect = async () => {
    setIsEpicConnecting(true)
    setEpicStatusMessage('Opening secure Epic Games login...')
    try {
      const result = await electron.ipcRenderer.invoke('epic:auth')
      if (result?.success) {
        setEpicId(result.epicId)
        setEpicDisplayName(result.displayName || null)
        const label = result.displayName || result.epicId
        setEpicStatusMessage('Successfully connected to Epic Games')
        setEpicSyncStatus('Connected as ' + label)
        if (typeof window !== 'undefined') {
          const seen = window.localStorage.getItem('playhub:postAccountOnboardingSeen')
          if (!seen) {
            setShowIntegrationOnboarding(true)
          }
        }
      } else {
        setEpicStatusMessage(result?.error ? 'Connection failed: ' + result.error : 'Connection failed')
      }
    } catch (e) {
      console.error(e)
      setEpicStatusMessage('Connection error. Please check your connection and try again.')
    } finally {
      setIsEpicConnecting(false)
    }
  }

  const handleSteamSync = async () => {
    if (!steamId) {
        setSteamSyncStatus('Please connect Steam account first')
        return
    }
    setIsSteamSyncing(true)
    setSteamSyncStatus('Syncing...')
    try {
      const result = await electron.ipcRenderer.invoke('steam:sync', { steamId })
      if (result.success) {
        setSteamSyncStatus(`Synced ${result.totalSynced} items (Friends, Games, Inventory)`)
      } else {
        setSteamSyncStatus('Sync failed: ' + result.error)
      }
    } catch (e) {
      setSteamSyncStatus('Sync error')
    } finally {
      setIsSteamSyncing(false)
    }
  }

  const handleEpicSync = async () => {
    if (!epicId) {
      setEpicSyncStatus('Please connect Epic Games account first')
      return
    }
    setIsEpicSyncing(true)
    setEpicSyncStatus('Syncing...')
    try {
      const result = await electron.ipcRenderer.invoke('epic:sync', { epicId })
      if (result?.success) {
        const count = typeof result.totalSynced === 'number' ? result.totalSynced : 0
        setEpicSyncStatus(`Synced ${count} Epic profile item${count === 1 ? '' : 's'}`)
      } else {
        setEpicSyncStatus('Sync failed: ' + (result?.error || 'Unknown error'))
      }
    } catch {
      setEpicSyncStatus('Sync error')
    } finally {
      setIsEpicSyncing(false)
    }
  }

  const handleSteamDisconnect = async () => {
    if (!steamId) return
    setIsSteamDisconnecting(true)
    setSteamSyncStatus('')
    setSteamStatusMessage('')
    try {
      const result = await electron.ipcRenderer.invoke('steam:disconnect')
      if (result?.success) {
        setSteamId(null)
        setSteamSyncStatus('Disconnected from Steam')
      } else {
        setSteamSyncStatus('Could not disconnect from Steam')
      }
    } catch {
      setSteamSyncStatus('Could not disconnect from Steam')
    } finally {
      setIsSteamDisconnecting(false)
    }
  }

  const handleEpicDisconnect = async () => {
    if (!epicId) return
    setIsEpicDisconnecting(true)
    setEpicSyncStatus('')
    setEpicStatusMessage('')
    try {
      const result = await electron.ipcRenderer.invoke('epic:disconnect')
      if (result?.success) {
        setEpicId(null)
        setEpicDisplayName(null)
        setEpicSyncStatus('Disconnected from Epic Games')
      } else {
        setEpicSyncStatus('Could not disconnect from Epic Games')
      }
    } catch {
      setEpicSyncStatus('Could not disconnect from Epic Games')
    } finally {
      setIsEpicDisconnecting(false)
    }
  }

  const handleGogConnect = async () => {
    setIsGogConnecting(true)
    setGogStatusMessage('')
    try {
      const result = await electron.ipcRenderer.invoke('gog:auth')
      if (result.success) {
        setGogId(result.gogId)
        setGogDisplayName(result.displayName || result.gogId)
        setGogStatusMessage(t('settings.integrations.connectedMessage', { platform: 'GOG' }))
      } else {
        setGogStatusMessage('Connection failed: ' + result.error)
      }
    } catch (e) {
      setGogStatusMessage('Connection error')
    } finally {
      setIsGogConnecting(false)
    }
  }

  const handleGogSync = async () => {
    if (!gogId) {
      setGogSyncStatus('Please connect GOG account first')
      return
    }
    setIsGogSyncing(true)
    setGogSyncStatus('Syncing...')
    try {
      const result = await electron.ipcRenderer.invoke('gog:sync', { gogId })
      if (result?.success) {
        const count = typeof result.totalSynced === 'number' ? result.totalSynced : 0
        setGogSyncStatus(`Synced ${count} GOG games`)
      } else {
        setGogSyncStatus('Sync failed: ' + (result?.error || 'Unknown error'))
      }
    } catch {
      setGogSyncStatus('Sync error')
    } finally {
      setIsGogSyncing(false)
    }
  }

  const handleGogDisconnect = async () => {
    if (!gogId) return
    setIsGogDisconnecting(true)
    setGogSyncStatus('')
    setGogStatusMessage('')
    try {
      const result = await electron.ipcRenderer.invoke('gog:disconnect')
      if (result?.success) {
        setGogId(null)
        setGogDisplayName(null)
        setGogSyncStatus('Disconnected from GOG')
      } else {
        setGogSyncStatus('Could not disconnect from GOG')
      }
    } catch {
      setGogSyncStatus('Could not disconnect from GOG')
    } finally {
      setIsGogDisconnecting(false)
    }
  }

  const handleExportSettings = async () => {
    if (typeof window === 'undefined') return
    try {
      const localKeys = [
        'playhub:theme',
        'playhub:background',
        'playhub:locale',
        'playhub:sidebarOpen',
        'playhub:onboardingSeen',
        'playhub:minimizeToTray',
        'playhub:feedbackSendToDiscord',
        'playhub:discordPresenceEnabled',
        'playhub:lastChangelogVersionSeen',
        'playhub:lastUpdatePromptVersion',
        'playhub:postAccountOnboardingSeen',
        'playhub:dashboardWidgets',
        'playhub:dashboardData'
      ]
      const localStorageSnapshot: Record<string, string> = {}
      for (const key of localKeys) {
        const value = window.localStorage.getItem(key)
        if (value !== null) {
          localStorageSnapshot[key] = value
        }
      }
      const tags = await electron.ipcRenderer.invoke('tags:get-all')
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        localStorage: localStorageSnapshot,
        tags
      }
      const json = JSON.stringify(payload, null, 2)
      setBackupJson(json)
      let copied = false
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(json)
          copied = true
        } catch (e) {
          console.error('Clipboard write failed', e)
        }
      }
      if (copied) {
        setBackupStatus(t('settings.backup.exportCopied'))
      } else {
        setBackupStatus(t('settings.backup.exportReady'))
      }
    } catch (error) {
      console.error('Failed to export settings backup', error)
      setBackupStatus(t('settings.backup.exportFailed'))
    }
  }

  const handleImportSettings = async () => {
    if (typeof window === 'undefined') return
    if (!backupJson.trim()) return
    try {
      const parsed = JSON.parse(backupJson)
      if (parsed && parsed.localStorage && typeof parsed.localStorage === 'object') {
        Object.entries(parsed.localStorage as Record<string, string>).forEach(([key, value]) => {
          window.localStorage.setItem(key, String(value))
        })
      }
      if (parsed && Array.isArray(parsed.tags)) {
        const existing = await electron.ipcRenderer.invoke('tags:get-all')
        const existingNames = new Set(
          Array.isArray(existing) ? existing.map((t: any) => String(t.name || '').toLowerCase()) : []
        )
        for (const tag of parsed.tags as any[]) {
          const name = tag && typeof tag.name === 'string' ? tag.name.trim() : ''
          if (!name) continue
          if (existingNames.has(name.toLowerCase())) continue
          await electron.ipcRenderer.invoke('tags:create', name)
        }
      }
      setBackupStatus(t('settings.backup.importSuccess'))
    } catch (error) {
      console.error('Failed to import settings backup', error)
      setBackupStatus(t('settings.backup.importFailed'))
    }
  }

  const hasProfileChanges =
    displayName !== user.username ||
    email !== user.email ||
    avatarPreview !== (user.avatar_url || null)

  const handleProfileSave = async () => {
    if (!hasProfileChanges) return
    setProfileError('')
    setProfileStatus('')
    setIsSavingProfile(true)
    try {
      const payload: any = {
        userId: user.id,
        displayName,
        email,
        avatarDataUrl: avatarPreview
      }
      if (email !== user.email || displayName !== user.username) {
        setShowPasswordField(true)
        if (!currentPassword) {
          throw new Error(t('settings.messages.profilePasswordRequired'))
        }
        payload.currentPassword = currentPassword
      }
      const updated = await electron.ipcRenderer.invoke('auth:update-profile', payload)
      if (updated) {
        onUserUpdated(updated)
        if (updated.username !== displayName.trim()) {
            setProfileStatus(t('settings.messages.usernameChanged', { newName: updated.username }))
        } else {
            setProfileStatus(t('settings.messages.profileUpdated'))
        }
        setCurrentPassword('')
        setShowPasswordField(false)
      }
    } catch (err: any) {
      setProfileError(err.message || t('settings.messages.profileUpdateFailed'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProfileError(t('settings.messages.avatarMustBeImage'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarPreview(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleInitiateDisconnect = async () => {
    setProfileError('')
    setIsSendingCode(true)
    try {
      const result = await electron.ipcRenderer.invoke('auth:initiate-disconnect', {
        userId: user.id
      })
      if (result.success) {
        setMaskedEmail(result.email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3'))
        setDisconnectStep('verify')
      }
    } catch (err: any) {
      setProfileError(err.message || t('settings.messages.initiateDisconnectFailed'))
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyDisconnect = async () => {
    setProfileError('')
    if (!disconnectCode || disconnectCode.length !== 6) {
      setProfileError(t('settings.messages.invalidCode'))
      return
    }
    setIsVerifyingCode(true)
    try {
      await electron.ipcRenderer.invoke('auth:verify-disconnect', {
        userId: user.id,
        code: disconnectCode
      })
      onDisconnected()
    } catch (err: any) {
      setProfileError(err.message || t('settings.messages.disconnectAccountFailed'))
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingFeedback(true)
    setFeedbackStatus('')
    try {
      const result = await electron.ipcRenderer.invoke('feedback:submit', {
        ...feedbackForm,
        sendToDiscord: sendFeedbackToDiscord
      })
      
      if (!result.success) {
        setFeedbackStatus(result.error || t('settings.messages.feedbackFailed'))
        return
      }

      if (result && result.remoteStatus === 'failed') {
        setFeedbackStatus(
          t('settings.messages.feedbackSavedLocal')
        )
      } else {
        setFeedbackStatus(t('settings.messages.feedbackThanks'))
      }
      setFeedbackForm(prev => ({ ...prev, content: '', rating: 5 }))
      setTimeout(() => setFeedbackStatus(''), 3000)
    } catch (err) {
      setFeedbackStatus(t('settings.messages.feedbackFailed'))
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-8 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[600px] flex overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
        <button
          type="button"
          aria-label="Close settings"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-11 h-11 flex items-center justify-center rounded-full border border-white/10 bg-black/20 text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          ✕
        </button>
        <div className="w-64 bg-black/20 border-r border-white/10 p-6 flex flex-col gap-2">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
            <span className="text-primary-500">⚙️</span> {t('settings.sidebar.title')}
          </h2>
          
          <button 
            onClick={() => setActiveTab('account')}
            className={clsx("text-left px-4 py-3 rounded-lg font-medium transition-colors", activeTab === 'account' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}
          >
            {t('settings.sidebar.account')}
          </button>
          <button 
            onClick={() => setActiveTab('integrations')}
            className={clsx("text-left px-4 py-3 rounded-lg font-medium transition-colors", activeTab === 'integrations' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}
          >
            {t('settings.sidebar.integrations')}
          </button>
          <button
            onClick={() => {
              setActiveTab('updates')
              if (currentVersion) {
                window.localStorage.setItem('playhub:lastChangelogVersionSeen', currentVersion)
                setHasUnreadChangelogFlag(false)
              }
            }}
            className={clsx(
              'text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center justify-between gap-2',
              activeTab === 'updates' ? 'bg-primary-600/10 text-primary-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <span>{t('settings.sidebar.updates')}</span>
            {hasUnreadChangelogFlag && <span className="w-2 h-2 rounded-full bg-primary-400" />}
          </button>
          <button 
            onClick={() => setActiveTab('appearance')}
            className={clsx("text-left px-4 py-3 rounded-lg font-medium transition-colors", activeTab === 'appearance' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}
          >
            {t('settings.sidebar.appearance')}
          </button>
          <button 
            onClick={() => setActiveTab('general')}
            className={clsx("text-left px-4 py-3 rounded-lg font-medium transition-colors", activeTab === 'general' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}
          >
            {t('settings.sidebar.general')}
          </button>
          <button 
            onClick={() => setActiveTab('feedback')}
            className={clsx("text-left px-4 py-3 rounded-lg font-medium transition-colors", activeTab === 'feedback' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}
          >
            {t('settings.sidebar.feedback')}
          </button>
          <button 
            onClick={() => setActiveTab('system')}
            className={clsx("text-left px-4 py-3 rounded-lg font-medium transition-colors", activeTab === 'system' ? "bg-primary-600/10 text-primary-400" : "text-slate-400 hover:bg-white/5 hover:text-white")}
          >
            {t('settings.sidebar.system')}
          </button>
        </div>

        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {activeTab === 'account' && (
            <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-bold mb-2 text-white">{t('settings.account.title')}</h3>
                <p className="text-slate-400">{t('settings.account.description')}</p>
              </header>

              <div className="flex items-center gap-6 p-6 bg-white/5 rounded-xl border border-white/10">
                <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-primary-900/20">
                  {avatarPreview ? <img src={avatarPreview} className="w-full h-full rounded-full object-cover" /> : user.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-xl font-bold text-white">{displayName}</div>
                  <div className="text-slate-400">{email}</div>
                </div>
              </div>

              <div className="max-w-md space-y-4">
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-1">{t('settings.account.displayNameLabel')}</div>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      setProfileError('')
                      setProfileStatus('')
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors placeholder-slate-600"
                  />
                  <div className="text-xs text-slate-500 mt-1">{t('settings.account.displayNameHelp')}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-300 mb-1">{t('settings.account.emailLabel')}</div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setProfileError('')
                      setProfileStatus('')
                    }}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors placeholder-slate-600"
                  />
                  <div className="text-xs text-slate-500 mt-1">{t('settings.account.emailHelp')}</div>
                </div>

                <div>
                  <div className="text-sm font-medium text-slate-300 mb-1">{t('settings.account.profilePictureLabel')}</div>
                  <div className="flex items-center gap-3">
                    <label className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium cursor-pointer hover:bg-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-colors">
                      {t('settings.account.changeAvatar')}
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                    {avatarPreview && (
                      <button
                        className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                        onClick={() => setAvatarPreview(null)}
                      >
                        {t('settings.account.removeAvatar')}
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{t('settings.account.avatarHelp')}</div>
                </div>

                {showPasswordField && (
                  <div>
                    <div className="text-sm font-medium text-slate-300 mb-1">{t('settings.account.confirmPasswordLabel')}</div>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500 transition-colors placeholder-slate-600"
                      placeholder={t('settings.account.confirmPasswordPlaceholder')}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    {profileError && <span className="text-red-400">{profileError}</span>}
                    {!profileError && profileStatus && <span className="text-green-400">{profileStatus}</span>}
                  </div>
                  <button
                    disabled={isSavingProfile || !hasProfileChanges}
                    onClick={handleProfileSave}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                  >
                    {isSavingProfile && (
                      <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                    )}
                    {t('settings.account.saveChanges')}
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-8 space-y-6">
                {DISCORD_INVITE_URL && (
                  <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-700 rounded-xl">
                    <div>
                      <div className="text-sm font-semibold text-slate-200">{t('settings.account.discordTitle')}</div>
                      <div className="text-xs text-slate-400">
                        {t('settings.account.discordDescription')}
                      </div>
                    </div>
                    <a
                      href={DISCORD_INVITE_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white transition-colors"
                    >
                      {t('settings.account.discordJoin')}
                    </a>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-red-400 mb-4">{t('settings.account.dangerZoneTitle')}</h4>
                  <div className="space-y-3">
                    <button 
                      onClick={onLogout}
                      className="px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500 hover:text-white transition-all font-medium"
                    >
                      {t('settings.account.logout')}
                    </button>
                    <div className="p-4 bg-slate-900/60 border border-red-900/40 rounded-lg space-y-3">
                      <div className="text-sm font-semibold text-red-400">{t('settings.account.disconnectDeviceTitle')}</div>
                      <p className="text-xs text-slate-400">
                        {t('settings.account.disconnectDeviceDescription')}
                      </p>
                      {disconnectStep === 'verify' ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="text-sm text-slate-300">
                            {t('settings.account.codeSentTo', { email: maskedEmail })}
                          </div>
                          <input
                            type="text"
                            value={disconnectCode}
                            onChange={(e) => setDisconnectCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-center text-xl tracking-widest text-white focus:outline-none focus:border-red-500 font-mono"
                            placeholder="000000"
                            autoFocus
                          />
                          <div className="flex items-center justify-between gap-3">
                            <button
                              onClick={() => {
                                setDisconnectStep('idle')
                                setDisconnectCode('')
                                setProfileError('')
                              }}
                              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                            >
                              {t('addGame.cancel')}
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleInitiateDisconnect}
                                    disabled={isSendingCode}
                                    className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 disabled:opacity-50"
                                >
                                    {isSendingCode ? t('settings.account.sending') : t('settings.account.resendCode')}
                                </button>
                                <button
                                  onClick={handleVerifyDisconnect}
                                  disabled={isVerifyingCode || disconnectCode.length !== 6}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white flex items-center gap-2"
                                >
                                  {isVerifyingCode && (
                                    <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                                  )}
                                  {t('settings.account.verifyAndDisconnect')}
                                </button>
                            </div>
                          </div>
                        </div>
                      ) : disconnectStep === 'confirm' ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                           <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-200">
                                {t('settings.account.disconnectWarning')}
                           </div>
                           <div className="flex items-center justify-between">
                            <button
                              onClick={() => {
                                setDisconnectStep('idle')
                                setProfileError('')
                              }}
                              className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200"
                            >
                              {t('addGame.cancel')}
                            </button>
                            <button
                              onClick={handleInitiateDisconnect}
                              disabled={isSendingCode}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg text-xs font-semibold text-white flex items-center gap-2"
                            >
                              {isSendingCode && (
                                <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                              )}
                              {t('settings.account.sendCode')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setProfileError('')
                            setDisconnectStep('confirm')
                          }}
                          className="px-4 py-2 bg-transparent border border-red-500/40 text-xs font-semibold text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          {t('settings.account.disconnectFromDevice')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-bold mb-2">{t('settings.integrations.title')}</h3>
                <p className="text-slate-400">{t('settings.integrations.description')}</p>
              </header>

              {showIntegrationOnboarding && (
                <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-emerald-100 mb-1">
                      {t('settings.integrations.onboardingTitle')}
                    </div>
                    <div className="text-sm text-slate-200">
                      {t('settings.integrations.onboardingDescription')}
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      {t('settings.integrations.onboardingSocialHint')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowIntegrationOnboarding(false)
                      if (typeof window !== 'undefined') {
                        window.localStorage.setItem('playhub:postAccountOnboardingSeen', 'true')
                      }
                    }}
                    className="ml-4 px-3 py-1.5 rounded-lg border border-emerald-500/60 text-xs font-medium text-emerald-100 hover:bg-emerald-500/10 transition-colors"
                  >
                    {t('settings.integrations.onboardingButton')}
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Steam */}

              {/* IGDB Integration */}
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-brand-twitch rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-200">IGDB (Twitch)</h3>
                      <p className="text-xs text-slate-400">{t('settings.integrations.igdbDesc') || 'Enhance game covers and details.'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Client ID</label>
                    <input
                      type="text"
                      value={igdbClientId}
                      onChange={(e) => setIgdbClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-primary-500 focus:outline-none"
                      placeholder={t('settings.integrations.igdbClientIdPlaceholder') || 'Client ID'}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{t('settings.integrations.igdbClientSecretLabel') || 'Client Secret'}</label>
                    <input
                      type="password"
                      value={igdbClientSecret}
                      onChange={(e) => setIgdbClientSecret(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:border-primary-500 focus:outline-none"
                      placeholder={t('settings.integrations.igdbClientSecretPlaceholder') || 'Client Secret'}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveIgdbCredentials}
                      className="px-4 py-2 bg-brand-twitch hover:bg-brand-twitch-hover text-white text-sm font-medium rounded transition-colors"
                    >
                      {t('settings.integrations.saveIgdb') || 'Save Credentials'}
                    </button>
                    <button
                      onClick={fetchMissingCovers}
                      disabled={isFetchingCovers || !igdbClientId}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-sm font-medium rounded transition-colors flex items-center gap-2"
                    >
                      {isFetchingCovers && (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                      )}
                      {t('settings.integrations.scanMissingCovers') || 'Scan for Missing Covers'}
                    </button>
                  </div>
                  {fetchCoverStatus && (
                    <p className="text-xs text-slate-300 mt-1">{fetchCoverStatus}</p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2">
                    {t('settings.integrations.igdbHelp') || 'Get keys from'} <a href="https://dev.twitch.tv/console" target="_blank" rel="noreferrer" className="text-primary-400 hover:underline">Twitch Dev Console</a>.
                  </p>
                </div>
              </div>
              
              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-steam rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.666 0 .531 4.908.013 11.12l4.383 1.815c.578-.853 1.542-1.418 2.64-1.418 1.487 0 2.744.996 3.12 2.368l4.757-.678c.092-.48.146-.98.146-1.492 0-4.225-3.425-7.65-7.65-7.65-4.225 0-7.65 3.425-7.65 7.65 0 2.923 1.638 5.46 4.024 6.72L.012 23.987c-.004-.035-.012-.07-.012-.106 0-6.613 5.366-11.979 11.979-11.979 6.613 0 11.979 5.366 11.979 11.979 0 .036-.008.071-.012.106l-3.774-5.45c2.386-1.26 4.024-3.797 4.024-6.72 0-4.225-3.425-7.65-7.65-7.65z"/></svg>
                      </div>
                      <div>
                        <div className="font-bold text-lg">{t('settings.integrations.steamTitle')}</div>
                        <div className="text-sm text-slate-400">
                          {steamId
                            ? t('settings.integrations.connectedMessage', { platform: 'Steam' })
                            : t('settings.integrations.connectAccountPrompt')}
                        </div>
                      </div>
                    </div>
                    <button 
                        onClick={handleSteamConnect}
                        disabled={isSteamConnecting || !!steamId}
                        className={clsx(
                          "px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2",
                          steamId
                            ? "bg-green-600/20 text-green-400"
                            : "bg-brand-steam hover:bg-slate-700 text-white"
                        )}
                    >
                        {isSteamConnecting && (
                          <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                        )}
                        {steamId
                          ? t('settings.integrations.connected')
                          : isSteamConnecting
                          ? t('settings.integrations.connecting')
                          : t('settings.integrations.connectButton')}
                    </button>
                  </div>
                  {steamStatusMessage && (
                    <div className="text-xs text-slate-400 mt-1">
                      {steamStatusMessage}
                    </div>
                  )}
                  
                  {steamId && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                            <div className="flex items-center gap-3 text-sm text-slate-300 mb-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                {t('settings.integrations.secureSessionActive')}
                            </div>
                            <p className="text-xs text-slate-500">
                                {t('settings.integrations.steamSecureDescription')}
                            </p>

                            <div className="mt-3 pt-3 border-t border-slate-700/50">
                                <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-semibold text-slate-300">
                                              {t('settings.integrations.steamWebApiKeyLabel')}
                                            </label>
                                    <button 
                                        onClick={() => setShowApiKeyInput(!showApiKeyInput)} 
                                        className="text-xs text-primary-400 hover:text-primary-300"
                                    >
                                                {showApiKeyInput
                                                  ? t('settings.integrations.hide')
                                                  : t('settings.integrations.fixMissingGames')}
                                    </button>
                                </div>
                                
                                {showApiKeyInput && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <p className="text-xs text-slate-500">
                                                    {t('settings.integrations.steamApiKeyHelp')}
                                                    <a
                                                      href="https://steamcommunity.com/dev/apikey"
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="text-primary-400 ml-1 hover:underline"
                                                    >
                                                      {t('settings.integrations.steamApiKeyLink')}
                                                    </a>
                                                    {' '}
                                                    {t('settings.integrations.steamApiKeyDomainNote')}
                                        </p>
                                        <div className="flex gap-2">
                                            <input 
                                                type="password" 
                                                value={steamApiKey}
                                                onChange={(e) => setSteamApiKey(e.target.value)}
                                                    placeholder={t('settings.integrations.steamApiKeyPlaceholder')}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs focus:outline-none focus:border-primary-500 text-slate-300 placeholder:text-slate-600"
                                            />
                                            <button 
                                                onClick={handleSaveApiKey}
                                                disabled={isSavingKey || !steamApiKey}
                                                className="px-3 py-1 bg-primary-600 hover:bg-primary-500 text-white text-xs rounded font-medium disabled:opacity-50 transition-colors"
                                            >
                                                    {isSavingKey
                                                      ? t('settings.integrations.savingKey')
                                                      : t('settings.integrations.saveKey')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex flex-col gap-2 flex-1 mr-4">
                          <div className="text-sm text-slate-400">{steamSyncStatus}</div>
                          {isSteamSyncing && (
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary-500 transition-all duration-300 ease-out"
                                style={{ width: `${syncPercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={handleSteamSync}
                              disabled={isSteamSyncing}
                              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isSteamSyncing ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                  {t('settings.integrations.syncing')}
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                  {t('settings.integrations.syncNow')}
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleSteamDisconnect}
                              disabled={isSteamDisconnecting}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 border border-slate-600/60 disabled:opacity-50 flex items-center gap-2"
                            >
                              {isSteamDisconnecting && (
                                <span className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></span>
                              )}
                              {t('settings.integrations.disconnect')}
                            </button>
                          </div>
                        </div>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-slate-300">{t('settings.integrations.localLibraryScanTitle')}</h4>
                        <button 
                            onClick={handleScanSteam}
                            disabled={isScanning}
                            className="inline-flex items-center gap-2 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-full font-medium transition-colors disabled:opacity-50 border border-slate-700 text-slate-200"
                        >
                            {isScanning && (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin" />
                            )}
                            {isScanning
                              ? t('settings.integrations.scanning')
                              : t('settings.integrations.scanNow')}
                        </button>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs text-slate-500">
                          {t('settings.integrations.customLibraryPathLabel')}
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={steamPath}
                                onChange={(e) => setSteamPath(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary-500"
                                placeholder={t('settings.integrations.customLibraryPathPlaceholder')}
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            {t('settings.integrations.customLibraryPathHelp')}
                        </p>
                        {steamScanStatus && (
                          <p className="text-xs text-slate-400">
                            {steamScanStatus}
                          </p>
                        )}
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-brand-epic rounded-lg flex items-center justify-center font-bold text-white">E</div>
                      <div>
                        <div className="font-bold text-lg">{t('settings.integrations.epicTitle')}</div>
                        <div className="text-sm text-slate-400">
                          {epicId
                            ? t('settings.integrations.connectedMessage', { platform: 'Epic Games' })
                            : t('settings.integrations.connectAccountPrompt')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleEpicConnect}
                      disabled={isEpicConnecting || !!epicId}
                      className={clsx(
                        'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2',
                        epicId
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-[#333] hover:bg-slate-700 text-white'
                      )}
                    >
                      {isEpicConnecting && (
                        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                      )}
                      {epicId
                        ? t('settings.integrations.connected')
                        : isEpicConnecting
                        ? t('settings.integrations.connecting')
                        : t('settings.integrations.connectButton')}
                    </button>
                  </div>
                  {epicStatusMessage && (
                    <div className="text-xs text-slate-400 mt-1">
                      {epicStatusMessage}
                    </div>
                  )}
                  {epicId && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="flex items-center gap-3 text-sm text-slate-300 mb-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          {t('settings.integrations.secureSessionActive')}
                        </div>
                        <p className="text-xs text-slate-500">
                          {t('settings.integrations.epicSecureDescription')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-2 flex-1 mr-4">
                          <div className="text-sm text-slate-400">{epicSyncStatus}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleEpicSync}
                            disabled={isEpicSyncing}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {isEpicSyncing ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                {t('settings.integrations.syncing')}
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                {t('settings.integrations.syncNow')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleEpicDisconnect}
                            disabled={isEpicDisconnecting}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 border border-slate-600/60 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isEpicDisconnecting && (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></span>
                            )}
                            {t('settings.integrations.disconnect')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* GOG */}
                <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#5d2d88] rounded-lg flex items-center justify-center font-bold text-white">G</div>
                      <div>
                        <div className="font-bold text-lg">{t('settings.integrations.gogTitle')}</div>
                        <div className="text-sm text-slate-400">
                          {gogId
                            ? t('settings.integrations.connectedMessage', { platform: 'GOG Galaxy' })
                            : t('settings.integrations.connectAccountPrompt')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleGogConnect}
                      disabled={isGogConnecting || !!gogId}
                      className={clsx(
                        'px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2',
                        gogId
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-brand-gog hover:bg-brand-gogHover text-white'
                      )}
                    >
                      {isGogConnecting && (
                        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                      )}
                      {gogId
                        ? t('settings.integrations.connected')
                        : isGogConnecting
                        ? t('settings.integrations.connecting')
                        : t('settings.integrations.connectButton')}
                    </button>
                  </div>
                  {gogStatusMessage && (
                    <div className="text-xs text-slate-400 mt-1">
                      {gogStatusMessage}
                    </div>
                  )}
                  {gogId && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="flex items-center gap-3 text-sm text-slate-300 mb-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          {t('settings.integrations.secureSessionActive')}
                        </div>
                        <p className="text-xs text-slate-500">
                          {t('settings.integrations.gogSecureDescription')}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col gap-2 flex-1 mr-4">
                          <div className="text-sm text-slate-400">{gogSyncStatus}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleGogSync}
                            disabled={isGogSyncing}
                            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {isGogSyncing ? (
                              <>
                                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                {t('settings.integrations.syncing')}
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                {t('settings.integrations.syncNow')}
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleGogDisconnect}
                            disabled={isGogDisconnecting}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-medium text-slate-300 border border-slate-600/60 disabled:opacity-50 flex items-center gap-2"
                          >
                            {isGogDisconnecting && (
                              <span className="w-3 h-3 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></span>
                            )}
                            {t('settings.integrations.disconnect')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'updates' && (
            <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-bold mb-2">{t('settings.updates.title')}</h3>
                <p className="text-slate-400">{t('settings.updates.description')}</p>
              </header>

              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">
                      {currentVersion
                        ? t('settings.updates.currentVersionWithNumber', { version: currentVersion })
                        : t('settings.updates.currentVersionLabel')}
                    </div>
                    <div className="text-sm text-slate-400">
                      {updateState?.status === 'available'
                        ? t('settings.updates.updateAvailable', {
                            version: updateState.availableVersion
                          })
                        : updateState?.status === 'downloaded'
                        ? t('settings.updates.readyToInstall', {
                            version: updateState.downloadedVersion || updateState.availableVersion
                          })
                        : updateState?.status === 'downloading'
                        ? t('settings.updates.downloading')
                        : updateState?.status === 'checking'
                        ? t('settings.updates.checking')
                        : updateState?.status === 'not-available'
                        ? t('settings.updates.upToDate')
                        : t('settings.updates.automaticChecksEnabled')}
                    </div>
                    {updateState?.lastCheckAt && (
                      <div className="text-xs text-slate-500">
                        {t('settings.updates.lastChecked', {
                          time: new Date(updateState.lastCheckAt).toLocaleString()
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        setIsCheckingUpdate(true)
                        try {
                          const state = await electron.ipcRenderer.invoke('update:check')
                          setUpdateState(state)
                          if (state?.status === 'available') {
                            setShowUpdateDialog(true)
                          } else if (state?.status === 'not-available') {
                            setUpdateToast({
                              type: 'success',
                              message: t('settings.messages.updateToastLatest')
                            })
                          } else if (state?.status === 'error') {
                            const message =
                              state.errorMessage ||
                              t('settings.messages.updateToastFailed')
                            setUpdateToast({
                              type: 'error',
                              message
                            })
                          }
                        } catch (error) {
                          console.error(error)
                          setUpdateToast({
                            type: 'error',
                            message: t('settings.messages.updateToastFailed')
                          })
                        } finally {
                          setIsCheckingUpdate(false)
                        }
                      }}
                      disabled={isCheckingUpdate}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                    >
                      {isCheckingUpdate && (
                        <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                      )}
                      {t('settings.updates.checkForUpdates')}
                    </button>
                    {updateState?.status === 'available' && (
                      <button
                        onClick={async () => {
                          setIsDownloadingUpdate(true)
                          try {
                            const state = await electron.ipcRenderer.invoke('update:download')
                            setUpdateState(state)
                          } catch (error) {
                            console.error(error)
                          } finally {
                            setIsDownloadingUpdate(false)
                          }
                        }}
                        disabled={isDownloadingUpdate}
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                      >
                        {isDownloadingUpdate && (
                          <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                        )}
                        {t('settings.updates.downloadUpdate')}
                      </button>
                    )}
                    {updateState?.status === 'downloaded' && (
                      <button
                        onClick={async () => {
                          setIsInstallingUpdate(true)
                          try {
                            await electron.ipcRenderer.invoke('update:install')
                          } catch (error) {
                            console.error(error)
                            setIsInstallingUpdate(false)
                          }
                        }}
                        disabled={isInstallingUpdate}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                      >
                        {isInstallingUpdate && (
                          <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                        )}
                        {t('settings.updates.restartToUpdate')}
                      </button>
                    )}
                  </div>
                </div>

                {updateState?.progress && (
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                      <span>{t('settings.updates.downloadProgress')}</span>
                      <span>{Math.round(updateState.progress.percent)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-2 bg-primary-500"
                        style={{ width: `${updateState.progress.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {updateState?.errorMessage && (
                  <div className="text-xs text-red-400">{updateState.errorMessage}</div>
                )}

                <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{t('settings.updates.automaticUpdatesTitle')}</div>
                    <div className="text-xs text-slate-400">
                      {t('settings.updates.automaticUpdatesDescription')}
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2">
                    <span className="text-xs text-slate-400">{t('settings.updates.enabled')}</span>
                    <button
                      onClick={async () => {
                        const next = !updatePrefs.autoCheck
                        try {
                          const prefs = await electron.ipcRenderer.invoke('update:set-preferences', {
                            autoCheck: next,
                            intervalMinutes: updatePrefs.intervalMinutes
                          })
                          setUpdatePrefs({
                            autoCheck: prefs.autoCheck,
                            intervalMinutes: prefs.intervalMinutes
                          })
                        } catch (error) {
                          console.error(error)
                        }
                      }}
                      className={clsx(
                        'w-10 h-5 rounded-full relative transition-colors',
                        updatePrefs.autoCheck ? 'bg-primary-600' : 'bg-slate-700'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transform transition-transform',
                          updatePrefs.autoCheck ? 'right-0.5' : 'left-0.5'
                        )}
                      />
                    </button>
                  </label>
                </div>
              </div>

              <div className="p-6 bg-slate-800/40 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{t('settings.updates.changelogTitle')}</div>
                    <div className="text-sm text-slate-400">{t('settings.updates.changelogDescription')}</div>
                  </div>
                  {hasUnreadChangelogFlag && (
                    <span className="inline-flex items-center gap-1 text-xs text-primary-400">
                      <span className="w-2 h-2 rounded-full bg-primary-400" />
                      {t('settings.updates.newBadge')}
                    </span>
                  )}
                </div>

                <div className="space-y-4 text-sm">
                  {updateState?.releaseNotes ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {updateState.availableVersion || t('settings.updates.latestUpdate')}
                        </div>
                        <div className="text-xs text-slate-400">{t('settings.updates.releaseNotes')}</div>
                      </div>
                      <div 
                        className="mt-2 text-slate-300 prose prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: updateState.releaseNotes }} 
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {t('settings.updates.fallbackVersion')}
                        </div>
                        <div className="text-xs text-slate-400">
                          {t('settings.updates.fallbackVersionDescription')}
                        </div>
                      </div>
                      <ul className="mt-2 list-disc list-inside text-slate-300 space-y-1">
                        <li>{t('settings.updates.fallbackChange1')}</li>
                        <li>{t('settings.updates.fallbackChange2')}</li>
                        <li>{t('settings.updates.fallbackChange3')}</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-bold mb-2">{t('settings.appearance')}</h3>
                <p className="text-slate-400">{t('settings.appearanceDescription')}</p>
              </header>
              
              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                   <div>
                       <div className="font-bold">{t('settings.appearance')}</div>
                       <div className="text-sm text-slate-400">{t('settings.appearanceDescription')}</div>
                   </div>
                   <button 
                     onClick={toggleTheme}
                     className={clsx(
                       "w-12 h-6 rounded-full relative transition-colors focus:outline-none",
                       theme === 'dark' ? "bg-slate-700" : "bg-primary-500"
                     )}
                   >
                       <div className={clsx(
                         "absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all",
                         theme === 'dark' ? "left-1" : "right-1"
                       )}></div>
                   </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                   <div>
                       <div className="font-bold">{t('settings.colorTheme') || 'Color Theme'}</div>
                       <div className="text-sm text-slate-400">{t('settings.colorThemeDescription') || 'Choose your accent color'}</div>
                   </div>
                   <div className="flex gap-2">
                       {availableThemes && Object.entries(availableThemes).map(([key, themeData]) => (
                           <button
                               key={key}
                               onClick={() => setColorTheme(key as any)}
                               className={clsx(
                                   "w-8 h-8 rounded-full border-2 transition-all",
                                   colorTheme === key ? "border-white scale-110" : "border-transparent hover:scale-105"
                               )}
                               style={{ backgroundColor: `rgb(${themeData.colors[500]})` }}
                               title={themeData.name}
                           />
                       ))}
                   </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700">
                    <div className="font-bold mb-3">{t('settings.backgroundTheme')}</div>
                    <div className="text-sm text-slate-400 mb-4">{t('settings.backgroundThemeDescription')}</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableBackgrounds && Object.entries(availableBackgrounds).map(([key, bg]) => (
                            <button
                                key={key}
                                onClick={() => setBackgroundTheme(key as BackgroundKey)}
                                className={clsx(
                                    "relative h-20 rounded-lg border-2 overflow-hidden transition-all group",
                                    backgroundTheme === key 
                                        ? "border-primary-500 scale-105 shadow-lg shadow-primary-500/20" 
                                        : "border-slate-700 hover:border-slate-500"
                                )}
                            >
                                <div 
                                    className="absolute inset-0 transition-transform group-hover:scale-110 duration-700"
                                    style={{ background: bg.value, backgroundColor: bg.color }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-bold text-white drop-shadow-md">{bg.name}</span>
                                </div>
                                {backgroundTheme === key && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="bg-primary-500 rounded-full p-1 shadow-lg">
                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-bold mb-2">{t('settings.generalTitle')}</h3>
                <p className="text-slate-400">{t('settings.generalDescription')}</p>
              </header>
              
              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                   <div>
                       <div className="font-bold">{t('settings.language')}</div>
                       <div className="text-sm text-slate-400">{t('settings.languageDescription')}</div>
                   </div>
                   <select
                     value={i18n.language}
                     onChange={(e) => {
                       const lng = e.target.value
                       i18n.changeLanguage(lng)
                       if (typeof window !== 'undefined') {
                         window.localStorage.setItem('playhub:locale', lng)
                       }
                     }}
                     className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm focus:outline-none focus:border-primary-500 text-white"
                   >
                     <option value="en">English</option>
                     <option value="de">Deutsch</option>
                   </select>
                </div>
                <div className="flex items-center justify-between mb-4">
                   <div>
                       <div className="font-bold">{t('settings.startOnBoot')}</div>
                       <div className="text-sm text-slate-400">{t('settings.startOnBootDescription')}</div>
                   </div>
                   <div className="w-12 h-6 bg-slate-700 rounded-full relative cursor-pointer">
                       <div className="absolute left-1 top-1 w-4 h-4 bg-slate-400 rounded-full"></div>
                   </div>
                </div>
                <div className="flex items-center justify-between mb-4">
               <div>
                   <div className="font-bold">{t('settings.minimizeToTray')}</div>
                   <div className="text-sm text-slate-400">{t('settings.minimizeToTrayDescription')}</div>
               </div>
               <div 
                 className={clsx(
                   "w-12 h-6 rounded-full relative cursor-pointer transition-colors",
                   minimizeToTray ? "bg-primary-600" : "bg-slate-700"
                 )}
                 onClick={() => setMinimizeToTray(!minimizeToTray)}
               >
                   <div className={clsx(
                     "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all",
                     minimizeToTray ? "right-1" : "left-1"
                   )}></div>
               </div>
            </div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-bold">{t('settings.discordPresence')}</div>
                    <div className="text-sm text-slate-400">{t('settings.discordPresenceDescription')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiscordPresenceEnabled(!discordPresenceEnabled)}
                    className={clsx(
                      'w-12 h-6 rounded-full relative cursor-pointer transition-colors',
                      discordPresenceEnabled ? 'bg-primary-600' : 'bg-slate-700'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        discordPresenceEnabled ? 'right-1' : 'left-1'
                      )}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold">{t('settings.onboardingResetTitle')}</div>
                    <div className="text-sm text-slate-400">{t('settings.onboardingResetDescription')}</div>
                    {onboardingResetMessage && (
                      <div className="text-xs text-emerald-400 mt-1">{onboardingResetMessage}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('playhub:onboardingSeen')
                      }
                      if (onResetOnboarding) {
                        onResetOnboarding()
                      }
                      setOnboardingResetMessage(t('settings.messages.onboardingResetSuccess'))
                      setTimeout(() => {
                        setOnboardingResetMessage('')
                      }, 4000)
                    }}
                    className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-900 text-sm font-medium text-slate-100 hover:bg-slate-800 hover:border-slate-500 transition-colors"
                  >
                    {t('settings.onboardingResetButton')}
                  </button>
                </div>
              </div>
              <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="font-bold">{t('settings.backup.title')}</div>
                    <div className="text-sm text-slate-400">{t('settings.backup.description')}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportSettings}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-100 border border-slate-600 hover:border-primary-500 transition-colors"
                  >
                    {t('settings.backup.exportButton')}
                  </button>
                </div>
                <div className="space-y-3">
                  <textarea
                    value={backupJson}
                    onChange={e => setBackupJson(e.target.value)}
                    rows={5}
                    spellCheck={false}
                    placeholder={t('settings.backup.importPlaceholder')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-primary-500 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <div
                      className={clsx(
                        'text-xs',
                        backupStatus && backupStatus.toLowerCase().includes('failed')
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      )}
                    >
                      {backupStatus}
                    </div>
                    <button
                      type="button"
                      onClick={handleImportSettings}
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-500 rounded-lg text-xs font-medium text-white transition-colors"
                    >
                      {t('settings.backup.importButton')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-bold mb-2">{t('settings.feedback.title')}</h3>
                <p className="text-slate-400">{t('settings.feedback.description')}</p>
              </header>

              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">{t('settings.feedback.typeLabel')}</label>
                    <select
                      value={feedbackForm.type}
                      onChange={e => setFeedbackForm({ ...feedbackForm, type: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    >
                      <option value="bug">{t('settings.feedback.typeBug')}</option>
                      <option value="feature">{t('settings.feedback.typeFeature')}</option>
                      <option value="general">{t('settings.feedback.typeGeneral')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">{t('settings.feedback.ratingLabel')}</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                          className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-colors",
                            feedbackForm.rating >= star ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50" : "bg-slate-800 border border-slate-700 text-slate-500 hover:bg-slate-700"
                          )}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">{t('settings.feedback.messageLabel')}</label>
                    <textarea
                      value={feedbackForm.content}
                      onChange={e => setFeedbackForm({ ...feedbackForm, content: e.target.value })}
                      required
                      rows={5}
                      placeholder={t('settings.feedback.messagePlaceholder')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">{t('settings.feedback.emailLabel')}</label>
                    <input
                      type="email"
                      value={feedbackForm.contactEmail}
                      onChange={e => setFeedbackForm({ ...feedbackForm, contactEmail: e.target.value })}
                      placeholder={t('settings.feedback.emailPlaceholder')}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                      <div className="text-sm font-medium text-slate-200">{t('settings.feedback.discordTitle')}</div>
                      <div className="text-xs text-slate-400">
                        {t('settings.feedback.discordDescription')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !sendFeedbackToDiscord
                        setSendFeedbackToDiscord(next)
                        if (typeof window !== 'undefined') {
                          window.localStorage.setItem('playhub:feedbackSendToDiscord', next ? 'true' : 'false')
                        }
                      }}
                      className={clsx(
                        'w-12 h-6 rounded-full relative cursor-pointer transition-colors',
                        sendFeedbackToDiscord ? 'bg-primary-600' : 'bg-slate-700'
                      )}
                    >
                      <span
                        className={clsx(
                          'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform',
                          sendFeedbackToDiscord ? 'right-1' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <div className={clsx("text-sm", feedbackStatus.includes('Failed') ? "text-red-400" : "text-green-400")}>
                      {feedbackStatus}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmittingFeedback || !feedbackForm.content.trim()}
                      className="px-6 py-2 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium text-white transition-colors flex items-center gap-2"
                    >
                      {isSubmittingFeedback ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t('settings.feedback.sending')}
                        </>
                      ) : (
                        t('settings.feedback.submit')
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-8">
              <header>
                <h3 className="text-2xl font-bold mb-2">{t('settings.system.title')}</h3>
                <p className="text-slate-400">{t('settings.system.description')}</p>
              </header>

              {!systemStats ? (
                <div className="flex items-center justify-center h-64">
                   <span className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <span className="text-primary-400">💻</span> {t('settings.system.cpu')}
                    </h4>
                    <div className="space-y-4">
                      <div className="text-3xl font-bold text-white">
                        {systemStats.cpu.percentCPUUsage.toFixed(1)}%
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 transition-all duration-500"
                          style={{ width: `${Math.min(systemStats.cpu.percentCPUUsage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        {systemStats.cpus.length} Cores • {systemStats.cpus[0].model}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <span className="text-green-400">🧠</span> {t('settings.system.memory')}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div className="text-3xl font-bold text-white">
                          {((systemStats.memory.total - systemStats.memory.free) / 1024 / 1024 / 1024).toFixed(1)} GB
                        </div>
                        <div className="text-sm text-slate-400 mb-1">
                          / {(systemStats.memory.total / 1024 / 1024 / 1024).toFixed(1)} GB
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500"
                          style={{ width: `${((systemStats.memory.total - systemStats.memory.free) / systemStats.memory.total) * 100}%` }}
                        />
                      </div>
                      <div className="text-xs text-slate-400">
                        {t('settings.system.appUsage')}: {(systemStats.memory.appUsage.private / 1024).toFixed(0)} MB
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <span className="text-purple-400">⚙️</span> {t('settings.system.systemInfo')}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('settings.system.platform')}</span>
                        <span className="text-white capitalize">{systemStats.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('settings.system.architecture')}</span>
                        <span className="text-white">{systemStats.arch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">{t('settings.system.uptime')}</span>
                        <span className="text-white">{t('settings.system.uptimeHours', { hours: (systemStats.uptime / 3600).toFixed(1) })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
                    <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                      <span className="text-blue-400">🏷️</span> {t('settings.system.classificationTitle') || 'Library Classification'}
                    </h4>
                    <p className="text-sm text-slate-400 mb-4">
                      {t('settings.system.classificationDescription') || 'PlayHub automatically classifies your library into Games and Utilities. You can manually re-run this process if items are miscategorized.'}
                    </p>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleReclassifyAll}
                        disabled={isReclassifying}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                      >
                        {isReclassifying ? (
                          <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          t('settings.system.reclassifyButton') || 'Reclassify All Games'
                        )}
                      </button>
                      {reclassifyStatus && <span className="text-sm text-slate-400">{reclassifyStatus}</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {showUpdateDialog && updateState?.status === 'available' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-primary-400 mb-1">{t('settings.updates.dialogUpdateAvailable')}</div>
                <h3 className="text-xl font-bold text-white">
                  PlayHub {updateState.availableVersion}
                </h3>
                {currentVersion && (
                  <div className="text-xs text-slate-400 mt-1">
                    {t('settings.updates.currentVersionLabel')} {currentVersion}
                  </div>
                )}
              </div>
              <button
                type="button"
                aria-label="Close update dialog"
                onClick={() => setShowUpdateDialog(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t('settings.updates.dialogNewVersion')}</span>
                <span className="font-medium">{updateState.availableVersion}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t('settings.updates.dialogEstimatedSize')}</span>
                <span className="font-medium">
                  {formatBytes(updateState.availableSize)}
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-400 mb-1">{t('settings.updates.dialogChangelog')}</div>
                <div className="max-h-40 overflow-y-auto custom-scrollbar text-xs text-slate-300 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 whitespace-pre-wrap">
                  {updateState.releaseNotes || t('settings.updates.dialogNoReleaseNotes')}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{t('settings.updates.dialogRemindIn')}</span>
                <select
                  value={remindDays}
                  onChange={(e) => setRemindDays(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs focus:outline-none focus:border-primary-500"
                >
                  <option value={1}>{t('settings.updates.dialogRemind1Day')}</option>
                  <option value={3}>{t('settings.updates.dialogRemind3Days')}</option>
                  <option value={7}>{t('settings.updates.dialogRemind7Days')}</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setShowUpdateDialog(false)
                    try {
                      const minutes = remindDays * 24 * 60
                      const prefs = await electron.ipcRenderer.invoke('update:set-preferences', {
                        autoCheck: true,
                        intervalMinutes: minutes
                      })
                      setUpdatePrefs({
                        autoCheck: prefs.autoCheck,
                        intervalMinutes: prefs.intervalMinutes
                      })
                      setUpdateToast({
                        type: 'info',
                        message: t('settings.messages.updateToastReminderSaved', { days: remindDays, suffix: remindDays === 1 ? '' : 's' })
                      })
                    } catch (error) {
                      console.error(error)
                      setUpdateToast({
                        type: 'error',
                        message: t('settings.messages.updateToastReminderError')
                      })
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-sm font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  {t('settings.updates.dialogLater')}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowUpdateDialog(false)
                    setIsDownloadingUpdate(true)
                    setIsInstallingUpdate(true)
                    setShouldAutoInstall(true)
                    try {
                      const state = await electron.ipcRenderer.invoke('update:download')
                      setUpdateState(state)
                    } catch (error) {
                      console.error(error)
                      setUpdateToast({
                        type: 'error',
                        message: t('settings.messages.updateToastDownloadFailed')
                      })
                      setIsDownloadingUpdate(false)
                      setIsInstallingUpdate(false)
                      setShouldAutoInstall(false)
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-sm font-medium text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {isDownloadingUpdate ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                      {t('settings.updates.dialogPreparing')}
                    </>
                  ) : (
                    t('settings.updates.dialogInstallNow')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {updateToast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
          <div
            className={clsx(
              'pointer-events-auto px-4 py-3 rounded-lg shadow-lg text-sm border',
              updateToast.type === 'success'
                ? 'bg-emerald-900/90 border-emerald-500/40 text-emerald-100'
                : updateToast.type === 'error'
                ? 'bg-red-900/90 border-red-500/40 text-red-100'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            )}
          >
            {updateToast.message}
          </div>
        </div>
      )}
    </div>
  )
}
