import { contextBridge, ipcRenderer } from 'electron'

export interface DiskInfo {
  total: number; used: number; free: number; percent: number; mount: string
}
export interface ScanEntry {
  name: string; path: string; size: number; mtime: number; type: 'dir' | 'file'
}
export interface DevEntry extends ScanEntry {
  key: string; label: string
}
export interface QuickScanResult {
  caches: number; devTools: number; downloads: number; logs: number
}
export interface CleanResult {
  success: string[]; failed: Array<{ path: string; error: string }>; freedBytes: number
}
export interface AppSettings {
  scanRoots: string[]; largFileThresholdMB: number; thresholdDays: number
}
export interface ScanProgress {
  channel: string; current: number; total: number; label: string
}
export interface LeftoverEntry extends ScanEntry {
  category: 'appSupport' | 'containers' | 'groupContainers'; isOrphan: boolean
}
export interface LargeFileEntry extends ScanEntry {
  ext: string; fileType: 'video' | 'disk-image' | 'archive' | 'document' | 'image' | 'other'
}
export interface LogEntry extends ScanEntry {
  category: 'userLogs' | 'systemLogs' | 'crashReports'; ageDays: number
}
export interface DownloadEntry extends ScanEntry {
  ext: string; fileType: 'dmg' | 'archive' | 'video' | 'document' | 'image' | 'other'; ageDays: number
}
export interface TrashInfo { size: number; path: string }

const api = {
  // Disk
  getDiskInfo: (): Promise<DiskInfo> =>
    ipcRenderer.invoke('disk:getInfo'),

  // Scan
  quickScan: (): Promise<QuickScanResult> =>
    ipcRenderer.invoke('scan:quick'),
  scanCaches: (): Promise<ScanEntry[]> =>
    ipcRenderer.invoke('scan:caches'),
  scanDevTools: (): Promise<DevEntry[]> =>
    ipcRenderer.invoke('scan:devtools'),
  scanNodeModules: (roots: string[]): Promise<ScanEntry[]> =>
    ipcRenderer.invoke('scan:nodeModules', roots),

  // Clean
  moveToTrash: (paths: string[]): Promise<CleanResult> =>
    ipcRenderer.invoke('clean:moveToTrash', paths),

  // Settings
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:get'),
  saveSettings: (s: Partial<AppSettings>): Promise<boolean> =>
    ipcRenderer.invoke('settings:save', s),

  // New scanners
  scanLeftovers: (): Promise<LeftoverEntry[]> =>
    ipcRenderer.invoke('scan:leftovers'),
  scanLargeFiles: (thresholdMB: number): Promise<LargeFileEntry[]> =>
    ipcRenderer.invoke('scan:largeFiles', thresholdMB),
  scanLogs: (): Promise<LogEntry[]> =>
    ipcRenderer.invoke('scan:logs'),
  scanDownloads: (): Promise<DownloadEntry[]> =>
    ipcRenderer.invoke('scan:downloads'),
  getTrashInfo: (): Promise<TrashInfo> =>
    ipcRenderer.invoke('disk:trashInfo'),
  emptyTrash: (): Promise<void> =>
    ipcRenderer.invoke('clean:emptyTrash'),
  deleteDSStores: (): Promise<number> =>
    ipcRenderer.invoke('clean:deleteDSStores'),

  // Shell
  openPath: (p: string): Promise<void> =>
    ipcRenderer.invoke('shell:openPath', p),
  showItemInFolder: (p: string): Promise<void> =>
    ipcRenderer.invoke('shell:showItemInFolder', p),

  // Events
  onScanProgress: (cb: (p: ScanProgress) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, p: ScanProgress) => cb(p)
    ipcRenderer.on('scan:progress', handler)
    return () => ipcRenderer.removeListener('scan:progress', handler)
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
export type ElectronAPI = typeof api
