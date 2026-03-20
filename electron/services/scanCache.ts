import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { QuickScanResult } from '../preload'

export interface ScanCache {
  result: QuickScanResult
  timestamp: number // unix ms
}

function cachePath(): string {
  return path.join(app.getPath('userData'), 'scan-cache.json')
}

export function getScanCache(): ScanCache | null {
  try {
    const raw = fs.readFileSync(cachePath(), 'utf-8')
    return JSON.parse(raw) as ScanCache
  } catch {
    return null
  }
}

export function saveScanCache(result: QuickScanResult): ScanCache {
  const cache: ScanCache = { result, timestamp: Date.now() }
  fs.writeFileSync(cachePath(), JSON.stringify(cache), 'utf-8')
  return cache
}

export function clearScanCache(): void {
  try { fs.unlinkSync(cachePath()) } catch { /* ignore */ }
}
