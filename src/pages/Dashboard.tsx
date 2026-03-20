import React, { useEffect, useState } from 'react'
import { Zap, HardDrive, Database, Terminal, Download, ScrollText } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { formatBytes } from '../utils/format'
import { useTranslation } from '../i18n/useTranslation'

interface CategoryCard {
  key: string
  label: string
  icon: React.ElementType
  color: string
  tab: string
  size: number | null
}

const Dashboard: React.FC = () => {
  const { diskInfo, quickScan, setQuickScan, setActiveTab } = useAppStore()
  const lang = useAppStore((s) => s.language)
  const t = useTranslation()
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<number | null>(null)

  const doQuickScan = async () => {
    setScanning(true)
    try {
      const result = await window.electronAPI.quickScan()
      setQuickScan(result)
      setLastScan(Date.now())
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    const id = setInterval(() => {
      window.electronAPI.getDiskInfo().then(useAppStore.getState().setDiskInfo).catch(() => {})
    }, 10000)
    return () => clearInterval(id)
  }, [])

  const categories: CategoryCard[] = [
    { key: 'caches',    label: t.systemCache.title, icon: Database,   color: '#a855f7', tab: 'caches',    size: quickScan?.caches ?? null },
    { key: 'devtools',  label: 'Dev Tools',          icon: Terminal,   color: '#f59e0b', tab: 'devtools',  size: quickScan?.devTools ?? null },
    { key: 'downloads', label: 'Downloads',          icon: Download,   color: '#22c55e', tab: 'downloads', size: quickScan?.downloads ?? null },
    { key: 'logs',      label: 'Logs & Reports',     icon: ScrollText, color: '#6b7280', tab: 'logs',      size: quickScan?.logs ?? null },
  ]

  const used    = diskInfo?.used ?? 0
  const total   = diskInfo?.total ?? 1
  const free    = diskInfo?.free ?? 0
  const pct     = diskInfo?.percent ?? 0
  const barColor = pct > 85 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#06b6d4'

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 28 }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0', letterSpacing: -0.3 }}>
          {t.dashboard.title}
        </h1>
        <p style={{ color: '#5a5a5a', fontSize: 12, marginTop: 4 }}>
          {t.dashboard.subtitle}
        </p>
      </div>

      {/* ── Disk Usage ── */}
      <div style={{
        backgroundColor: '#161616', border: '1px solid #1e1e1e',
        borderRadius: 12, padding: 24, marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
          <HardDrive size={13} color="#5a5a5a" strokeWidth={1.5} />
          <span style={{ color: '#5a5a5a', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{t.dashboard.diskUsage}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: '#e0e0e0', fontVariantNumeric: 'tabular-nums' }}>
              {formatBytes(used)}
            </span>
            <span style={{ color: '#5a5a5a', fontSize: 13 }}>/ {formatBytes(total)}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#5a5a5a', fontSize: 11, marginBottom: 2 }}>{t.dashboard.free}</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: pct > 85 ? '#ef4444' : '#22c55e' }}>
              {formatBytes(free)}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ backgroundColor: '#222', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
            borderRadius: 6, transition: 'width 0.5s ease',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <Stat label={t.dashboard.used} value={`${pct}%`} color={barColor} />
            <Stat label={t.dashboard.total} value={formatBytes(total)} color="#5a5a5a" />
          </div>
          {diskInfo && (
            <div style={{ color: '#383838', fontSize: 10, fontFamily: 'monospace', alignSelf: 'flex-end' }}>
              {diskInfo.mount}
            </div>
          )}
        </div>
      </div>

      {/* ── Quick Scan ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 600 }}>{t.dashboard.quickScan}</div>
          {lastScan && (
            <div style={{ color: '#4a4a4a', fontSize: 11, marginTop: 2 }}>
              {t.dashboard.updated} {new Date(lastScan).toLocaleTimeString(lang === 'vi' ? 'vi-VN' : 'en-US')}
            </div>
          )}
        </div>
        <button
          onClick={doQuickScan}
          disabled={scanning}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none',
            cursor: scanning ? 'not-allowed' : 'pointer',
            background: scanning ? '#1d1d1d' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
            color: scanning ? '#4a4a4a' : '#fff',
            fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 7,
            opacity: scanning ? 0.7 : 1,
          }}
        >
          <Zap size={13} />
          {scanning ? t.dashboard.scanning : t.dashboard.quickScan}
        </button>
      </div>

      {/* ── Category cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {categories.map((cat) => (
          <CategoryCardBtn
            key={cat.key}
            icon={cat.icon}
            label={cat.label}
            color={cat.color}
            size={cat.size}
            scanning={scanning}
            notScannedLabel={t.common.notScanned}
            onClick={() => setActiveTab(cat.tab as Parameters<typeof setActiveTab>[0])}
          />
        ))}
      </div>

      {/* ── Total estimate ── */}
      {quickScan && (
        <div style={{
          marginTop: 16, padding: '14px 20px', borderRadius: 10,
          backgroundColor: '#0d1f1a', border: '1px solid #0f2d20',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ color: '#22c55e', fontSize: 13 }}>
            {t.dashboard.estimatedFree}
          </div>
          <div style={{ color: '#22c55e', fontSize: 20, fontWeight: 700 }}>
            {formatBytes(quickScan.caches + quickScan.devTools + quickScan.logs)}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ color: '#4a4a4a', fontSize: 10, marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 13, fontWeight: 600 }}>{value}</div>
    </div>
  )
}

interface CategoryCardProps {
  icon: React.ElementType; label: string; color: string
  size: number | null; scanning: boolean; onClick: () => void
  notScannedLabel: string
}

function CategoryCardBtn({ icon: Icon, label, color, size, scanning, onClick, notScannedLabel }: CategoryCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: '#141414', border: '1px solid #1e1e1e',
        borderRadius: 10, padding: '16px 18px', cursor: 'pointer',
        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}44`
        e.currentTarget.style.backgroundColor = `${color}08`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#1e1e1e'
        e.currentTarget.style.backgroundColor = '#141414'
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon size={20} color={color} strokeWidth={1.5} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#777', fontSize: 11, marginBottom: 4 }}>{label}</div>
        {scanning ? (
          <div style={{ height: 8, width: 60, borderRadius: 4 }} className="shimmer" />
        ) : size !== null ? (
          <div style={{ color: '#e0e0e0', fontSize: 16, fontWeight: 700 }}>
            {formatBytes(size)}
          </div>
        ) : (
          <div style={{ color: '#4a4a4a', fontSize: 12 }}>{notScannedLabel}</div>
        )}
      </div>
      <div style={{ color: `${color}55`, fontSize: 16 }}>›</div>
    </button>
  )
}

export default Dashboard
