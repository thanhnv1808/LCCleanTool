import React, { useEffect, useState, useCallback } from 'react'
import { Brush, HardDrive, Database, Terminal, ScrollText, Download, TriangleAlert, RefreshCw } from 'lucide-react'
import type { DiskInfo, QuickScanResult, ScanCache } from '../types/electron'

// Cache cũ hơn 1 giờ → stale
const STALE_MS = 60 * 60 * 1000

function fmt(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const gb = bytes / (1024 ** 3)
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  const mb = bytes / (1024 ** 2)
  if (mb >= 1) return `${mb.toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return 'Vừa xong'
  if (mins < 60) return `${mins} phút trước`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

function scanTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

const CATEGORIES = [
  { key: 'caches'    as const, label: 'Cache Hệ Thống', icon: Database,   color: '#bf5af2' },
  { key: 'devTools'  as const, label: 'Dev Tools',       icon: Terminal,   color: '#ff9f0a' },
  { key: 'logs'      as const, label: 'Logs',            icon: ScrollText, color: '#8e8e93' },
  { key: 'downloads' as const, label: 'Downloads',       icon: Download,   color: '#30d158' },
]

const dragStyle = { WebkitAppRegion: 'drag' } as React.CSSProperties
const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties

const TrayPopup: React.FC = () => {
  const [disk, setDisk] = useState<DiskInfo | null>(null)
  const [cache, setCache] = useState<ScanCache | null>(null)
  const [scanning, setScanning] = useState(false)
  // null = bình thường, 'cleaned' = vừa clean trong app chính
  const [clearedReason, setClearedReason] = useState<'cleaned' | null>(null)

  const loadDisk = async () => {
    try { setDisk(await window.electronAPI.getDiskInfo()) } catch { /* ignore */ }
  }

  const doScan = useCallback(async () => {
    setScanning(true)
    setClearedReason(null)
    try {
      const result: QuickScanResult = await window.electronAPI.quickScan()
      const saved = await window.electronAPI.saveScanCache(result)
      setCache(saved)
    } catch { /* ignore */ }
    setScanning(false)
  }, [])

  const loadCache = useCallback(async () => {
    const cached = await window.electronAPI.getScanCache()
    setCache(cached)
    // Nếu không có cache → auto scan
    if (!cached) doScan()
    // Nếu cache quá cũ (>1h) → không auto scan, chỉ hiện warning
  }, [doScan])

  // Khi tray mở ra
  const onFocus = useCallback(() => {
    loadDisk()
    loadCache()
  }, [loadCache])

  useEffect(() => {
    onFocus()

    const unsubFocus = window.electronAPI.onTrayFocus(onFocus)
    const unsubCleared = window.electronAPI.onCacheCleared(() => {
      setCache(null)
      setClearedReason('cleaned')
      loadDisk() // refresh disk bar vì vừa có clean
    })

    return () => { unsubFocus(); unsubCleared() }
  }, [onFocus])

  const scan = cache?.result ?? null
  const ts = cache?.timestamp ?? null
  const isStale = ts !== null && (Date.now() - ts) > STALE_MS
  const total = scan ? scan.caches + scan.devTools + scan.logs + scan.downloads : 0
  const maxVal = scan ? Math.max(scan.caches, scan.devTools, scan.logs, scan.downloads, 1) : 1

  return (
    <div style={{
      width: '100%', height: '100%',
      borderRadius: 12, overflow: 'hidden',
      background: 'transparent',
      color: 'rgba(255,255,255,0.9)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      display: 'flex', flexDirection: 'column',
      userSelect: 'none', fontSize: 13,
    }}>

      {/* Header */}
      <div style={{
        ...dragStyle,
        padding: '14px 16px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
          background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Brush size={12} color="#fff" strokeWidth={2.5} />
        </div>
        <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: -0.2 }}>
          Clean<span style={{ color: '#32ade6' }}>Tool</span>
        </span>
      </div>

      {/* Disk bar — luôn live */}
      {disk && (
        <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 7 }}>
            <HardDrive size={12} color="rgba(255,255,255,0.35)" style={{ marginRight: 6 }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', flex: 1 }}>Macintosh HD</span>
            <span style={{ fontSize: 12, color: '#30d158', fontWeight: 500 }}>
              {fmt(disk.free)} còn trống
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${Math.min(disk.percent, 100)}%`,
              background: disk.percent > 85
                ? 'linear-gradient(90deg, #ff9f0a, #ff3b30)'
                : 'linear-gradient(90deg, #32ade6, #bf5af2)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{fmt(disk.used)} đã dùng</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{fmt(disk.total)}</span>
          </div>
        </div>
      )}

      {/* Total cleanable + timestamp */}
      <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
          <span style={{
            fontSize: 11, color: 'rgba(255,255,255,0.35)',
            textTransform: 'uppercase', letterSpacing: 0.6, flex: 1,
          }}>
            Có thể dọn
          </span>
          {/* Stale / cleaned warning */}
          {!scanning && clearedReason === 'cleaned' && (
            <span style={{ fontSize: 11, color: '#ff9f0a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TriangleAlert size={11} />
              Đã dọn — cần quét lại
            </span>
          )}
          {!scanning && clearedReason === null && isStale && (
            <span style={{ fontSize: 11, color: '#ff9f0a', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TriangleAlert size={11} />
              Dữ liệu cũ
            </span>
          )}
        </div>

        {scanning ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <RefreshCw size={13} color="rgba(255,255,255,0.3)"
              style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Đang quét...</span>
          </div>
        ) : clearedReason === 'cleaned' ? (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
            Nhấn Quét lại để cập nhật
          </div>
        ) : (
          <>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.15 }}>
              {scan ? `~${fmt(total)}` : '—'}
            </div>
            {ts && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>
                Quét lúc {scanTime(ts)} · {timeAgo(ts)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Category list */}
      <div style={{ flex: 1, padding: '8px 16px', overflowY: 'auto' }}>
        {CATEGORIES.map(({ key, label, icon: Icon, color }) => {
          const val = scan ? scan[key] : 0
          const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
          const dimmed = scanning || clearedReason === 'cleaned'
          return (
            <div key={key} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
                <Icon size={12} color={dimmed ? 'rgba(255,255,255,0.2)' : color}
                  style={{ marginRight: 7, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: dimmed ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.6)', flex: 1 }}>
                  {label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, color: dimmed ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)' }}>
                  {dimmed ? '—' : fmt(val)}
                </span>
              </div>
              <div style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 2,
                  width: `${dimmed ? 0 : pct}%`,
                  backgroundColor: color,
                  opacity: dimmed ? 0 : 1,
                  transition: 'width 0.5s ease, opacity 0.3s ease',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{
        ...noDragStyle,
        padding: '8px 16px 14px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: 8,
      }}>
        <button
          onClick={doScan}
          disabled={scanning}
          style={{
            flex: 1, padding: '7px 0', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            backgroundColor: 'rgba(255,255,255,0.07)',
            color: scanning ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)',
            fontSize: 13, cursor: scanning ? 'default' : 'pointer',
            fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          Quét lại
        </button>
        <button
          onClick={() => window.electronAPI.openMainWindow()}
          style={{
            flex: 2, padding: '7px 0', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #32ade6, #bf5af2)',
            color: '#fff', fontSize: 13, cursor: 'pointer',
            fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          Mở CleanTool
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default TrayPopup
