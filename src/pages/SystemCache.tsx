import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes, timeAgo } from '../utils/format'
import type { ScanEntry } from '../types/electron'

const SystemCache: React.FC = () => {
  const { cacheEntries, setCacheEntries, removeCacheEntries, scanning, setScanning, scanProgress } = useAppStore()
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
      // Refresh disk info
      window.electronAPI.getDiskInfo().then(useAppStore.getState().setDiskInfo).catch(() => {})
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

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? <span style={{ color: '#06b6d4' }}>{sortDir === 'desc' ? ' ↓' : ' ↑'}</span> : null

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ── */}
      <PageHeader
        title="Cache Hệ thống"
        subtitle={`~/Library/Caches — ${cacheEntries.length} mục, tổng ${formatBytes(totalSize)}`}
        color="#a855f7"
      />

      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0,
      }}>
        <Btn onClick={doScan} disabled={isScanning} primary>
          {isScanning ? '⟳ Đang quét...' : '🔎 Quét cache'}
        </Btn>

        {selected.size > 0 && (
          <Btn onClick={doClean} disabled={cleaning} danger>
            {cleaning ? '⟳ Đang xóa...' : `🗑 Xóa vào Trash (${formatBytes(selectedSize)})`}
          </Btn>
        )}

        <div style={{ flex: 1 }} />

        {/* Progress */}
        {isScanning && progress && (
          <div style={{ color: '#555', fontSize: 11, fontFamily: 'monospace', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            [{progress.current}/{progress.total}] {progress.label}
          </div>
        )}

        {/* Result badge */}
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
                <Th onClick={() => toggleSort('name')} style={{ cursor: 'pointer' }}>
                  Tên <SortIcon col="name" />
                </Th>
                <Th width={100} onClick={() => toggleSort('size')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  Dung lượng <SortIcon col="size" />
                </Th>
                <Th width={120} onClick={() => toggleSort('mtime')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                  Lần cuối <SortIcon col="mtime" />
                </Th>
                <Th width={80} />
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
          <span style={{ color: '#333', fontSize: 11 }}>{sorted.length} mục</span>
          {selected.size > 0 && (
            <span style={{ color: '#06b6d4', fontSize: 11 }}>
              Đã chọn {selected.size} ({formatBytes(selectedSize)})
            </span>
          )}
          <span style={{ flex: 1 }} />
          <span style={{ color: '#222', fontSize: 11 }}>
            ⚠ Chuyển vào Trash — có thể khôi phục
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function PageHeader({ title, subtitle, color }: { title: string; subtitle: string; color: string }) {
  return (
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0', marginBottom: 3 }}>{title}</h2>
      <div style={{ color: color + '99', fontSize: 11, fontFamily: 'monospace' }}>{subtitle}</div>
    </div>
  )
}

function Btn({ children, onClick, disabled, primary, danger }: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px', borderRadius: 7, border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 12, fontWeight: 500,
        background: disabled ? '#1a1a1a' : primary ? '#06b6d4' : danger ? '#ef4444' : '#2a2a2a',
        color: disabled ? '#333' : '#fff',
        display: 'flex', alignItems: 'center', gap: 5,
      }}
    >
      {children}
    </button>
  )
}

function Th({ children, width, onClick, style }: {
  children?: React.ReactNode; width?: number
  onClick?: () => void; style?: React.CSSProperties
}) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '8px 12px', textAlign: 'left', color: '#444',
        fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
        borderBottom: '1px solid #1a1a1a',
        width: width, userSelect: 'none', ...style,
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
        borderBottom: '1px solid #111',
        cursor: 'default',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#ffffff05' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? '#06b6d412' : 'transparent' }}
    >
      <td style={{ padding: '7px 12px', width: 40 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
      </td>
      <td style={{ padding: '7px 12px' }}>
        <div style={{ color: '#d0d0d0', fontSize: 12 }}>{entry.name}</div>
        <div style={{ color: '#2a2a2a', fontSize: 10, fontFamily: 'monospace', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
          {entry.path}
        </div>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <SizeBar size={entry.size} />
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right', color: '#444', fontSize: 11 }}>
        {timeAgo(entry.mtime)}
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <button
          onClick={onReveal}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2a2a2a', fontSize: 13 }}
          title="Hiện trong Finder"
        >⎋</button>
      </td>
    </tr>
  )
}

function SizeBar({ size }: { size: number }) {
  const mb = size / 1024 / 1024
  const color = mb > 500 ? '#ef4444' : mb > 100 ? '#f59e0b' : mb > 10 ? '#06b6d4' : '#333'
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
      alignItems: 'center', justifyContent: 'center', gap: 12, color: '#333',
    }}>
      {isScanning ? (
        <>
          <div style={{ fontSize: 40 }} className="animate-spin-slow">⟳</div>
          <div style={{ fontSize: 13 }}>Đang quét cache...</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 48 }}>🗄</div>
          <div style={{ fontSize: 14, color: '#555' }}>Chưa quét</div>
          <div style={{ fontSize: 12 }}>Nhấn "Quét cache" để bắt đầu</div>
          <button
            onClick={onScan}
            style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#a855f7', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
          >🔎 Quét ngay</button>
        </>
      )}
    </div>
  )
}

export default SystemCache
