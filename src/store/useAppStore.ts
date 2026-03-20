import { create } from 'zustand'
import type {
  DiskInfo, ScanEntry, DevEntry, QuickScanResult, AppSettings,
  LeftoverEntry, LargeFileEntry, LogEntry, DownloadEntry, TrashInfo,
} from '../types/electron'
import type { Lang } from '../i18n/translations'

export type TabId = 'dashboard' | 'caches' | 'devtools' | 'leftovers' | 'largefiles' | 'logs' | 'downloads' | 'settings'

interface AppStore {
  language: Lang
  activeTab: TabId
  diskInfo: DiskInfo | null
  quickScan: QuickScanResult | null
  cacheEntries: ScanEntry[]
  devEntries: DevEntry[]
  nodeModules: ScanEntry[]
  leftoverEntries: LeftoverEntry[]
  largeFileEntries: LargeFileEntry[]
  logEntries: LogEntry[]
  downloadEntries: DownloadEntry[]
  trashInfo: TrashInfo | null
  settings: AppSettings | null
  scanning: Record<string, boolean>
  scanProgress: Record<string, { current: number; total: number; label: string }>
  scanTimestamps: Record<string, number>

  setLanguage: (lang: Lang) => void
  setActiveTab: (tab: TabId) => void
  setDiskInfo: (info: DiskInfo) => void
  setQuickScan: (r: QuickScanResult) => void
  setCacheEntries: (entries: ScanEntry[]) => void
  setDevEntries: (entries: DevEntry[]) => void
  setNodeModules: (entries: ScanEntry[]) => void
  setLeftoverEntries: (entries: LeftoverEntry[]) => void
  setLargeFileEntries: (entries: LargeFileEntry[]) => void
  setLogEntries: (entries: LogEntry[]) => void
  setDownloadEntries: (entries: DownloadEntry[]) => void
  setTrashInfo: (info: TrashInfo) => void
  setSettings: (s: AppSettings) => void
  setScanning: (key: string, v: boolean) => void
  setScanProgress: (key: string, p: { current: number; total: number; label: string }) => void
  setScanTimestamp: (key: string, ts: number) => void
  removeCacheEntries: (paths: string[]) => void
  removeDevEntries: (paths: string[]) => void
  removeNodeModules: (paths: string[]) => void
  removeLeftoverEntries: (paths: string[]) => void
  removeLargeFileEntries: (paths: string[]) => void
  removeLogEntries: (paths: string[]) => void
  removeDownloadEntries: (paths: string[]) => void
}

export const useAppStore = create<AppStore>((set) => ({
  language: 'en',
  activeTab: 'dashboard',
  diskInfo: null,
  quickScan: null,
  cacheEntries: [],
  devEntries: [],
  nodeModules: [],
  leftoverEntries: [],
  largeFileEntries: [],
  logEntries: [],
  downloadEntries: [],
  trashInfo: null,
  settings: null,
  scanning: {},
  scanProgress: {},
  scanTimestamps: {},

  setLanguage: (language) => set({ language }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDiskInfo: (diskInfo) => set({ diskInfo }),
  setQuickScan: (quickScan) => set({ quickScan }),
  setCacheEntries: (cacheEntries) => set({ cacheEntries }),
  setDevEntries: (devEntries) => set({ devEntries }),
  setNodeModules: (nodeModules) => set({ nodeModules }),
  setLeftoverEntries: (leftoverEntries) => set({ leftoverEntries }),
  setLargeFileEntries: (largeFileEntries) => set({ largeFileEntries }),
  setLogEntries: (logEntries) => set({ logEntries }),
  setDownloadEntries: (downloadEntries) => set({ downloadEntries }),
  setTrashInfo: (trashInfo) => set({ trashInfo }),
  setSettings: (settings) => set({ settings }),
  setScanning: (key, v) => set((s) => ({ scanning: { ...s.scanning, [key]: v } })),
  setScanProgress: (key, p) =>
    set((s) => ({ scanProgress: { ...s.scanProgress, [key]: p } })),
  setScanTimestamp: (key, ts) =>
    set((s) => ({ scanTimestamps: { ...s.scanTimestamps, [key]: ts } })),
  removeCacheEntries: (paths) =>
    set((s) => ({ cacheEntries: s.cacheEntries.filter((e) => !paths.includes(e.path)) })),
  removeDevEntries: (paths) =>
    set((s) => ({ devEntries: s.devEntries.filter((e) => !paths.includes(e.path)) })),
  removeNodeModules: (paths) =>
    set((s) => ({ nodeModules: s.nodeModules.filter((e) => !paths.includes(e.path)) })),
  removeLeftoverEntries: (paths) =>
    set((s) => ({ leftoverEntries: s.leftoverEntries.filter((e) => !paths.includes(e.path)) })),
  removeLargeFileEntries: (paths) =>
    set((s) => ({ largeFileEntries: s.largeFileEntries.filter((e) => !paths.includes(e.path)) })),
  removeLogEntries: (paths) =>
    set((s) => ({ logEntries: s.logEntries.filter((e) => !paths.includes(e.path)) })),
  removeDownloadEntries: (paths) =>
    set((s) => ({ downloadEntries: s.downloadEntries.filter((e) => !paths.includes(e.path)) })),
}))
