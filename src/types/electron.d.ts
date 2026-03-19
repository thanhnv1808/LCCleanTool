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

export interface ElectronAPI {
  getDiskInfo(): Promise<DiskInfo>
  quickScan(): Promise<QuickScanResult>
  scanCaches(): Promise<ScanEntry[]>
  scanDevTools(): Promise<DevEntry[]>
  scanNodeModules(roots: string[]): Promise<ScanEntry[]>
  scanLeftovers(): Promise<LeftoverEntry[]>
  scanLargeFiles(thresholdMB: number): Promise<LargeFileEntry[]>
  scanLogs(): Promise<LogEntry[]>
  scanDownloads(): Promise<DownloadEntry[]>
  getTrashInfo(): Promise<TrashInfo>
  emptyTrash(): Promise<void>
  deleteDSStores(): Promise<number>
  moveToTrash(paths: string[]): Promise<CleanResult>
  getSettings(): Promise<AppSettings>
  saveSettings(s: Partial<AppSettings>): Promise<boolean>
  openPath(p: string): Promise<void>
  showItemInFolder(p: string): Promise<void>
  onScanProgress(cb: (p: ScanProgress) => void): () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
