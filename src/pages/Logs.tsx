import React, { useState, useMemo } from 'react'
import { Search, Trash2, FolderOpen, ScrollText, Clock } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes, timeAgo } from '../utils/format'
import type { LogEntry } from '../types/electron'

type Category = 'userLogs' | 'systemLogs' | 'crashReports'
type AgeFilter = 'all' | '7' | '30'

const CATEGORY_LABELS: Record<Category, string> = {
  userLogs: 'User Logs',
  systemLogs: 'System Logs',
  crashReports: 'Crash Reports',
}

const CATEGORY_PATHS: Record<Category, string> = {
  userLogs: '~/Library/Logs',
  systemLogs: '/Library/Logs',
  crashReports: '~/Library/Logs/DiagnosticReports',
}

const Logs: React.FC = () => {
  const { logEntries, setLogEntries, removeLogEntries, scanning, setScanning, scanProgress } = useAppStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<{ freed: number; failed: number } | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('userLogs')
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all')

  const isScanning = scanning['logs'] ?? false
  const progress = scanProgress['logs']

  const doScan = async () => {
    setScanning('logs', true)
    setSelected(new Set())
    setLastResult(null)
    try {
      const entries = await window.electronAPI.scanLogs()
      setLogEntries(entries)
    } finally {
      setScanning('logs', false)
    }
  }

  const doClean = async () => {
    if (selected.size === 0) return
    setCleaning(true)
    try {
      const result = await window.electronAPI.moveToTrash(Array.from(selected))
      removeLogEntries(result.success)
      setSelected(new Set())
      setLastResult({ freed: result.freedBytes, failed: result.failed.length })
      window.electronAPI.getDiskInfo().then(useAppStore.getState().setDiskInfo).catch(() => {})
    } finally {
      setCleaning(false)
    }
  }

  const filtered = useMemo(() => {
    let list = logEntries.filter((e) => e.category === activeCategory)
    if (ageFilter !== 'all') {
      const days = parseInt(ageFilter, 10)
      list = list.filter((e) => e.ageDays >= days)
    }
    return list
  }, [logEntries, activeCategory, ageFilter])

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

  const catTotal = (c: Category) => logEntries.filter((e) => e.category === c).reduce((s, e) => s + e.size, 0)
  const catCount = (c: Category) => logEntries.filter((e) => e.category === c).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header + tabs */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <ScrollText size={15} color="#6b7280" strokeWidth={1.5} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0' }}>Logs & Crash Reports</h2>
        </div>
        <p style={{ color: '#6b728077', fontSize: 11, fontFamily: 'monospace', marginBottom: 16, paddingLeft: 23 }}>
          {CATEGORY_PATHS[activeCategory]}
        </p>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a' }}>
          {(['userLogs', 'systemLogs', 'crashReports'] as Category[]).map((c) => {
            const total = catTotal(c)
            const count = catCount(c)
            return (
              <button
                key={c}
                onClick={() => { setActiveCategory(c); setSelected(new Set()) }}
                style={{
                  padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: 12,
                  background: 'transparent',
                  color: activeCategory === c ? '#9ca3af' : '#5a5a5a',
                  borderBottom: activeCategory === c ? '2px solid #6b7280' : '2px solid transparent',
                  fontWeight: activeCategory === c ? 600 : 400,
                  marginBottom: -1,
                }}
              >
                {CATEGORY_LABELS[c]}
                {count > 0 && (
                  <span style={{ color: '#5a5a5a', marginLeft: 6, fontSize: 10 }}>
                    {count} · {formatBytes(total)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <Btn onClick={doScan} disabled={isScanning} color="#6b7280">
          <Search size={13} />
          {isScanning ? 'Đang quét...' : 'Quét Logs'}
        </Btn>

        {selected.size > 0 && (
          <Btn onClick={doClean} disabled={cleaning} color="#ef4444">
            <Trash2 size={13} />
            {cleaning ? 'Đang xóa...' : `Xóa vào Trash (${formatBytes(selectedSize)})`}
          </Btn>
        )}

        {/* Age filter */}
        {logEntries.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginLeft: 4, alignItems: 'center' }}>
            <Clock size={12} color="#4a4a4a" />
            {(['all', '7', '30'] as AgeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => { setAgeFilter(f); setSelected(new Set()) }}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11,
                  background: ageFilter === f ? '#6b7280' : '#1d1d1d',
                  color: ageFilter === f ? '#fff' : '#6b6b6b',
                }}
              >
                {f === 'all' ? 'Tất cả' : `> ${f} ngày`}
              </button>
            ))}
          </div>
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

      {/* Content */}
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
                <th style={thS()}>Tên</th>
                <th style={thS(44)}>Loại</th>
                <th style={{ ...thS(110), textAlign: 'right' }}>Dung lượng</th>
                <th style={{ ...thS(70), textAlign: 'right' }}>Tuổi</th>
                <th style={{ ...thS(120), textAlign: 'right' }}>Lần cuối</th>
                <th style={thS(44)} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <LogRow
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
          <span style={{ color: '#5a5a5a', fontSize: 11 }}>{filtered.length} mục</span>
          <span style={{ color: '#5a5a5a', fontSize: 11 }}>Tổng: {formatBytes(filtered.reduce((s, e) => s + e.size, 0))}</span>
          {selected.size > 0 && <span style={{ color: '#06b6d4', fontSize: 11 }}>Đã chọn {selected.size} ({formatBytes(selectedSize)})</span>}
          <span style={{ flex: 1 }} />
          <span style={{ color: '#3d3d3d', fontSize: 11 }}>⚠ Chuyển vào Trash</span>
        </div>
      )}
    </div>
  )
}

function LogRow({ entry, selected, onToggle, onReveal }: {
  entry: LogEntry; selected: boolean; onToggle: () => void; onReveal: () => void
}) {
  const mb = entry.size / 1024 / 1024
  const sizeColor = mb > 100 ? '#ef4444' : mb > 10 ? '#f59e0b' : '#6b6b6b'

  return (
    <tr
      style={{ backgroundColor: selected ? '#6b728012' : 'transparent', borderBottom: '1px solid #151515' }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#ffffff06' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? '#6b728012' : 'transparent' }}
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
        <span style={{ color: '#4a4a4a', fontSize: 11 }}>{entry.type === 'dir' ? '⊞' : '≡'}</span>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <span style={{ color: sizeColor, fontSize: 12, fontVariantNumeric: 'tabular-nums', fontWeight: mb > 10 ? 600 : 400 }}>
          {formatBytes(entry.size)}
        </span>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <span style={{ color: entry.ageDays > 90 ? '#6b7280' : '#5a5a5a', fontSize: 11 }}>
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

function EmptyState({ isScanning, onScan }: { isScanning: boolean; onScan: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {isScanning ? (
        <>
          <div style={{ animation: 'spin 1.5s linear infinite' }}><Search size={40} color="#6b728050" strokeWidth={1} /></div>
          <div style={{ fontSize: 13, color: '#666' }}>Đang quét logs...</div>
        </>
      ) : (
        <>
          <ScrollText size={48} color="#2a2a2a" strokeWidth={1} />
          <div style={{ fontSize: 14, color: '#666' }}>Chưa quét</div>
          <div style={{ fontSize: 12, color: '#4a4a4a' }}>Tìm log và crash report có thể xóa an toàn</div>
          <button onClick={onScan} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6b7280', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} /> Quét ngay
          </button>
        </>
      )}
    </div>
  )
}

export default Logs
