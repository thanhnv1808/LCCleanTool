import React, { useState, useMemo } from 'react'
import { Search, Trash2, FolderOpen, Puzzle, Filter } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes, timeAgo, scanTimestampLabel } from '../utils/format'
import { useTranslation } from '../i18n/useTranslation'
import type { LeftoverEntry } from '../types/electron'

type Section = 'appSupport' | 'containers' | 'groupContainers'

const SECTION_LABELS: Record<Section, string> = {
  appSupport: 'Application Support',
  containers: 'Containers',
  groupContainers: 'Group Containers',
}

const AppLeftovers: React.FC = () => {
  const { leftoverEntries, setLeftoverEntries, removeLeftoverEntries, scanning, setScanning, scanProgress, scanTimestamps } = useAppStore()
  const lang = useAppStore((s) => s.language)
  const t = useTranslation()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleaning, setCleaning] = useState(false)
  const [lastResult, setLastResult] = useState<{ freed: number; failed: number } | null>(null)
  const [activeSection, setActiveSection] = useState<Section>('appSupport')
  const [orphanOnly, setOrphanOnly] = useState(false)

  const isScanning = scanning['leftovers'] ?? false
  const progress = scanProgress['leftovers']

  const doScan = async () => {
    setScanning('leftovers', true)
    setSelected(new Set())
    setLastResult(null)
    try {
      const entries = await window.electronAPI.scanLeftovers()
      setLeftoverEntries(entries)
      useAppStore.getState().setScanTimestamp('leftovers', Date.now())
      window.electronAPI.saveResultsCache('leftovers', entries).catch(() => {})
    } finally {
      setScanning('leftovers', false)
    }
  }

  const doClean = async () => {
    if (selected.size === 0) return
    setCleaning(true)
    try {
      const result = await window.electronAPI.moveToTrash(Array.from(selected))
      removeLeftoverEntries(result.success)
      setSelected(new Set())
      setLastResult({ freed: result.freedBytes, failed: result.failed.length })
      window.electronAPI.getDiskInfo().then(useAppStore.getState().setDiskInfo).catch(() => {})
      window.electronAPI.saveResultsCache('leftovers', useAppStore.getState().leftoverEntries).catch(() => {})
    } finally {
      setCleaning(false)
    }
  }

  const filtered = useMemo(() => {
    let list = leftoverEntries.filter((e) => e.category === activeSection)
    if (orphanOnly) list = list.filter((e) => e.isOrphan)
    return list
  }, [leftoverEntries, activeSection, orphanOnly])

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

  const sectionTotal = (s: Section) => leftoverEntries.filter((e) => e.category === s).reduce((acc, e) => acc + e.size, 0)
  const orphanCount = filtered.filter((e) => e.isOrphan).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <Puzzle size={15} color="#f97316" strokeWidth={1.5} />
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0' }}>App Leftovers</h2>
        </div>
        <p style={{ color: '#f9731677', fontSize: 11, fontFamily: 'monospace', marginBottom: 16, paddingLeft: 23 }}>
          ~/Library/Application Support · Containers · Group Containers
          {scanTimestamps['leftovers'] && !isScanning && (
            <span style={{ color: '#3a3a3a', marginLeft: 8 }}>· {scanTimestampLabel(scanTimestamps['leftovers'], lang)}</span>
          )}
        </p>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1a1a1a' }}>
          {(['appSupport', 'containers', 'groupContainers'] as Section[]).map((s) => {
            const total = sectionTotal(s)
            return (
              <button
                key={s}
                onClick={() => { setActiveSection(s); setSelected(new Set()) }}
                style={{
                  padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: 12,
                  background: 'transparent',
                  color: activeSection === s ? '#f97316' : '#5a5a5a',
                  borderBottom: activeSection === s ? '2px solid #f97316' : '2px solid transparent',
                  fontWeight: activeSection === s ? 600 : 400,
                  marginBottom: -1,
                }}
              >
                {SECTION_LABELS[s]}
                {total > 0 && <span style={{ color: '#5a5a5a', marginLeft: 6, fontSize: 10 }}>({formatBytes(total)})</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
        <Btn onClick={doScan} disabled={isScanning} color="#f97316">
          <Search size={13} />
          {isScanning ? t.common.scanning : t.leftovers.scanBtn}
        </Btn>

        {selected.size > 0 && (
          <Btn onClick={doClean} disabled={cleaning} color="#ef4444">
            <Trash2 size={13} />
            {cleaning ? t.common.deleting : `${t.common.moveToTrash} (${formatBytes(selectedSize)})`}
          </Btn>
        )}

        {leftoverEntries.length > 0 && (
          <button
            onClick={() => setOrphanOnly((v) => !v)}
            style={{
              padding: '5px 11px', borderRadius: 6, border: `1px solid ${orphanOnly ? '#f97316' : '#282828'}`,
              background: orphanOnly ? '#f9731618' : 'transparent',
              color: orphanOnly ? '#f97316' : '#6b6b6b', fontSize: 11, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Filter size={11} />
            {t.leftovers.orphanOnly} {orphanCount > 0 && `(${orphanCount})`}
          </button>
        )}

        <div style={{ flex: 1 }} />

        {isScanning && progress && (
          <div style={{ color: '#6b6b6b', fontSize: 11, fontFamily: 'monospace', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            [{progress.current}/{progress.total}] {progress.label}
          </div>
        )}
        {lastResult && (
          <div style={{ color: '#22c55e', fontSize: 11 }}>
            ✓ {t.common.freed} {formatBytes(lastResult.freed)}
            {lastResult.failed > 0 && <span style={{ color: '#ef4444' }}> · {lastResult.failed} {t.common.errors}</span>}
          </div>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState isScanning={isScanning} onScan={doScan} t={t.leftovers} tCommon={t.common} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#111', position: 'sticky', top: 0, zIndex: 1 }}>
                <Th width={40}>
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                </Th>
                <Th>App / Bundle</Th>
                <Th width={90} align="right">{t.common.size}</Th>
                <Th width={80} align="center">{t.leftovers.status}</Th>
                <Th width={110} align="right">{t.common.lastModified}</Th>
                <Th width={44} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <LeftoverRow
                  key={entry.path}
                  entry={entry}
                  selected={selected.has(entry.path)}
                  onToggle={() => toggle(entry.path)}
                  onReveal={() => window.electronAPI.showItemInFolder(entry.path)}
                  lang={lang}
                  activeLabel={t.leftovers.active}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Status bar */}
      {filtered.length > 0 && (
        <div style={{ padding: '6px 24px', borderTop: '1px solid #1a1a1a', flexShrink: 0, display: 'flex', gap: 16 }}>
          <span style={{ color: '#5a5a5a', fontSize: 11 }}>{filtered.length} {t.common.items}</span>
          {orphanCount > 0 && <span style={{ color: '#f97316', fontSize: 11 }}>{orphanCount} orphan</span>}
          {selected.size > 0 && <span style={{ color: '#06b6d4', fontSize: 11 }}>{t.common.selected} {selected.size} ({formatBytes(selectedSize)})</span>}
          <span style={{ flex: 1 }} />
          <span style={{ color: '#3d3d3d', fontSize: 11 }}>{t.common.trashWarning}</span>
        </div>
      )}
    </div>
  )
}

function LeftoverRow({ entry, selected, onToggle, onReveal, lang, activeLabel }: {
  entry: LeftoverEntry; selected: boolean; onToggle: () => void; onReveal: () => void
  lang: import('../i18n/translations').Lang; activeLabel: string
}) {
  const mb = entry.size / 1024 / 1024
  const sizeColor = mb > 500 ? '#ef4444' : mb > 100 ? '#f59e0b' : mb > 10 ? '#06b6d4' : '#666'
  return (
    <tr
      style={{ backgroundColor: selected ? '#f9731612' : 'transparent', borderBottom: '1px solid #151515' }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#ffffff06' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selected ? '#f9731612' : 'transparent' }}
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
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <span style={{ color: sizeColor, fontSize: 12, fontWeight: mb > 100 ? 700 : 400, fontVariantNumeric: 'tabular-nums' }}>
          {formatBytes(entry.size)}
        </span>
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'center' }}>
        {entry.isOrphan ? (
          <span style={{ color: '#f97316', fontSize: 10, background: '#f9731618', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>orphan</span>
        ) : (
          <span style={{ color: '#4a4a4a', fontSize: 10 }}>{activeLabel}</span>
        )}
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right', color: '#6b6b6b', fontSize: 11 }}>
        {timeAgo(entry.mtime, lang)}
      </td>
      <td style={{ padding: '7px 12px', textAlign: 'right' }}>
        <button onClick={onReveal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4a4a4a', display: 'flex', alignItems: 'center' }}>
          <FolderOpen size={13} />
        </button>
      </td>
    </tr>
  )
}

function Th({ children, width, align }: { children?: React.ReactNode; width?: number; align?: 'left' | 'right' | 'center' }) {
  return (
    <th style={{ padding: '8px 12px', textAlign: align ?? 'left', color: '#5a5a5a', fontSize: 11, fontWeight: 600, letterSpacing: 0.4, borderBottom: '1px solid #1a1a1a', width, userSelect: 'none' }}>
      {children}
    </th>
  )
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

function EmptyState({ isScanning, onScan, t, tCommon }: {
  isScanning: boolean; onScan: () => void
  t: { scanning: string; findLeftovers: string; scanBtn: string }
  tCommon: { notScanned: string; scanNow: string }
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      {isScanning ? (
        <>
          <div style={{ animation: 'spin 1.5s linear infinite' }}><Search size={40} color="#f9731650" strokeWidth={1} /></div>
          <div style={{ fontSize: 13, color: '#666' }}>{t.scanning}</div>
        </>
      ) : (
        <>
          <Puzzle size={48} color="#2a2a2a" strokeWidth={1} />
          <div style={{ fontSize: 14, color: '#666' }}>{tCommon.notScanned}</div>
          <div style={{ fontSize: 12, color: '#4a4a4a' }}>{t.findLeftovers}</div>
          <button onClick={onScan} style={{ marginTop: 8, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={13} /> {tCommon.scanNow}
          </button>
        </>
      )}
    </div>
  )
}

export default AppLeftovers
