import { app, BrowserWindow } from 'electron'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'
import { applyNavigationPolicy, HARDENED_WEB_PREFERENCES } from './security/windowSecurity'

// Must run before any `app.getPath('userData')` call (including ones deep
// inside `registerIpcHandlers`'s store constructors) and before
// `app.whenReady()` — Electron resolves the default userData path from
// `app.name`, which defaults to the literal string "Electron" when running
// unpackaged (dev mode never reads `package.json`'s `name`/`productName`
// the way a packaged build does). Without this, every `core/*Store` this
// app persists writes into the generic, OS-wide `%APPDATA%/Electron` (or
// `~/Library/Application Support/Electron`, `~/.config/Electron`) folder —
// shared by *any* other unpackaged Electron app a developer runs on the
// same machine. Confirmed in practice on this machine: `%APPDATA%/Electron`
// already held an unrelated app's `jpe_secure_vault.json`/`sidecar.lock.json`
// in the exact directory this app's own stores would write next to — and
// the seemingly obvious name `NeuroDeck` (no suffix) turned out to already
// belong to a *different*, unrelated real application on this same machine
// too (`%APPDATA%/NeuroDeck` held its own `neurodeck.db` SQLite file,
// `temp_record.wav`, `theme-settings.json` — none of which exist anywhere
// in this codebase). `productName` in `electron-builder.yml` is
// "NeuroDeck OS" specifically to be unambiguous; matching it here keeps
// the dev-mode and packaged userData directories the same.
app.setName('NeuroDeck OS')

let mainWindow: BrowserWindow | null = null
let disposeIpcServices: (() => void) | null = null

const VOLATILE_CHROMIUM_PROFILE_DIRS = [
  'blob_storage',
  'Cache',
  'Code Cache',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'GPUCache',
  'Session Storage'
] as const

function configureChromiumRuntimeCache(): void {
  const runtimeCachePath = mkdtempSync(join(tmpdir(), 'neurodeck-chromium-cache-'))

  app.commandLine.appendSwitch('disk-cache-dir', runtimeCachePath)
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
}

function clearVolatileChromiumProfileState(): void {
  const userDataPath = app.getPath('userData')

  for (const profileDir of VOLATILE_CHROMIUM_PROFILE_DIRS) {
    try {
      rmSync(join(userDataPath, profileDir), { recursive: true, force: true })
    } catch (error) {
      console.warn(`Unable to clear volatile Chromium profile directory "${profileDir}"`, error)
    }
  }
}

configureChromiumRuntimeCache()
clearVolatileChromiumProfileState()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      ...HARDENED_WEB_PREFERENCES
    }
  })

  const allowedOrigins =
    is.dev && process.env['ELECTRON_RENDERER_URL']
      ? [new URL(process.env['ELECTRON_RENDERER_URL']).origin]
      : ['file://']
  applyNavigationPolicy(mainWindow, allowedOrigins)

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#/boot`)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: '/boot' })
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.neurodeck.os')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  disposeIpcServices = registerIpcHandlers(() => mainWindow)
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  disposeIpcServices?.()
  disposeIpcServices = null
})

// Defense in depth: block legacy nodeIntegration/insecure-content escalation
// attempts even if a future window is constructed without the hardened defaults.
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })
})
