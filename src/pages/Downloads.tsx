import React, { useState, useMemo } from 'react'
import { Search, Trash2, FolderOpen, Download } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes, timeAgo } from '../utils/format'
import type { DownloadEntry } from '../types/electron'

type FilterType = 'all' | 'dmg' | 'archive' | 'video' | 'document' | 'image' | 'other'

const TYPE_LABELS: Record<FilterType, string> = {
  all: 'Tất cả', dmg: 'DMG', archive: 'Archive',
  video: 'Video', document: 'Document', image: 'Image', other: 'Khác',
}

const TYPE_COLOR: Record<string, string> = {
  dmg: '#ef4444', archive: '#f59e0b', video: '#a855f7',
  document: '#06b6d4', image: '#22c55e', other: '#555',
}

const Downloads: React.FC = () => {
  const {
    downloadEntries, setDownloadEntries, removeDownloadEntries,
    setTrashInfo, scanning, setScanning, scanProgress,
  } = useAppStore()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<{ freed: number; failed: number } | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')

  const isScanning = scanning['downloads'] ?? false
  const progress = scanProgress['downloads']

  const doScan = async () => {
    setScanning('downloads', true)
    setSelected(new Set())
    setLastResult(null)
    try {
      const entries = await window.electronAPI.scanDownloads()
      setDownloadEntries(entries)
    } finally {
      setScanning('downloads', false)
    }
  }

  const doClean = async () => {
    if (selected.size === 0) return
    setCleaning(true)
    try {
      const result = await window.electronAPI.moveToTrash(Array.from(selected))
      removeDownloadEntries(result.success)
      setSelected(new Set())
      setLastResult({ freed: result.freedBytes, failed: result.failed.length })
      const [disk, trash] = await Promise.all([window.electronAPI.getDiskInfo(), window.electronAPI.getTrashInfo()])
      useAppStore.getState().setDiskInfo(disk)
      setTrashInfo(trash)
    } finally {
      setCleaning(false)
    }
  }

  const filtered = useMemo(() => {
    return filterType === 'all' ? downloadEntries : downloadEntries.filter((e) => e.fileType === filterType)
  }, [downloadEntries, filterType])

  const toggle = (path: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(path) ? n.delete(path) : n.add(path); return n })

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) setSelected(new Set())
    else setSelected(new Set(filtered.map((e) => e.path)))
  }

  const selectedSize = useMemo(
    () => filtered.filter((e) => selected.has(e.path)).reduce((s, e) => s + e.size, 0),
    [filtered, selected],
  )

  const countByType = (t: FilterType) =>
    t === 'all' ? downloadEntries.length : downloadEntries.filter((e) => e.fileType === t).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Download size={15} color="#22c55e" strokeWidth={1.5} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0' }}>Downloads</h2>
        </div>
        <p style={{ color: '#22c55e77', fontSize: 11, fontFamily: 'monospace', marginBottom: 16, paddingLeft: 23 }}>
          ~/Downloads
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <Btn onClick={doScan} disabled={isScanning} color="#22c55e" dark>
          <Search size={13} />
          {isScanning ? 'Đang quét...' : 'Quét Downloads'}
        </Btn>

        {selected.size > 0 && (
          <Btn onClick={doClean} disabled={cleaning} color="#ef4444">
            <Trash2 size={13} />
            {cleaning ? 'Đang xóa...' : `Xóa vào Trash (${formatBytes(selectedSize)})`}
          </Btn>
        )}

        <div style={{ flex: 1 }} />

        {isScanning && progress && (
          <div style={{ color: '#6b6b6b', fontSize: 11, fontFamily: 'monospace', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            [{progress.current}/{progress.total}] {progress.label}
          </div>
        )}
        {lastResult && (
          <div style={{ color: '#22c55e', fontSize: 11 }}>
            ✓ Đã giải phóng {formatBytes(lastResult.freed)}
            {lastResult.failed > 0 && <span style={{ color: '#ef4444' }}> · {lastResult.failed} lỗi</span>}
          </div>
        )}
      </div>

      {/* Type filter */}
      {downloadEntries.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0, flexWrap: 'wrap' }}>
          {(['all', 'dmg', 'archive', 'video', 'document', 'image', 'other'] as FilterType[]).map((t) => {
            const cnt = countByType(t)
            if (t !== 'all' && cnt === 0) return null
            const isActive = filterType === t
            return (
              <button
                key={t}
                onClick={() => { setFilterType(t); setSelected(new Set()) }}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11,
                  background: isActive ? (t === 'all' ? '#22c55e' : (TYPE_COLOR[t] ?? '#22c55e')) : '#1d1d1d',
                  color: isActive ? (t === 'all' || t === 'image' ? '#000' : '#fff') : '#6b6b6b',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {TYPE_LABELS[t]} {cnt > 0 && <span style={{ opacity: 0.75 }}>({cnt})</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* File list */}
      {filtered.length === 0 ? (
        <EmptyState isScanning={isScanning} onScan={doScan} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#111', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={thS(40)}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th style={thS()}>Tên file</th>
                <th style={thS(80)}>Loại</th>
                <th style={{ ...thS(110), textAlign: 'right' }}>Kích thước</th>
                <th style={{ ...thS(70), textAlign: 'right' }}>Tuổi</th>
                <th style={{ ...thS(110), textAlign: 'right' }}>Lần cuối</th>
                <th style={thS(44)} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <DownloadRow
                  key={entry.path}
                  entry={entry}
                  selected={selected.has(entry.path)}
                  onToggle={() => toggle(entry.path)}
                  onReveal={() => window.electronAPI.showItemInFolder(entry.path)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ padding: '6px 24px', borderTop: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', gap: 16 }}>
          <span style={{ color: '#5a5a5a', fontSize: 11 }}>{filtered.length} file</span>
          <span style={{ color: '#5a5a5a', fontSize: 11 }}>Tổng: {formatBytes(filtered.reduce((s, e) => s + e.size, 0))}</span>
          {selected.size > 0 && <span style={{ color: '#06b6d4', fontSize: 11 }}>Đã chọn {selected.size} ({formatBytes(selectedSize)})</span>}
          <span style={{ flex: 1 }} />
          <span style={{ color: '#3d3d3d', fontSize: 11 }}>⚠ Chuyển vào Trash</span>
        </div>
      )}
    </div>
  )
}

function DownloadRow({ entry, selected, onToggle, onReveal }: {
  entry: DownloadEntry; selected: boolean; onToggle: () => void; onReveal: () => void
}) {
  const mb = entry.size / 1024 / 1024
  const sizeColor = mb > 500 ? '#ef4444' : mb > 100 ? '#f59e0b' : '#888'
  const typeColor = TYPE_COLOR[entry.fileType] ?? '#555'
  const oldFile = entry.ageDays > 90

  return (
    <tr
      style={{ backgroundColor: selected ? '#22c55e12' : 'transparent', borderBottom: '1px solid #151515' }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#ffffff06' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? '#22c55e12' : 'transparent' }}
    >
      <td style={{ padding: '7px 12px', width: 40 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td style={{ padding: '7px 12px' }}>
        <div style={{ color: '#d0d0d0', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          {entry.name}
          {oldFile && <span style={{ color: '#f59e0b', fontSize: 9, background: '#f59e0b18', padding: '1px 6px', borderRadius: 8, fontWeight: 600 }}>cũ</span>}
        </div>
        <div style={{ color: '#525252', fontSize: 10, fontFamily: 'monospace', marginTop: 1, maxWidth: 380, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.path}
        </div>
      </td>
      <td style={{ padding: '7px 12px' }}>
        <span style={{ color: typeColor, fontSize: 10, background: typeColor + '18', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
          {entry.fileType}
        </span>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <span style={{ color: sizeColor, fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: mb > 100 ? 700 : 400 }}>
          {formatBytes(entry.size)}
        </span>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <span style={{ color: oldFile ? '#f59e0b' : '#5a5a5a', fontSize: 11 }}>
          {entry.ageDays === 0 ? 'hôm nay' : `${entry.ageDays}d`}
        </span>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right', color: '#6b6b6b', fontSize: 11 }}>
        {timeAgo(entry.mtime)}
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <button onClick={onReveal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4a4a', display: 'flex', alignItems: 'center' }}>
          <FolderOpen size={13} />
        </button>
      </td>
    </tr>
  )
}

function thS(width?: number): React.CSSProperties {
  return { padding: '8px 12px', textAlign: 'left', color: '#5a5a5a', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, borderBottom: '1px solid #1a1a1a', width, userSelect: 'none' }
}

function Btn({ children, onClick, disabled, color, dark }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; color: string; dark?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 13px', borderRadius: 7, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500,
      background: disabled ? '#1d1d1d' : color,
      color: disabled ? '#4a4a4a' : dark ? '#000' : '#fff',
      display: 'flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.7 : 1,
    }}>{children}</button>
  )
}

function EmptyState({ isScanning, onScan }: { isScanning: boolean; onScan: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {isScanning ? (
        <>
          <div style={{ animation: 'spin 1.5s linear infinite' }}><Search size={40} color="#22c55e50" strokeWidth={1} /></div>
          <div style={{ fontSize: 13, color: '#666' }}>Đang quét Downloads...</div>
        </>
      ) : (
        <>
          <Download size={48} color="#2a2a2a" strokeWidth={1} />
          <div style={{ fontSize: 14, color: '#666' }}>Chưa quét</div>
          <div style={{ fontSize: 12, color: '#4a4a4a' }}>Phân tích ~/Downloads để tìm file có thể xóa</div>
          <button onClick={onScan} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} /> Quét ngay
          </button>
        </>
      )}
    </div>
  )
}

export default Downloads
