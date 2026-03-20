import React, { useState, useMemo } from 'react'
import { Search, Trash2, FolderOpen, Database, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes, timeAgo, scanTimestampLabel } from '../utils/format'
import type { ScanEntry } from '../types/electron'

const SystemCache: React.FC = () => {
  const { cacheEntries, setCacheEntries, removeCacheEntries, scanning, setScanning, scanProgress, scanTimestamps } = useAppStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<{ freed: number; failed: number } | null>(null)
  const [sortBy, setSortBy] = useState<'size' | 'name' | 'mtime'>('size')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')

  const progress = scanProgress['caches']
  const isScanning = scanning['caches'] ?? false

  const doScan = async () => {
    setScanning('caches', true)
    setSelected(new Set())
    setLastResult(null)
    try {
      const entries = await window.electronAPI.scanCaches()
      setCacheEntries(entries)
      const ts = Date.now()
      useAppStore.getState().setScanTimestamp('caches', ts)
      window.electronAPI.saveResultsCache('caches', entries).catch(() => {})
    } finally {
      setScanning('caches', false)
    }
  }

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set())
    else setSelected(new Set(sorted.map((e) => e.path)))
  }

  const doClean = async () => {
    if (selected.size === 0) return
    setCleaning(true)
    try {
      const paths = Array.from(selected)
      const result = await window.electronAPI.moveToTrash(paths)
      removeCacheEntries(result.success)
      setSelected(new Set())
      setLastResult({ freed: result.freedBytes, failed: result.failed.length })
      window.electronAPI.getDiskInfo().then(useAppStore.getState().setDiskInfo).catch(() => {})
      const updated = useAppStore.getState().cacheEntries
      window.electronAPI.saveResultsCache('caches', updated).catch(() => {})
    } finally {
      setCleaning(false)
    }
  }

  const sorted = useMemo(() => {
    const arr = [...cacheEntries]
    arr.sort((a, b) => {
      let v = 0
      if (sortBy === 'size') v = a.size - b.size
      else if (sortBy === 'name') v = a.name.localeCompare(b.name)
      else if (sortBy === 'mtime') v = a.mtime - b.mtime
      return sortDir === 'desc' ? -v : v
    })
    return arr
  }, [cacheEntries, sortBy, sortDir])

  const selectedSize = useMemo(
    () => sorted.filter((e) => selected.has(e.path)).reduce((s, e) => s + e.size, 0),
    [sorted, selected],
  )

  const totalSize = cacheEntries.reduce((s, e) => s + e.size, 0)

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <ArrowUpDown size={11} style={{ opacity: 0.3, marginLeft: 3 }} />
    return sortDir === 'desc'
      ? <ArrowDown size={11} color="#06b6d4" style={{ marginLeft: 3 }} />
      : <ArrowUp size={11} color="#06b6d4" style={{ marginLeft: 3 }} />
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Database size={15} color="#a855f7" strokeWidth={1.5} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0' }}>Cache Hệ thống</h2>
        </div>
        <div style={{ color: '#a855f799', fontSize: 11, fontFamily: 'monospace', paddingLeft: 23 }}>
          ~/Library/Caches — {cacheEntries.length} mục, tổng {formatBytes(totalSize)}
          {scanTimestamps['caches'] && !isScanning && (
            <span style={{ color: '#3a3a3a', marginLeft: 8 }}>· {scanTimestampLabel(scanTimestamps['caches'])}</span>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0,
      }}>
        <Btn onClick={doScan} disabled={isScanning} color="#a855f7">
          <Search size={13} />
          {isScanning ? 'Đang quét...' : 'Quét cache'}
        </Btn>

        {selected.size > 0 && (
          <Btn onClick={doClean} disabled={cleaning} color="#ef4444">
            <Trash2 size={13} />
            {cleaning ? 'Đang xóa...' : `Xóa vào Trash (${formatBytes(selectedSize)})`}
          </Btn>
        )}

        <div style={{ flex: 1 }} />

        {isScanning && progress && (
          <div style={{ color: '#6b6b6b', fontSize: 11, fontFamily: 'monospace', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

      {/* ── Table ── */}
      {cacheEntries.length === 0 ? (
        <EmptyState isScanning={isScanning} onScan={doScan} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#111', position: 'sticky', top: 0, zIndex: 1 }}>
                <Th width={40}>
                  <input type="checkbox"
                    checked={selected.size === sorted.length && sorted.length > 0}
                    onChange={toggleAll}
                  />
                </Th>
                <Th onClick={() => toggleSort('name')} clickable>
                  <span style={{ display: 'flex', alignItems: 'center' }}>Tên <SortIcon col="name" /></span>
                </Th>
                <Th width={110} onClick={() => toggleSort('size')} clickable align="right">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Dung lượng <SortIcon col="size" /></span>
                </Th>
                <Th width={120} onClick={() => toggleSort('mtime')} clickable align="right">
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>Lần cuối <SortIcon col="mtime" /></span>
                </Th>
                <Th width={44} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => (
                <CacheRow
                  key={entry.path}
                  entry={entry}
                  selected={selected.has(entry.path)}
                  onToggle={() => toggleSelect(entry.path)}
                  onReveal={() => window.electronAPI.showItemInFolder(entry.path)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Status bar ── */}
      {cacheEntries.length > 0 && (
        <div style={{
          padding: '6px 24px', borderTop: '1px solid #1a1a1a', flexShrink: 0,
          display: 'flex', gap: 16, alignItems: 'center',
        }}>
          <span style={{ color: '#5a5a5a', fontSize: 11 }}>{sorted.length} mục</span>
          {selected.size > 0 && (
            <span style={{ color: '#06b6d4', fontSize: 11 }}>
              Đã chọn {selected.size} ({formatBytes(selectedSize)})
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ color: '#3d3d3d', fontSize: 11 }}>⚠ Chuyển vào Trash — có thể khôi phục</span>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Btn({ children, onClick, disabled, color }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; color: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 13px', borderRadius: 7, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 500,
        background: disabled ? '#1d1d1d' : color,
        color: disabled ? '#4a4a4a' : '#fff',
        display: 'flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.7 : 1,
      }}
    >
      {children}
    </button>
  )
}

function Th({ children, width, onClick, clickable, align }: {
  children?: React.ReactNode; width?: number
  onClick?: () => void; clickable?: boolean; align?: 'left' | 'right'
}) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '8px 12px', textAlign: align ?? 'left', color: '#5a5a5a',
        fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
        borderBottom: '1px solid #1a1a1a',
        width, userSelect: 'none',
        cursor: clickable ? 'pointer' : 'default',
      }}
    >{children}</th>
  )
}

function CacheRow({ entry, selected, onToggle, onReveal }: {
  entry: ScanEntry; selected: boolean
  onToggle: () => void; onReveal: () => void
}) {
  return (
    <tr
      style={{
        backgroundColor: selected ? '#06b6d412' : 'transparent',
        borderBottom: '1px solid #151515',
        cursor: 'default',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#ffffff06' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? '#06b6d412' : 'transparent' }}
    >
      <td style={{ padding: '7px 12px', width: 40 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td style={{ padding: '7px 12px' }}>
        <div style={{ color: '#d0d0d0', fontSize: 12 }}>{entry.name}</div>
        <div style={{ color: '#525252', fontSize: 10, fontFamily: 'monospace', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
          {entry.path}
        </div>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <SizeBar size={entry.size} />
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right', color: '#6b6b6b', fontSize: 11 }}>
        {timeAgo(entry.mtime)}
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <button
          onClick={onReveal}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4a4a', display: 'flex', alignItems: 'center' }}
          title="Hiện trong Finder"
        >
          <FolderOpen size={13} />
        </button>
      </td>
    </tr>
  )
}

function SizeBar({ size }: { size: number }) {
  const mb = size / 1024 / 1024
  const color = mb > 500 ? '#ef4444' : mb > 100 ? '#f59e0b' : mb > 10 ? '#06b6d4' : '#666'
  return (
    <span style={{ color, fontWeight: mb > 100 ? 700 : 400, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
      {formatBytes(size)}
    </span>
  )
}

function EmptyState({ isScanning, onScan }: { isScanning: boolean; onScan: () => void }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 12, color: '#3a3a3a',
    }}>
      {isScanning ? (
        <>
          <Database size={44} color="#a855f750" strokeWidth={1} />
          <div style={{ fontSize: 13, color: '#666' }}>Đang quét cache...</div>
        </>
      ) : (
        <>
          <Database size={48} color="#2a2a2a" strokeWidth={1} />
          <div style={{ fontSize: 14, color: '#666' }}>Chưa quét</div>
          <div style={{ fontSize: 12, color: '#4a4a4a' }}>Nhấn "Quét cache" để bắt đầu</div>
          <button
            onClick={onScan}
            style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#a855f7', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Search size={13} /> Quét ngay
          </button>
        </>
      )}
    </div>
  )
}

export default SystemCache
