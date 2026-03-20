import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export type ScanKey = 'caches' | 'devtools' | 'nodeModules' | 'leftovers' | 'largeFiles' | 'logs' | 'downloads'

export interface CachedScan {
  entries: unknown[]
  timestamp: number
}

export type ResultsCache = Partial<Record<ScanKey, CachedScan>>

function cachePath(): string {
  return path.join(app.getPath('userData'), 'results-cache.json')
}

export function getResultsCache(): ResultsCache {
  try {
    const raw = fs.readFileSync(cachePath(), 'utf-8')
    return JSON.parse(raw) as ResultsCache
  } catch {
    return {}
  }
}

export function saveResultsCache(key: ScanKey, entries: unknown[]): void {
  const cache = getResultsCache()
  cache[key] = { entries, timestamp: Date.now() }
  fs.writeFileSync(cachePath(), JSON.stringify(cache), 'utf-8')
}

export function clearResultsCache(key?: ScanKey): void {
  if (key) {
    const cache = getResultsCache()
    delete cache[key]
    fs.writeFileSync(cachePath(), JSON.stringify(cache), 'utf-8')
  } else {
    try { fs.unlinkSync(cachePath()) } catch { /* ignore */ }
  }
}
