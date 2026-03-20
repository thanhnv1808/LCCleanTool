import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import os from 'os'
import fs from 'fs'

const execAsync = promisify(execFile)
const HOME = os.homedir()

export interface DiskInfo {
  total: number
  used: number
  free: number
  percent: number
  mount: string
}

export interface ScanEntry {
  name: string
  path: string
  size: number
  mtime: number
  type: 'dir' | 'file'
}

export interface ScanProgress {
  current: number
  total: number
  label: string
}

export type ProgressCb = (p: ScanProgress) => void

// ─── Disk info via df ──────────────────────────────────────────────────────
export async function getDiskInfo(): Promise<DiskInfo> {
  const { stdout } = await execAsync('df', ['-Pk', '/'])
  const lines = stdout.trim().split('\n')
  const parts = lines[1].trim().split(/\s+/)
  const total = parseInt(parts[1], 10) * 1024
  const used  = parseInt(parts[2], 10) * 1024
  const free  = parseInt(parts[3], 10) * 1024
  return { total, used, free, percent: Math.round((used / total) * 100), mount: '/' }
}

// ─── Directory size via du ─────────────────────────────────────────────────
export async function getDirSize(dirPath: string): Promise<number> {
  try {
    const { stdout } = await execAsync('du', ['-sk', dirPath])
    const kb = parseInt(stdout.trim().split('\t')[0], 10)
    return isNaN(kb) ? 0 : kb * 1024
  } catch {
    return 0
  }
}

// ─── Read subdirectories of a dir ─────────────────────────────────────────
function listSubdirs(dirPath: string): string[] {
  try {
    return fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter((d) => d.isDirectory() || d.isSymbolicLink())
      .map((d) => d.name)
  } catch {
    return []
  }
}

// ─── Scan ~/Library/Caches ────────────────────────────────────────────────
export async function scanCaches(onProgress?: ProgressCb): Promise<ScanEntry[]> {
  const cacheDir = path.join(HOME, 'Library', 'Caches')
  const names = listSubdirs(cacheDir)
  const entries: ScanEntry[] = []

  for (let i = 0; i < names.length; i++) {
    const name = names[i]
    const fullPath = path.join(cacheDir, name)
    onProgress?.({ current: i + 1, total: names.length, label: name })

    const size = await getDirSize(fullPath)
    let mtime = 0
    try { mtime = fs.statSync(fullPath).mtimeMs } catch { /* skip */ }

    if (size > 0) {
      entries.push({ name, path: fullPath, size, mtime, type: 'dir' })
    }
  }

  return entries.sort((a, b) => b.size - a.size)
}

// ─── Dev Tools scan ───────────────────────────────────────────────────────
interface DevCategory {
  key: string
  label: string
  paths: string[]
}

const DEV_CATEGORIES: DevCategory[] = [
  {
    key: 'npm',
    label: 'npm cache',
    paths: [path.join(HOME, '.npm', '_cacache')],
  },
  {
    key: 'yarn',
    label: 'Yarn cache',
    paths: [
      path.join(HOME, 'Library', 'Caches', 'Yarn'),
      path.join(HOME, '.yarn', 'cache'),
    ],
  },
  {
    key: 'pnpm',
    label: 'pnpm store',
    paths: [path.join(HOME, '.pnpm-store'), path.join(HOME, 'Library', 'pnpm', 'store')],
  },
  {
    key: 'bun',
    label: 'Bun cache',
    paths: [path.join(HOME, '.bun')],
  },
  {
    key: 'homebrew',
    label: 'Homebrew cache',
    paths: [path.join(HOME, 'Library', 'Caches', 'Homebrew')],
  },
  {
    key: 'xcode_derived',
    label: 'Xcode DerivedData',
    paths: [path.join(HOME, 'Library', 'Developer', 'Xcode', 'DerivedData')],
  },
  {
    key: 'xcode_ios',
    label: 'Xcode iOS DeviceSupport',
    paths: [path.join(HOME, 'Library', 'Developer', 'Xcode', 'iOS DeviceSupport')],
  },
  {
    key: 'xcode_sim',
    label: 'Simulator runtimes',
    paths: [path.join(HOME, 'Library', 'Developer', 'CoreSimulator', 'Volumes')],
  },
  {
    key: 'cocoapods',
    label: 'CocoaPods cache',
    paths: [path.join(HOME, 'Library', 'Caches', 'CocoaPods')],
  },
  {
    key: 'pip',
    label: 'pip cache',
    paths: [path.join(HOME, 'Library', 'Caches', 'pip')],
  },
  {
    key: 'gradle',
    label: 'Gradle cache',
    paths: [path.join(HOME, '.gradle', 'caches')],
  },
  {
    key: 'cargo',
    label: 'Cargo registry',
    paths: [path.join(HOME, '.cargo', 'registry')],
  },
  {
    key: 'go',
    label: 'Go module cache',
    paths: [path.join(HOME, 'go', 'pkg', 'mod')],
  },
]

