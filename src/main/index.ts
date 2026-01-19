import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import * as dotenv from 'dotenv'
dotenv.config()
import { join } from 'path'
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
import './services/feedback-service'
import './services/system-service'

import './services/update-service'
import { metadataService } from './services/metadata-service'

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
    splashWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/splash.html`)
  } else {
    splashWindow.loadFile(join(__dirname, '../renderer/splash.html'))
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

  const startTime = Date.now()
  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - startTime
    const minSplashTime = 2000 // 2 seconds minimum
    const delay = Math.max(0, minSplashTime - elapsed)

    setTimeout(() => {
        if (!splashWindow.isDestroyed()) {
            splashWindow.close()
        }
        mainWindow.show()
        mainWindow.focus()
    }, delay)
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
