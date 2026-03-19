import { shell } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import fs from 'fs'

const execAsync = promisify(execFile)
const HOME = os.homedir()

export interface CleanResult {
  success: string[]
  failed: Array<{ path: string; error: string }>
  freedBytes: number
}

// Move items to trash (safe — recoverable)
export async function moveToTrash(paths: string[]): Promise<CleanResult> {
  const result: CleanResult = { success: [], failed: [], freedBytes: 0 }

  for (const p of paths) {
    try {
      // Get size before trashing
      let size = 0
      try {
        const stat = fs.statSync(p)
        size = stat.size
      } catch { /* skip size calc */ }

      await shell.trashItem(p)
      result.success.push(p)
      result.freedBytes += size
    } catch (err) {
      result.failed.push({ path: p, error: String(err) })
    }
  }

  return result
}

// Empty macOS Trash via AppleScript
export async function emptyTrash(): Promise<void> {
  await execAsync('osascript', ['-e', 'tell application "Finder" to empty trash'])
}

// Delete all .DS_Store files in home folder, return count deleted
export async function deleteDSStores(): Promise<number> {
  let count = 0
  try {
    const { stdout } = await execAsync('find', [HOME, '-name', '.DS_Store', '-type', 'f'], { timeout: 30000 })
    const files = stdout.trim().split('\n').filter(Boolean)
    for (const f of files) {
      try { fs.unlinkSync(f); count++ } catch {}
    }
  } catch {}
  return count
}