export interface DevEntry extends ScanEntry {
  key: string
  label: string
}

export async function scanDevTools(onProgress?: ProgressCb): Promise<DevEntry[]> {
  const results: DevEntry[] = []

  for (let i = 0; i < DEV_CATEGORIES.length; i++) {
    const cat = DEV_CATEGORIES[i]
    onProgress?.({ current: i + 1, total: DEV_CATEGORIES.length, label: cat.label })

    // Find first existing path
    const existingPath = cat.paths.find((p) => {
      try { return fs.existsSync(p) } catch { return false }
    })

    if (!existingPath) continue

    const size = await getDirSize(existingPath)
    if (size === 0) continue

    let mtime = 0
    try { mtime = fs.statSync(existingPath).mtimeMs } catch { /* skip */ }

    results.push({
      key: cat.key,
      label: cat.label,
      name: cat.label,
      path: existingPath,
      size,
      mtime,
      type: 'dir',
    })
  }

  return results.sort((a, b) => b.size - a.size)
}

// ─── node_modules finder ───────────────────────────────────────────────────
export async function findNodeModules(
  roots: string[],
  onProgress?: (found: number, current: string) => void,
): Promise<ScanEntry[]> {
  if (roots.length === 0) return []

  const results: ScanEntry[] = []

  // Use spawn to stream results — avoids losing data on timeout
  const foundPaths = await new Promise<string[]>((resolve) => {
    const paths: string[] = []
    const args = [
      ...roots,
      '-name', 'node_modules',
      '-type', 'd',
      '-prune',
    ]
    const proc = spawn('find', args)
    let buffer = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const p = line.trim()
        if (p) paths.push(p)
      }
    })
    proc.on('close', () => {
      if (buffer.trim()) paths.push(buffer.trim())
      resolve(paths)
    })
    proc.on('error', () => resolve(paths))
  })

  for (let i = 0; i < foundPaths.length; i++) {
    const p = foundPaths[i]
    onProgress?.(i + 1, p)
    const size = await getDirSize(p)
    if (size === 0) continue
    let mtime = 0
    try { mtime = fs.statSync(p).mtimeMs } catch { /* skip */ }
    results.push({ name: path.basename(path.dirname(p)), path: p, size, mtime, type: 'dir' })
  }

  return results.sort((a, b) => b.size - a.size)
}

// ─── App Leftovers ────────────────────────────────────────────────────────

export interface LeftoverEntry extends ScanEntry {
  category: 'appSupport' | 'containers' | 'groupContainers'
  isOrphan: boolean
}

function getInstalledAppInfo(): { names: Set<string>; bundleIds: Set<string> } {
  const names = new Set<string>()
  const bundleIds = new Set<string>()
  const appDirs = ['/Applications', path.join(HOME, 'Applications')]
  for (const dir of appDirs) {
    let apps: string[] = []
    try { apps = fs.readdirSync(dir).filter((f) => f.endsWith('.app')) } catch { continue }
    for (const app of apps) {
      names.add(app.replace(/\.app$/, '').toLowerCase())
      try {
        const content = fs.readFileSync(path.join(dir, app, 'Contents', 'Info.plist'), 'utf8')
        const idMatch = content.match(/<key>CFBundleIdentifier<\/key>\s*<string>([^<]+)<\/string>/)
        if (idMatch) bundleIds.add(idMatch[1].toLowerCase())
        const nm = content.match(/<key>CFBundleName<\/key>\s*<string>([^<]+)<\/string>/)
        if (nm) names.add(nm[1].toLowerCase())
        const dm = content.match(/<key>CFBundleDisplayName<\/key>\s*<string>([^<]+)<\/string>/)
        if (dm) names.add(dm[1].toLowerCase())
      } catch { /* binary plist or missing */ }
    }
  }
  return { names, bundleIds }
}

function checkOrphan(folderName: string, names: Set<string>, bundleIds: Set<string>): boolean {
  const lower = folderName.toLowerCase()
  if (bundleIds.has(lower)) return false
  if (names.has(lower)) return false
  for (const bid of bundleIds) {
    if (lower.startsWith(bid) || bid.startsWith(lower + '.')) return false
  }
  return true
}

