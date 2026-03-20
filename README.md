# CleanTool — macOS Disk Cleaner

A lightweight, fast macOS disk cleaner built with Electron + React + TypeScript. Clean up junk files safely — everything goes to **Trash**, never permanently deleted.

![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Electron](https://img.shields.io/badge/electron-30-blue)
![React](https://img.shields.io/badge/react-18-61dafb)
![TypeScript](https://img.shields.io/badge/typescript-5-3178c6)

---

## Features

### Dashboard
Real-time disk usage overview showing total, used, and free space with a color-coded progress bar (green → amber → red as disk fills). One-click **Quick Scan** estimates reclaimable space across all categories instantly.

### System Cache
Scans `~/Library/Caches` and lists every subdirectory with its size and last-modified date. Sort by name, size, or date. Select individual entries or all, then move to Trash in one click.

### Dev Tools
Two sub-sections for developers:

**Package Manager Caches** — detects and sizes caches for:
- npm, Yarn, pnpm, Bun
- Homebrew
- Xcode DerivedData, iOS DeviceSupport, Simulator runtimes
- CocoaPods
- pip, Gradle, Cargo (Rust), Go modules

**node_modules Finder** — recursively searches configured directories (Documents, Projects, Desktop, etc.) for `node_modules` folders across all your projects. Shows size and last-used date so you can safely remove dependencies from old projects.

### App Leftovers
Scans three macOS library locations:
- `~/Library/Application Support`
- `~/Library/Containers`
- `~/Library/Group Containers`

Compares entries against installed apps (`/Applications` + `~/Applications`) and flags **orphan** entries — leftover data from apps that have already been uninstalled. Orphans are visually highlighted so you can clean them up with confidence.

### Large Files
Searches your entire home folder for files exceeding a configurable size threshold (default: 100 MB). Results are filtered by type:

| Type | Extensions |
|------|-----------|
| Video | mp4, mov, avi, mkv, m4v, wmv, flv, webm |
| Disk Image | dmg, iso, img, sparseimage |
| Archive | zip, tar, gz, bz2, rar, 7z, tgz |
| Document | pdf, doc, docx, ppt, pptx, xls, xlsx, pages, numbers, key |
| Image | jpg, jpeg, png, gif, bmp, tiff, heic, raw, psd |

Sort by size or date. Click the folder icon to reveal any file in Finder.

### Logs & Reports
Scans three log locations:
- `~/Library/Logs` — user application logs
- `~/Library/Logs/DiagnosticReports` — crash reports
- `/Library/Logs` — system-level logs

Shows age in days so you can identify stale logs that are safe to remove.

### Downloads
Lists everything in `~/Downloads` with file type detection, size, and age in days. Useful for clearing out old installers, archives, and media files that accumulate over time.

### Settings
Configure CleanTool's behavior:
- **Scan roots** — directories to search for `node_modules` (one path per line)
- **Large file threshold** — minimum file size in MB for the Large Files scan
- **Unused days threshold** — files older than this many days are flagged for review

---

## Safety

> **CleanTool never permanently deletes files.**
> All removals move items to the macOS **Trash**. You can recover anything at any time from Trash in Finder.

---

## Requirements

- macOS 11 Big Sur or later
- Apple Silicon or Intel

---

## Installation

Download the latest `.dmg` from the [Releases](../../releases) page, open it, and drag **CleanTool** to your Applications folder.

---

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build distributable (.dmg)
npm run electron:build

xattr -cr /Applications/MacCleanTool.app
```

### Tech stack
- **Electron 30** — native macOS integration
- **React 18** + **TypeScript 5** — UI
- **Zustand** — state management
- **Vite** — bundler
- **Tailwind CSS** — utility styles
- **electron-builder** — packaging & distribution

---

## License

MIT
