import { app, BrowserWindow, ipcMain, shell, Tray, Menu } from 'electron'
import path from 'path'
import {
  getDiskInfo, scanCaches, scanDevTools, quickScan, findNodeModules,
  scanAppLeftovers, scanLargeFiles, scanLogs, scanDownloads, getTrashInfo,
} from './services/scanner'
import { moveToTrash, emptyTrash, deleteDSStores } from './services/cleaner'
import { getSettings, saveSettings } from './services/settings'
import { getScanCache, saveScanCache, clearScanCache, ScanCache } from './services/scanCache'
import { getResultsCache, saveResultsCache, clearResultsCache, ScanKey } from './services/resultsCache'
import type { QuickScanResult } from './preload'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let trayWindow: BrowserWindow | null = null

function createWindow() {
  const isDev = !app.isPackaged

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 780,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0d0d0d',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  mainWindow.once('ready-to-show', () => mainWindow?.show())

  // Hide instead of close when tray is active (keep app alive in menu bar)
  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (isDev) mainWindow.loadURL('http://localhost:5173')
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
}

function createTrayWindow() {
  const isDev = !app.isPackaged

  trayWindow = new BrowserWindow({
    width: 340,
    height: 430,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    vibrancy: 'popover',
    visualEffectState: 'active',
    roundedCorners: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  trayWindow.on('blur', () => trayWindow?.hide())

  if (isDev) trayWindow.loadURL('http://localhost:5173/#tray')
  else trayWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: 'tray' })
}

function setupTray() {
  const isDev = !app.isPackaged
  const iconPath = isDev
    ? path.join(__dirname, '../build/icon.iconset/icon_16x16.png')
    : path.join(process.resourcesPath, 'icon_16x16.png')

  tray = new Tray(iconPath)
  tray.setToolTip('CleanTool')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mở CleanTool',
      click: () => {
        if (!mainWindow) createWindow()
        else { mainWindow.show(); mainWindow.focus() }
        trayWindow?.hide()
      },
    },
    { type: 'separator' },
    {
      label: 'Thoát',
      click: () => {
        tray?.destroy()
        app.quit()
      },
    },
  ])

  tray.on('click', (_e, bounds) => {
    if (trayWindow?.isVisible()) {
      trayWindow.hide()
      return
    }

    const { x, y } = bounds
    const { width, height } = trayWindow!.getBounds()
    const xPos = Math.round(x - width / 2 + bounds.width / 2)
    const yPos = process.platform === 'darwin' ? Math.round(y + bounds.height) : Math.round(y - height)

    trayWindow!.setPosition(xPos, yPos)
    trayWindow!.show()
    trayWindow!.webContents.send('tray:focus')
  })

  tray.on('right-click', () => {
    tray?.popUpContextMenu(contextMenu)
  })
}

app.whenReady().then(() => {
  createWindow()
  createTrayWindow()
  setupTray()

  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    } else {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Helper: send progress to renderer
function sendProgress(channel: string, current: number, total: number, label: string) {
  mainWindow?.webContents.send('scan:progress', { channel, current, total, label })
}

// ─── Disk Info ──────────────────────────────────────────────────────────────
ipcMain.handle('disk:getInfo', async () => {
  return getDiskInfo()
})

// ─── Quick Scan ─────────────────────────────────────────────────────────────
ipcMain.handle('scan:quick', async () => {
  return quickScan()
})

// ─── System Cache ───────────────────────────────────────────────────────────
ipcMain.handle('scan:caches', async () => {
  return scanCaches((p) => sendProgress('caches', p.current, p.total, p.label))
})

// ─── Dev Tools ──────────────────────────────────────────────────────────────
ipcMain.handle('scan:devtools', async () => {
  return scanDevTools((p) => sendProgress('devtools', p.current, p.total, p.label))
})

// ─── node_modules finder ────────────────────────────────────────────────────
ipcMain.handle('scan:nodeModules', async (_e, roots: string[]) => {
  return findNodeModules(roots, (found, current) => {
    mainWindow?.webContents.send('scan:progress', {
      channel: 'nodeModules',
      current: found,
      total: -1,
      label: current,
    })
  })
})

// ─── Clean (move to trash) ──────────────────────────────────────────────────
ipcMain.handle('clean:moveToTrash', async (_e, paths: string[]) => {
  const result = await moveToTrash(paths)
  if (result.success.length > 0) {
    clearScanCache()
    trayWindow?.webContents.send('tray:cacheCleared')
  }
  return result
})

// ─── Settings ───────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => getSettings())
ipcMain.handle('settings:save', (_e, s: Parameters<typeof saveSettings>[0]) => saveSettings(s))

// ─── App Leftovers ──────────────────────────────────────────────────────────
ipcMain.handle('scan:leftovers', async () => {
  return scanAppLeftovers((p) => sendProgress('leftovers', p.current, p.total, p.label))
})

// ─── Large Files ─────────────────────────────────────────────────────────────
ipcMain.handle('scan:largeFiles', async (_e, thresholdMB: number) => {
  return scanLargeFiles(thresholdMB, (p) => sendProgress('largeFiles', p.current, p.total, p.label))
})

// ─── Logs ────────────────────────────────────────────────────────────────────
ipcMain.handle('scan:logs', async () => {
  return scanLogs((p) => sendProgress('logs', p.current, p.total, p.label))
})

// ─── Downloads ───────────────────────────────────────────────────────────────
ipcMain.handle('scan:downloads', async () => {
  return scanDownloads((p) => sendProgress('downloads', p.current, p.total, p.label))
})

ipcMain.handle('disk:trashInfo', async () => getTrashInfo())

ipcMain.handle('clean:emptyTrash', async () => {
  const result = await emptyTrash()
  clearScanCache()
  trayWindow?.webContents.send('tray:cacheCleared')
  return result
})

ipcMain.handle('clean:deleteDSStores', async () => deleteDSStores())

// ─── Shell ──────────────────────────────────────────────────────────────────
ipcMain.handle('shell:openPath', (_e, p: string) => shell.openPath(p))
ipcMain.handle('shell:showItemInFolder', (_e, p: string) => shell.showItemInFolder(p))

// ─── Tray ─────────────────────────────────────────────────────────────────
ipcMain.handle('tray:openMainWindow', () => {
  if (!mainWindow) createWindow()
  else { mainWindow.show(); mainWindow.focus() }
  trayWindow?.hide()
})

// ─── Scan Cache (tray quick totals) ──────────────────────────────────────
ipcMain.handle('cache:getScan', (): ScanCache | null => getScanCache())
ipcMain.handle('cache:saveScan', (_e, result: QuickScanResult): ScanCache => saveScanCache(result))
ipcMain.handle('cache:clearScan', () => clearScanCache())

// ─── Results Cache (detailed entries for main app) ────────────────────────
ipcMain.handle('cache:getResults', () => getResultsCache())
ipcMain.handle('cache:saveResults', (_e, key: ScanKey, entries: unknown[]) => saveResultsCache(key, entries))
ipcMain.handle('cache:clearResults', (_e, key?: ScanKey) => clearResultsCache(key))