export async function scanAppLeftovers(onProgress?: ProgressCb): Promise<LeftoverEntry[]> {
  const { names, bundleIds } = getInstalledAppInfo()
  const sections: Array<{ dir: string; category: LeftoverEntry['category'] }> = [
    { dir: path.join(HOME, 'Library', 'Application Support'), category: 'appSupport' },
    { dir: path.join(HOME, 'Library', 'Containers'), category: 'containers' },
    { dir: path.join(HOME, 'Library', 'Group Containers'), category: 'groupContainers' },
  ]

  const allDirs: Array<{ name: string; fullPath: string; category: LeftoverEntry['category'] }> = []
  for (const section of sections) {
    for (const name of listSubdirs(section.dir)) {
      allDirs.push({ name, fullPath: path.join(section.dir, name), category: section.category })
    }
  }

  const results: LeftoverEntry[] = []
  for (let i = 0; i < allDirs.length; i++) {
    const { name, fullPath, category } = allDirs[i]
    onProgress?.({ current: i + 1, total: allDirs.length, label: name })
    const size = await getDirSize(fullPath)
    if (size === 0) continue
    let mtime = 0
    try { mtime = fs.statSync(fullPath).mtimeMs } catch {}
    results.push({ name, path: fullPath, size, mtime, type: 'dir', category, isOrphan: checkOrphan(name, names, bundleIds) })
  }
  return results.sort((a, b) => b.size - a.size)
}

// ─── Large Files ──────────────────────────────────────────────────────────

export type LargeFileType = 'video' | 'disk-image' | 'archive' | 'document' | 'image' | 'other'

export interface LargeFileEntry extends ScanEntry {
  ext: string
  fileType: LargeFileType
}

function getLargeFileType(ext: string): LargeFileType {
  const e = ext.toLowerCase()
  if (['.mp4', '.mov', '.avi', '.mkv', '.m4v', '.wmv', '.flv', '.webm'].includes(e)) return 'video'
  if (['.dmg', '.iso', '.img', '.sparseimage'].includes(e)) return 'disk-image'
  if (['.zip', '.tar', '.gz', '.bz2', '.rar', '.7z', '.tgz'].includes(e)) return 'archive'
  if (['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.pages', '.numbers', '.key'].includes(e)) return 'document'
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.heic', '.raw', '.psd'].includes(e)) return 'image'
  return 'other'
}

export async function scanLargeFiles(thresholdMB: number, onProgress?: ProgressCb): Promise<LargeFileEntry[]> {
  const thresholdK = thresholdMB * 1024
  const results: LargeFileEntry[] = []
  try {
    const { stdout } = await execAsync('find', [
      HOME,
      '-not', '-path', '*/node_modules/*',
      '-not', '-path', '*/.git/*',
      '-not', '-path', '*/Library/Developer/Xcode/*',
      '-type', 'f',
      '-size', `+${thresholdK}k`,
    ], { timeout: 120000 })

    const lines = stdout.trim().split('\n').filter(Boolean)
    for (let i = 0; i < lines.length; i++) {
      const filePath = lines[i]
      onProgress?.({ current: i + 1, total: lines.length, label: path.basename(filePath) })
      let size = 0, mtime = 0
      try { const st = fs.statSync(filePath); size = st.size; mtime = st.mtimeMs } catch { continue }
      if (size < thresholdMB * 1024 * 1024) continue
      const ext = path.extname(filePath)
      results.push({ name: path.basename(filePath), path: filePath, size, mtime, type: 'file', ext, fileType: getLargeFileType(ext) })
    }
  } catch { /* timeout or permission denied */ }
  return results.sort((a, b) => b.size - a.size)
}

// ─── Logs ─────────────────────────────────────────────────────────────────

export interface LogEntry extends ScanEntry {
  category: 'userLogs' | 'systemLogs' | 'crashReports'
  ageDays: number
}

