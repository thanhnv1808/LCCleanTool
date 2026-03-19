import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes, timeAgo } from '../utils/format'
import type { DevEntry, ScanEntry } from '../types/electron'

const DevTools: React.FC = () => {
  const {
    devEntries, nodeModules, setDevEntries, setNodeModules,
    removeDevEntries, removeNodeModules, scanning, setScanning, scanProgress, settings,
  } = useAppStore()
  const [selectedDev, setSelectedDev] = useState<Set<string>>(new Set())
  const [selectedNm, setSelectedNm] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<{ freed: number; failed: number } | null>(null)
  const [activeSection, setActiveSection] = useState<'devtools' | 'nodemodules'>('devtools')

  const isScanningDev = scanning['devtools'] ?? false
  const isScanningNm  = scanning['nodeModules'] ?? false
  const progressDev   = scanProgress['devtools']
  const progressNm    = scanProgress['nodeModules']

  const scanDev = async () => {
    setScanning('devtools', true)
    setSelectedDev(new Set())
    setLastResult(null)
    try {
      const entries = await window.electronAPI.scanDevTools()
      setDevEntries(entries)
    } finally {
      setScanning('devtools', false)
    }
  }

  const scanNm = async () => {
    setScanning('nodeModules', true)
    setSelectedNm(new Set())
    setLastResult(null)
    try {
      const roots = settings?.scanRoots ?? []
      const entries = await window.electronAPI.scanNodeModules(roots)
      setNodeModules(entries)
    } finally {
      setScanning('nodeModules', false)
    }
  }

  const cleanSelected = async () => {
    const paths = [
      ...Array.from(selectedDev),
      ...Array.from(selectedNm),
    ]
    if (paths.length === 0) return
    setCleaning(true)
    try {
      const result = await window.electronAPI.moveToTrash(paths)
      removeDevEntries(result.success)
      removeNodeModules(result.success)
      setSelectedDev(new Set())
      setSelectedNm(new Set())
      setLastResult({ freed: result.freedBytes, failed: result.failed.length })
      window.electronAPI.getDiskInfo().then(useAppStore.getState().setDiskInfo).catch(() => {})
    } finally {
      setCleaning(false)
    }
  }

  const selectedSize = useMemo(() => {
    const devSize = devEntries.filter((e) => selectedDev.has(e.path)).reduce((s, e) => s + e.size, 0)
    const nmSize  = nodeModules.filter((e) => selectedNm.has(e.path)).reduce((s, e) => s + e.size, 0)
    return devSize + nmSize
  }, [devEntries, nodeModules, selectedDev, selectedNm])

  const totalSelected = selectedDev.size + selectedNm.size

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0', marginBottom: 3 }}>Dev Tools</h2>
        <p style={{ color: '#f59e0b88', fontSize: 11, fontFamily: 'monospace', marginBottom: 16 }}>
          npm · yarn · pnpm · Homebrew · Xcode · Docker · Python · Rust · Go
        </p>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a' }}>
          {([
            { id: 'devtools', label: 'Package Managers & Tools' },
            { id: 'nodemodules', label: `node_modules${nodeModules.length ? ` (${nodeModules.length})` : ''}` },
          ] as const).map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: 12,
                background: 'transparent',
                color: activeSection === s.id ? '#f59e0b' : '#444',
                borderBottom: activeSection === s.id ? '2px solid #f59e0b' : '2px solid transparent',
                fontWeight: activeSection === s.id ? 600 : 400,
                marginBottom: -1,
              }}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0,
      }}>
        {activeSection === 'devtools' ? (
          <Btn onClick={scanDev} disabled={isScanningDev} primary>
            {isScanningDev ? '⟳ Đang quét...' : '🔎 Quét Dev Tools'}
          </Btn>
        ) : (
          <Btn onClick={scanNm} disabled={isScanningNm} primary>
            {isScanningNm ? '⟳ Đang tìm...' : '🔎 Tìm node_modules'}
          </Btn>
        )}

        {totalSelected > 0 && (
          <Btn onClick={cleanSelected} disabled={cleaning} danger>
            {cleaning ? '⟳ Xóa...' : `🗑 Xóa vào Trash (${formatBytes(selectedSize)})`}
          </Btn>
        )}

        <div style={{ flex: 1 }} />

        {(isScanningDev && progressDev) && (
          <div style={{ color: '#444', fontSize: 11, fontFamily: 'monospace' }}>
            [{progressDev.current}/{progressDev.total}] {progressDev.label}
          </div>
        )}
        {(isScanningNm && progressNm) && (
          <div style={{ color: '#444', fontSize: 11, fontFamily: 'monospace', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Found: {progressNm.current} — {progressNm.label}
          </div>
        )}
        {lastResult && (
          <div style={{ color: '#22c55e', fontSize: 11 }}>
            ✓ Freed {formatBytes(lastResult.freed)}
            {lastResult.failed > 0 && <span style={{ color: '#ef4444' }}> · {lastResult.failed} failed</span>}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeSection === 'devtools' ? (
          <DevToolsTable
            entries={devEntries}
            selected={selectedDev}
            onToggle={(p) => setSelectedDev((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
            onToggleAll={() => {
              if (selectedDev.size === devEntries.length) setSelectedDev(new Set())
              else setSelectedDev(new Set(devEntries.map((e) => e.path)))
            }}
            isScanning={isScanningDev}
            onScan={scanDev}
          />
        ) : (
          <NodeModulesTable
            entries={nodeModules}
            selected={selectedNm}
            onToggle={(p) => setSelectedNm((prev) => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n })}
            onToggleAll={() => {
              if (selectedNm.size === nodeModules.length) setSelectedNm(new Set())
              else setSelectedNm(new Set(nodeModules.map((e) => e.path)))
            }}
            isScanning={isScanningNm}
            onScan={scanNm}
          />
        )}
      </div>

      {/* Status bar */}
      <div style={{ padding: '6px 24px', borderTop: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', gap: 16 }}>
        <span style={{ color: '#2a2a2a', fontSize: 11 }}>
          {activeSection === 'devtools'
            ? `${devEntries.length} công cụ, tổng ${formatBytes(devEntries.reduce((s, e) => s + e.size, 0))}`
            : `${nodeModules.length} thư mục, tổng ${formatBytes(nodeModules.reduce((s, e) => s + e.size, 0))}`
          }
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ color: '#1a1a1a', fontSize: 11 }}>⚠ Chuyển vào Trash</span>
      </div>
    </div>
  )
}

// ─── DevTools table ──────────────────────────────────────────────────────────
function DevToolsTable({ entries, selected, onToggle, onToggleAll, isScanning, onScan }: {
  entries: DevEntry[]; selected: Set<string>
  onToggle: (p: string) => void; onToggleAll: () => void
  isScanning: boolean; onScan: () => void
}) {
  if (entries.length === 0) {
    return (
      <EmptyState isScanning={isScanning} onScan={onScan} icon="⚒" label="Dev Tools" />
    )
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#111', position: 'sticky', top: 0 }}>
          <th style={thStyle(40)}><input type="checkbox" checked={selected.size === entries.length} onChange={onToggleAll} /></th>
          <th style={thStyle()}>Công cụ</th>
          <th style={thStyle(120, 'right')}>Dung lượng</th>
          <th style={thStyle(120, 'right')}>Lần cuối</th>
          <th style={thStyle(80)} />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr
            key={entry.path}
            style={{ backgroundColor: selected.has(entry.path) ? '#f59e0b12' : 'transparent', borderBottom: '1px solid #111', cursor: 'default' }}
            onMouseEnter={(e) => { if (!selected.has(entry.path)) e.currentTarget.style.backgroundColor = '#ffffff05' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected.has(entry.path) ? '#f59e0b12' : 'transparent' }}
          >
            <td style={tdStyle(40)}><input type="checkbox" checked={selected.has(entry.path)} onChange={() => onToggle(entry.path)} /></td>
            <td style={tdStyle()}>
              <div style={{ color: '#d0d0d0', fontSize: 12, fontWeight: 500 }}>{entry.label}</div>
              <div style={{ color: '#2a2a2a', fontSize: 10, fontFamily: 'monospace', marginTop: 1 }}>{entry.path}</div>
            </td>
            <td style={tdStyle(120, 'right')}>
              <SizeChip size={entry.size} />
            </td>
            <td style={tdStyle(120, 'right')}>
              <span style={{ color: '#444', fontSize: 11 }}>{timeAgo(entry.mtime)}</span>
            </td>
            <td style={tdStyle(80, 'right')}>
              <button onClick={() => window.electronAPI.showItemInFolder(entry.path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2a2a2a', fontSize: 13 }} title="Hiện trong Finder">⎋</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ─── node_modules table ──────────────────────────────────────────────────────
function NodeModulesTable({ entries, selected, onToggle, onToggleAll, isScanning, onScan }: {
  entries: ScanEntry[]; selected: Set<string>
  onToggle: (p: string) => void; onToggleAll: () => void
  isScanning: boolean; onScan: () => void
}) {
  if (entries.length === 0) {
    return (
      <div style={{ flex: 1 }}>
        <EmptyState isScanning={isScanning} onScan={onScan} icon="📦" label="node_modules" />
        {!isScanning && (
          <div style={{ textAlign: 'center', color: '#2a2a2a', fontSize: 11, marginTop: -20 }}>
            Sẽ tìm trong: ~/Documents, ~/Projects, ~/Desktop...
          </div>
        )}
      </div>
    )
  }

  const total = entries.reduce((s, e) => s + e.size, 0)

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ backgroundColor: '#111', position: 'sticky', top: 0 }}>
          <th style={thStyle(40)}><input type="checkbox" checked={selected.size === entries.length} onChange={onToggleAll} /></th>
          <th style={thStyle()}>Project</th>
          <th style={thStyle(120, 'right')}>Dung lượng</th>
          <th style={thStyle(120, 'right')}>Lần cuối</th>
          <th style={thStyle(80)} />
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr
            key={entry.path}
            style={{ backgroundColor: selected.has(entry.path) ? '#f59e0b12' : 'transparent', borderBottom: '1px solid #111', cursor: 'default' }}
            onMouseEnter={(e) => { if (!selected.has(entry.path)) e.currentTarget.style.backgroundColor = '#ffffff05' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected.has(entry.path) ? '#f59e0b12' : 'transparent' }}
          >
            <td style={tdStyle(40)}><input type="checkbox" checked={selected.has(entry.path)} onChange={() => onToggle(entry.path)} /></td>
            <td style={tdStyle()}>
              <div style={{ color: '#d0d0d0', fontSize: 12, fontWeight: 500 }}>{entry.name}</div>
              <div style={{ color: '#2a2a2a', fontSize: 10, fontFamily: 'monospace', marginTop: 1 }}>{entry.path}</div>
            </td>
            <td style={tdStyle(120, 'right')}><SizeChip size={entry.size} /></td>
            <td style={tdStyle(120, 'right')}><span style={{ color: '#444', fontSize: 11 }}>{timeAgo(entry.mtime)}</span></td>
            <td style={tdStyle(80, 'right')}>
              <button onClick={() => window.electronAPI.showItemInFolder(entry.path)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2a2a2a', fontSize: 13 }}>⎋</button>
            </td>
          </tr>
        ))}
        <tr style={{ backgroundColor: '#0d0d0d' }}>
          <td colSpan={2} style={{ padding: '8px 12px', color: '#333', fontSize: 11, fontWeight: 700 }}>TỔNG</td>
          <td style={{ padding: '8px 12px', textAlign: 'right', color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>{formatBytes(total)}</td>
          <td colSpan={2} />
        </tr>
      </tbody>
    </table>
  )
}

// ─── Shared helpers ──────────────────────────────────────────────────────────
function thStyle(width?: number, align: 'left' | 'right' = 'left'): React.CSSProperties {
  return { padding: '8px 12px', textAlign: align, color: '#444', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, borderBottom: '1px solid #1a1a1a', width }
}
function tdStyle(width?: number, align: 'left' | 'right' = 'left'): React.CSSProperties {
  return { padding: '8px 12px', textAlign: align, width }
}

function SizeChip({ size }: { size: number }) {
  const mb = size / 1024 / 1024
  const color = mb > 1000 ? '#ef4444' : mb > 200 ? '#f59e0b' : mb > 50 ? '#06b6d4' : '#555'
  return <span style={{ color, fontSize: 12, fontWeight: mb > 200 ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>{formatBytes(size)}</span>
}

function EmptyState({ isScanning, onScan, icon, label }: { isScanning: boolean; onScan: () => void; icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#333', paddingTop: 80 }}>
      {isScanning ? (
        <>
          <div style={{ fontSize: 40 }} className="animate-spin-slow">⟳</div>
          <div style={{ fontSize: 13, color: '#555' }}>Đang quét...</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 48 }}>{icon}</div>
          <div style={{ fontSize: 14, color: '#555' }}>Chưa có dữ liệu</div>
          <button onClick={onScan} style={{ marginTop: 4, padding: '7px 18px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            🔎 Quét {label}
          </button>
        </>
      )}
    </div>
  )
}

function Btn({ children, onClick, disabled, primary, danger }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; primary?: boolean; danger?: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '6px 14px', borderRadius: 7, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500,
      background: disabled ? '#1a1a1a' : primary ? '#f59e0b' : danger ? '#ef4444' : '#2a2a2a',
      color: disabled ? '#333' : primary ? '#000' : '#fff',
      display: 'flex', alignItems: 'center', gap: 5,
    }}>{children}</button>
  )
}

export default DevTools
