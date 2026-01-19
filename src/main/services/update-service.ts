import { app, ipcMain, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'

export interface UpdateState {
  status: UpdateStatus
  availableVersion: string | null
  downloadedVersion: string | null
  availableSize: number | null
  releaseNotes: string | null
  progress:
    | {
        percent: number
        bytesPerSecond: number
        transferred: number
        total: number
      }
    | null
  errorMessage: string | null
  lastCheckAt: string | null
}

export class UpdateService {
  private updateState: UpdateState = {
    status: 'idle',
    availableVersion: null,
    downloadedVersion: null,
    availableSize: null,
    releaseNotes: null,
    progress: null,
    errorMessage: null,
    lastCheckAt: null
  }

  private autoCheckEnabled = true
  private autoCheckIntervalMs = 4 * 60 * 60 * 1000
  private autoCheckTimer: NodeJS.Timeout | null = null

  constructor() {
    // Only initialize if not in test/dev mode or depending on requirements.
    // We'll initialize essentially always, but checks inside methods guard against dev mode.
    this.initLogger()
    this.initAutoUpdater()
    this.registerIpcHandlers()
    
    if (app.isPackaged) {
      this.scheduleAutoCheck()
      // Initial check after startup delay
      setTimeout(() => this.checkForUpdates(), 10000)
    } else {
      this.loadDevReleaseNotes()
    }
  }

  private loadDevReleaseNotes() {
    try {
      const pathsToTry = [
        join(process.cwd(), 'release-notes.md'),
        join(app.getAppPath(), '../../release-notes.md')
      ]

      for (const p of pathsToTry) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf-8')
          this.updateState.releaseNotes = this.simpleMarkdownToHtml(content)
          this.updateState.availableVersion = 'DEV'
          log.info('Loaded dev release notes from', p)
          break
        }
      }
    } catch (e) {
      log.error('Failed to load dev release notes', e)
    }
  }

  private simpleMarkdownToHtml(md: string): string {
    let html = md
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    const lines = html.split('\n')
    let inList = false
    let result = ''
    
    for (const line of lines) {
      if (line.trim().startsWith('- ')) {
        if (!inList) {
          result += '<ul>'
          inList = true
        }
        result += `<li>${line.trim().substring(2)}</li>`
      } else {
        if (inList) {
          result += '</ul>'
          inList = false
        }
        result += line
      }
    }
    if (inList) result += '</ul>'
    
    return result
  }

  private initLogger() {
    log.transports.file.level = 'info'
    autoUpdater.logger = log
    log.info('UpdateService initialized')
  }

  private initAutoUpdater() {
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    autoUpdater.allowDowngrade = true

    autoUpdater.on('checking-for-update', () => {
      this.updateState.status = 'checking'
      this.updateState.errorMessage = null
      this.updateState.lastCheckAt = new Date().toISOString()
      log.info('Checking for updates...')
      this.broadcastUpdateState()
    })

    autoUpdater.on('update-available', (info) => {
      this.updateState.status = 'available'
      this.updateState.availableVersion = info.version
      this.updateState.downloadedVersion = null
      
      const anyInfo: any = info
      if (Array.isArray(anyInfo.files) && anyInfo.files.length > 0 && typeof anyInfo.files[0].size === 'number') {
        this.updateState.availableSize = anyInfo.files[0].size
      } else {
        this.updateState.availableSize = null
      }

      if (typeof anyInfo.releaseNotes === 'string') {
        this.updateState.releaseNotes = anyInfo.releaseNotes
      } else if (Array.isArray(anyInfo.releaseNotes)) {
        this.updateState.releaseNotes = anyInfo.releaseNotes.map((n: any) => (typeof n === 'string' ? n : n?.body || '')).join('\n\n')
      } else {
        this.updateState.releaseNotes = null
      }
      
      this.updateState.progress = null
      log.info('Update available:', info.version)
      this.broadcastUpdateState()
    })

    autoUpdater.on('update-not-available', (info) => {
      this.updateState.status = 'not-available'
      this.updateState.availableVersion = null
      this.updateState.downloadedVersion = null
      this.updateState.availableSize = null
      this.updateState.releaseNotes = null
      this.updateState.progress = null
      log.info('Update not available.')
      this.broadcastUpdateState()
    })

    autoUpdater.on('error', (err) => {
      this.updateState.status = 'error'
      this.updateState.errorMessage = this.normalizeUpdateError(err)
      log.error('Update error:', err)
      this.broadcastUpdateState()
    })

    autoUpdater.on('download-progress', (progressObj) => {
      this.updateState.status = 'downloading'
      this.updateState.progress = {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
      // Log every 10% to avoid spam
      if (Math.round(progressObj.percent) % 10 === 0) {
        log.info(`Download progress: ${Math.round(progressObj.percent)}%`)
      }
      this.broadcastUpdateState()
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.updateState.status = 'downloaded'
      this.updateState.downloadedVersion = info.version
      this.updateState.progress = null
      log.info('Update downloaded:', info.version)
      this.broadcastUpdateState()
    })
  }

  private normalizeUpdateError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error)
    const lower = raw.toLowerCase()

    if (lower.includes('err_name_not_resolved') || lower.includes('enotfound')) {
      return 'Could not reach the update server (DNS error). Check your internet connection or update URL.'
    }
    if (lower.includes('err_connection_refused') || lower.includes('econnrefused')) {
      return 'Update server refused the connection. Please try again later.'
    }
    if (lower.includes('err_connection_timed_out') || lower.includes('etimedout')) {
      return 'Connection to the update server timed out. Please check your network and try again.'
    }
    return raw
  }

  private registerIpcHandlers() {
    ipcMain.handle('update:get-state', async () => {
      return {
        ...this.getUpdateState(),
        currentVersion: app.getVersion()
      }
    })

    ipcMain.handle('update:get-preferences', async () => {
      return {
        autoCheck: this.autoCheckEnabled,
        intervalMinutes: this.autoCheckIntervalMs / (60 * 1000)
      }
    })

    ipcMain.handle('update:set-preferences', async (_event, prefs: { autoCheck?: boolean; intervalMinutes?: number }) => {
      if (typeof prefs.autoCheck === 'boolean') {
        this.autoCheckEnabled = prefs.autoCheck
      }
      if (typeof prefs.intervalMinutes === 'number' && prefs.intervalMinutes >= 15) {
        this.autoCheckIntervalMs = prefs.intervalMinutes * 60 * 1000
      }
      log.info('Update preferences changed:', {
        autoCheck: this.autoCheckEnabled,
        intervalMinutes: this.autoCheckIntervalMs / (60 * 1000)
      })
      this.scheduleAutoCheck()
      return {
        autoCheck: this.autoCheckEnabled,
        intervalMinutes: this.autoCheckIntervalMs / (60 * 1000)
      }
    })

    ipcMain.handle('update:check', async () => {
      if (!app.isPackaged) {
        log.info('Skipping live update check in development')
        return {
          ...this.getUpdateState(),
          currentVersion: app.getVersion()
        }
      }
      await this.checkForUpdates()
      return {
        ...this.getUpdateState(),
        currentVersion: app.getVersion()
      }
    })

    ipcMain.handle('update:download', async () => {
      if (this.updateState.status !== 'available') {
        return {
          ...this.getUpdateState(),
          currentVersion: app.getVersion()
        }
      }
      try {
        log.info('Starting update download...')
        await autoUpdater.downloadUpdate()
      } catch (error) {
        log.error('Update download failed:', error)
      }
      return {
        ...this.getUpdateState(),
        currentVersion: app.getVersion()
      }
    })

    ipcMain.handle('update:install', async () => {
      if (this.updateState.status !== 'downloaded') {
        return false
      }
      log.info('Quitting to install update...')
      // Small delay to ensure UI receives the "quitting" state if needed
      setTimeout(() => {
        autoUpdater.quitAndInstall(false, true)
      }, 500)
      return true
    })
  }

  public async checkForUpdates() {
    try {
      this.updateState.status = 'checking'
      this.updateState.errorMessage = null
      this.updateState.lastCheckAt = new Date().toISOString()
      this.broadcastUpdateState()
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.updateState.status = 'error'
      this.updateState.errorMessage = this.normalizeUpdateError(error)
      log.error('Update check failed:', error)
      this.broadcastUpdateState()
    }
  }

  private scheduleAutoCheck() {
    if (this.autoCheckTimer) {
      clearInterval(this.autoCheckTimer)
      this.autoCheckTimer = null
    }
    if (!this.autoCheckEnabled) return
    if (!app.isPackaged) return
    
    log.info(`Scheduling auto-check every ${this.autoCheckIntervalMs / 60000} minutes`)
    this.autoCheckTimer = setInterval(() => {
      this.checkForUpdates()
    }, this.autoCheckIntervalMs)
  }

  private getUpdateState() {
    return { ...this.updateState }
  }

  private broadcastUpdateState() {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      win.webContents.send('update:status', {
        ...this.getUpdateState(),
        currentVersion: app.getVersion()
      })
    }
  }
}

export const updateService = new UpdateService()
