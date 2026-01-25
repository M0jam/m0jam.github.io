import { app, shell, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from 'electron'
import * as dotenv from 'dotenv'
import { join, dirname } from 'path'

// Load environment variables
if (app.isPackaged) {
  // In production, try to load .env from the executable directory
  dotenv.config({ path: join(dirname(app.getPath('exe')), '.env') })
} else {
  dotenv.config()
}

// Handle Portable Mode
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  const portableDataPath = join(process.env.PORTABLE_EXECUTABLE_DIR, 'data')
  app.setPath('userData', portableDataPath)
  // Ensure session data (cookies, cache) is also stored here if needed, 
   // but userData covers most Electron data.
   // We can also set session data path explicitly if needed, but userData is the parent.
   console.log(`Running in Portable Mode. Data path: ${portableDataPath}`)
   
   // Set a flag for other services to detect portable mode
   process.env.PLAYHUB_PORTABLE = 'true'

   // Redirect electron-log
   // We need to require it here because imports are hoisted
   try {
      const log = require('electron-log')
      log.transports.file.resolvePathFn = () => join(portableDataPath, 'logs', 'main.log')
      console.log('Log path redirected to portable directory')
   } catch (e) {
      console.error('Failed to configure portable logging:', e)
   }
 }
 
 import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { dbManager } from './database'
import './services/auth-service'
import './services/steam-scanner'
import './services/library-manager'
import { dataService } from './services/data-service'
import './services/game-service'
import './services/social-service'
import './services/playtime-monitor'
import './services/steam-service'
import './services/epic-service'
import './services/gog-service'
import './services/feedback-service'
import './services/system-service'

import './services/update-service'
import './services/tag-service'
import './services/notes-service'
import { metadataService } from './services/metadata-service'

let tray: Tray | null = null
let isQuitting = false
let minimizeToTray = true // Default behavior

app.on('before-quit', () => {
  isQuitting = true
})

// Handle file dialog requests
ipcMain.handle('dialog:open-file', async (_, filters: Electron.FileFilter[]) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters || [{ name: 'Executables', extensions: ['exe', 'lnk', 'url', 'bat', 'cmd'] }]
  })
  if (canceled || filePaths.length === 0) {
    return null
  }
  return filePaths[0]
})

// Listen for tray behavior settings
ipcMain.on('settings:update-tray-behavior', (_, value) => {
  minimizeToTray = value
})

function createTray(iconPath: string, mainWindow: BrowserWindow) {
  const icon = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon)
  tray.setToolTip('PlayHub')
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open PlayHub', 
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true
        app.quit()
      } 
    }
  ])
  
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
        if (mainWindow.isFocused()) {
            mainWindow.hide()
        } else {
            mainWindow.focus()
        }
    } else {
        mainWindow.show()
        mainWindow.focus()
    }
  })
}

function createWindow(): void {
  const iconPath =
    process.platform === 'win32'
      ? join(__dirname, '../../build/icon.ico')
      : join(__dirname, '../../build/icon.png')

  // Create Splash Window
  const splashWindow = new BrowserWindow({
    width: 400,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    icon: iconPath,
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    splashWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/splash.html?version=${app.getVersion()}`)
  } else {
    splashWindow.loadFile(join(__dirname, '../renderer/splash.html'), { query: { version: app.getVersion() } })
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Initialize Tray
  createTray(iconPath, mainWindow)

  // Listen for app initialization
  ipcMain.on('app:initialized', () => {
    if (mainWindow && !mainWindow.isVisible()) {
      mainWindow.show()
      mainWindow.focus()
      // Close splash screen if it exists
      if (!splashWindow.isDestroyed()) {
        splashWindow.close()
      }
    }
  })

  mainWindow.on('ready-to-show', () => {
    // Wait for renderer to signal initialization
    // mainWindow.show() 
  })

  // Also keep a fallback just in case renderer fails to signal
  // (Optional: removed to strictly enforce "only show after init")
  
  // Handle Close behavior
  mainWindow.on('close', (event) => {
    if (!isQuitting && minimizeToTray) {
      event.preventDefault()
      mainWindow.hide()
      return false
    }
    return true
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize Database
  try {
    dbManager.init()
    console.log('Database initialized')
    metadataService.initialize()
    dataService.startNewsSync()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
