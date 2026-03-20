import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import {
  getDiskInfo, scanCaches, scanDevTools, quickScan, findNodeModules,
  scanAppLeftovers, scanLargeFiles, scanLogs, scanDownloads, getTrashInfo,
} from './services/scanner'
import { moveToTrash, emptyTrash, deleteDSStores } from './services/cleaner'
import { getSettings, saveSettings } from './services/settings'

let mainWindow: BrowserWindow | null = null

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

  if (isDev) mainWindow.loadURL('http://localhost:5173')
  else mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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
  return moveToTrash(paths)
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

ipcMain.handle('clean:emptyTrash', async () => emptyTrash())

ipcMain.handle('clean:deleteDSStores', async () => deleteDSStores())

// ─── Shell ──────────────────────────────────────────────────────────────────
ipcMain.handle('shell:openPath', (_e, p: string) => shell.openPath(p))
ipcMain.handle('shell:showItemInFolder', (_e, p: string) => shell.showItemInFolder(p))