export async function scanLogs(onProgress?: ProgressCb): Promise<LogEntry[]> {
  const now = Date.now()
  const sections: Array<{ dir: string; category: LogEntry['category']; skipSub?: string }> = [
    { dir: path.join(HOME, 'Library', 'Logs'), category: 'userLogs', skipSub: 'DiagnosticReports' },
    { dir: path.join(HOME, 'Library', 'Logs', 'DiagnosticReports'), category: 'crashReports' },
    { dir: '/Library/Logs', category: 'systemLogs' },
  ]

  const allItems: Array<{ name: string; fullPath: string; category: LogEntry['category'] }> = []
  for (const section of sections) {
    try {
      const entries = fs.readdirSync(section.dir, { withFileTypes: true })
      for (const entry of entries) {
        if (section.skipSub && entry.name === section.skipSub) continue
        allItems.push({ name: entry.name, fullPath: path.join(section.dir, entry.name), category: section.category })
      }
    } catch {}
  }

  const results: LogEntry[] = []
  for (let i = 0; i < allItems.length; i++) {
    const { name, fullPath, category } = allItems[i]
    onProgress?.({ current: i + 1, total: allItems.length, label: name })
    let size = 0, mtime = 0, isDir = false
    try {
      const st = fs.statSync(fullPath)
      mtime = st.mtimeMs; isDir = st.isDirectory()
      size = isDir ? await getDirSize(fullPath) : st.size
    } catch { continue }
    if (size === 0) continue
    results.push({
      name, path: fullPath, size, mtime, type: isDir ? 'dir' : 'file',
      category, ageDays: Math.floor((now - mtime) / 86400000),
    })
  }
  return results.sort((a, b) => b.size - a.size)
}

// ─── Downloads ────────────────────────────────────────────────────────────

export type DownloadFileType = 'dmg' | 'archive' | 'video' | 'document' | 'image' | 'other'

export interface DownloadEntry extends ScanEntry {
  ext: string
  fileType: DownloadFileType
  ageDays: number
}

export interface TrashInfo {
  size: number
  path: string
}

function getDownloadFileType(ext: string): DownloadFileType {
  const e = ext.toLowerCase()
  if (['.dmg', '.iso', '.img'].includes(e)) return 'dmg'
  if (['.zip', '.tar', '.gz', '.bz2', '.rar', '.7z', '.tgz'].includes(e)) return 'archive'
  if (['.mp4', '.mov', '.avi', '.mkv', '.m4v'].includes(e)) return 'video'
  if (['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'].includes(e)) return 'document'
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.heic'].includes(e)) return 'image'
  return 'other'
}

export async function scanDownloads(onProgress?: ProgressCb): Promise<DownloadEntry[]> {
  const downloadsDir = path.join(HOME, 'Downloads')
  const now = Date.now()
  const results: DownloadEntry[] = []
  let files: string[] = []
  try { files = fs.readdirSync(downloadsDir).filter((f) => !f.startsWith('.')) } catch { return results }

  for (let i = 0; i < files.length; i++) {
    const name = files[i]
    const fullPath = path.join(downloadsDir, name)
    onProgress?.({ current: i + 1, total: files.length, label: name })
    let size = 0, mtime = 0, isDir = false
    try {
      const st = fs.statSync(fullPath)
      mtime = st.mtimeMs; isDir = st.isDirectory()
      size = isDir ? await getDirSize(fullPath) : st.size
    } catch { continue }
    if (size === 0) continue
    const ext = path.extname(name)
    results.push({
      name, path: fullPath, size, mtime, type: isDir ? 'dir' : 'file',
      ext, fileType: getDownloadFileType(ext), ageDays: Math.floor((now - mtime) / 86400000),
    })
  }
  return results.sort((a, b) => b.size - a.size)
}

export async function getTrashInfo(): Promise<TrashInfo> {
  const trashPath = path.join(HOME, '.Trash')
  let size = 0
  try {
    const items = fs.readdirSync(trashPath).filter((n) => n !== '.DS_Store' && n !== '.localized')
    const sizes = await Promise.all(items.map(async (item) => {
      const itemPath = path.join(trashPath, item)
      try {
        const st = fs.statSync(itemPath)
        return st.isDirectory() ? getDirSize(itemPath) : Promise.resolve(st.size)
      } catch { return 0 }
    }))
    size = sizes.reduce((a, b) => a + b, 0)
  } catch { /* no access or empty */ }
  return { size, path: trashPath }
}

// ─── Quick scan — just sizes, no file list ────────────────────────────────
export interface QuickScanResult {
  caches: number
  devTools: number
  downloads: number
  logs: number
}

export async function quickScan(): Promise<QuickScanResult> {
  const [caches, devTools, downloads, logs] = await Promise.all([
    getDirSize(path.join(HOME, 'Library', 'Caches')),
    Promise.all(
      DEV_CATEGORIES.map((c) => {
        const p = c.paths.find((x) => { try { return fs.existsSync(x) } catch { return false } })
        return p ? getDirSize(p) : Promise.resolve(0)
      }),
    ).then((sizes) => sizes.reduce((a, b) => a + b, 0)),
    getDirSize(path.join(HOME, 'Downloads')),
    getDirSize(path.join(HOME, 'Library', 'Logs')),
  ])

  return { caches, devTools, downloads, logs }
}
