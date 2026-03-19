import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import os from 'os'

export interface AppSettings {
  scanRoots: string[]
  largFileThresholdMB: number
  thresholdDays: number
}

const DEFAULTS: AppSettings = {
  scanRoots: [os.homedir()],
  largFileThresholdMB: 100,
  thresholdDays: 30,
}

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function getSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(settings: Partial<AppSettings>): boolean {
  try {
    const current = getSettings()
    const merged = { ...current, ...settings }
    fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8')
    return true
  } catch {
    return false
  }
}
