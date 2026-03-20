import React, { useState, useMemo } from 'react'
import { Search, Trash2, FolderOpen, FileSearch, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes, timeAgo, scanTimestampLabel } from '../utils/format'
import type { LargeFileEntry } from '../types/electron'

type FilterType = 'all' | 'video' | 'disk-image' | 'archive' | 'document' | 'image' | 'other'

const TYPE_LABELS: Record<FilterType, string> = {
  all: 'Tất cả',
  video: 'Video',
  'disk-image': 'Disk Image',
  archive: 'Archive',
  document: 'Document',
  image: 'Image',
  other: 'Khác',
}

const TYPE_COLOR: Record<string, string> = {
  video: '#a855f7', 'disk-image': '#ef4444', archive: '#f59e0b',
  document: '#06b6d4', image: '#22c55e', other: '#555',
}

const LargeFiles: React.FC = () => {
  const { largeFileEntries, setLargeFileEntries, removeLargeFileEntries, scanning, setScanning, scanProgress, settings, scanTimestamps } = useAppStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<{ freed: number; failed: number } | null>(null)
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<'size' | 'mtime'>('size')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const isScanning = scanning['largeFiles'] ?? false
  const progress = scanProgress['largeFiles']
  const thresholdMB = settings?.largFileThresholdMB ?? 100

  const doScan = async () => {
    setScanning('largeFiles', true)
    setSelected(new Set())
    setLastResult(null)
    try {
      const entries = await window.electronAPI.scanLargeFiles(thresholdMB)
      setLargeFileEntries(entries)
      useAppStore.getState().setScanTimestamp('largeFiles', Date.now())
      window.electronAPI.saveResultsCache('largeFiles', entries).catch(() => {})
    } finally {
      setScanning('largeFiles', false)
    }
  }

  const doClean = async () => {
    if (selected.size === 0) return
    setCleaning(true)
    try {
      const result = await window.electronAPI.moveToTrash(Array.from(selected))
      removeLargeFileEntries(result.success)
      setSelected(new Set())
      setLastResult({ freed: result.freedBytes, failed: result.failed.length })
      window.electronAPI.getDiskInfo().then(useAppStore.getState().setDiskInfo).catch(() => {})
      window.electronAPI.saveResultsCache('largeFiles', useAppStore.getState().largeFileEntries).catch(() => {})
    } finally {
      setCleaning(false)
    }
  }

  const filtered = useMemo(() => {
    let list = filterType === 'all' ? largeFileEntries : largeFileEntries.filter((e) => e.fileType === filterType)
    return [...list].sort((a, b) => {
      const v = sortBy === 'size' ? a.size - b.size : a.mtime - b.mtime
      return sortDir === 'desc' ? -v : v
    })
  }, [largeFileEntries, filterType, sortBy, sortDir])

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
    t === 'all' ? largeFileEntries.length : largeFileEntries.filter((e) => e.fileType === t).length

  const toggleSort = (col: 'size' | 'mtime') => {
    if (sortBy === col) setSortDir((d) => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: 'size' | 'mtime' }) => {
    if (sortBy !== col) return <ArrowUpDown size={11} style={{ opacity: 0.3, marginLeft: 3 }} />
    return sortDir === 'desc'
      ? <ArrowDown size={11} color="#ef4444" style={{ marginLeft: 3 }} />
      : <ArrowUp size={11} color="#ef4444" style={{ marginLeft: 3 }} />
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <FileSearch size={15} color="#ef4444" strokeWidth={1.5} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0' }}>File Lớn</h2>
        </div>
        <div style={{ color: '#ef444477', fontSize: 11, fontFamily: 'monospace', paddingLeft: 23 }}>
          ~ home folder · &gt; {thresholdMB} MB · {largeFileEntries.length} file tìm thấy
          {scanTimestamps['largeFiles'] && !isScanning && (
            <span style={{ color: '#3a3a3a', marginLeft: 8 }}>· {scanTimestampLabel(scanTimestamps['largeFiles'])}</span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <Btn onClick={doScan} disabled={isScanning} color="#ef4444">
          <Search size={13} />
          {isScanning ? 'Đang quét...' : 'Quét File Lớn'}
        </Btn>

        {selected.size > 0 && (
          <Btn onClick={doClean} disabled={cleaning} color="#dc2626">
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

      {/* Type filter pills */}
      {largeFileEntries.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0, flexWrap: 'wrap' }}>
          {(['all', 'video', 'disk-image', 'archive', 'document', 'image', 'other'] as FilterType[]).map((t) => {
            const cnt = countByType(t)
            if (t !== 'all' && cnt === 0) return null
            const isActive = filterType === t
            return (
              <button
                key={t}
                onClick={() => { setFilterType(t); setSelected(new Set()) }}
                style={{
                  padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 11,
                  background: isActive ? (t === 'all' ? '#ef4444' : (TYPE_COLOR[t] ?? '#ef4444')) : '#1d1d1d',
                  color: isActive ? '#fff' : '#6b6b6b',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {TYPE_LABELS[t]} {cnt > 0 && <span style={{ opacity: 0.7 }}>({cnt})</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState isScanning={isScanning} onScan={doScan} thresholdMB={thresholdMB} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#111', position: 'sticky', top: 0, zIndex: 1 }}>
                <th style={thS(40)}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </th>
                <th style={thS()}>Tên file</th>
                <th style={thS(90)}>Loại</th>
                <th style={{ ...thS(120), cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('size')}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Kích thước <SortIcon col="size" /></span>
                </th>
                <th style={{ ...thS(120), cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('mtime')}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Lần cuối <SortIcon col="mtime" /></span>
                </th>
                <th style={thS(44)} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <LargeFileRow
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

      {/* Status bar */}
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

function LargeFileRow({ entry, selected, onToggle, onReveal }: {
  entry: LargeFileEntry; selected: boolean; onToggle: () => void; onReveal: () => void
}) {
  const gb = entry.size / 1024 / 1024 / 1024
  const mb = entry.size / 1024 / 1024
  const sizeColor = gb > 1 ? '#ef4444' : mb > 500 ? '#f59e0b' : '#d0d0d0'
  const typeColor = TYPE_COLOR[entry.fileType] ?? '#555'

  return (
    <tr
      style={{ backgroundColor: selected ? '#ef444412' : 'transparent', borderBottom: '1px solid #151515' }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#ffffff06' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? '#ef444412' : 'transparent' }}
    >
      <td style={{ padding: '7px 12px', width: 40 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td style={{ padding: '7px 12px' }}>
        <div style={{ color: '#d0d0d0', fontSize: 12 }}>{entry.name}</div>
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
        <span style={{ color: sizeColor, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {formatBytes(entry.size)}
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

function Btn({ children, onClick, disabled, color }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; color: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 13px', borderRadius: 7, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500,
      background: disabled ? '#1d1d1d' : color, color: disabled ? '#4a4a4a' : '#fff',
      display: 'flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.7 : 1,
    }}>{children}</button>
  )
}

function EmptyState({ isScanning, onScan, thresholdMB }: { isScanning: boolean; onScan: () => void; thresholdMB: number }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {isScanning ? (
        <>
          <div style={{ animation: 'spin 1.5s linear infinite' }}><Search size={40} color="#ef444450" strokeWidth={1} /></div>
          <div style={{ fontSize: 13, color: '#666' }}>Đang tìm file lớn trong home folder...</div>
          <div style={{ fontSize: 11, color: '#4a4a4a' }}>Có thể mất 1–2 phút</div>
        </>
      ) : (
        <>
          <FileSearch size={48} color="#2a2a2a" strokeWidth={1} />
          <div style={{ fontSize: 14, color: '#666' }}>Chưa quét</div>
          <div style={{ fontSize: 12, color: '#4a4a4a' }}>Tìm file &gt; {thresholdMB} MB trong home folder</div>
          <button onClick={onScan} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} /> Quét ngay
          </button>
        </>
      )}
    </div>
  )
}

export default LargeFiles
