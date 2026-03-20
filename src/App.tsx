import React, { useEffect } from 'react'
import { useAppStore, TabId } from './store/useAppStore'
import Dashboard from './pages/Dashboard'
import SystemCache from './pages/SystemCache'
import DevTools from './pages/DevTools'
import AppLeftovers from './pages/AppLeftovers'
import LargeFiles from './pages/LargeFiles'
import Logs from './pages/Logs'
import Downloads from './pages/Downloads'
import Settings from './pages/Settings'

interface NavItem {
  id: TabId
  icon: string
  label: string
  color: string
}

const NAV: NavItem[] = [
  { id: 'dashboard',  icon: '⬡',  label: 'Tổng quan',      color: '#06b6d4' },
  { id: 'caches',     icon: '🗄',  label: 'Cache HT',       color: '#a855f7' },
  { id: 'devtools',   icon: '⚒',  label: 'Dev Tools',      color: '#f59e0b' },
  { id: 'leftovers',  icon: '🧩',  label: 'App Leftover',   color: '#f97316' },
  { id: 'largefiles', icon: '🔍',  label: 'File Lớn',       color: '#ef4444' },
  { id: 'logs',       icon: '📋',  label: 'Logs',           color: '#6b7280' },
  { id: 'downloads',  icon: '📥',  label: 'Downloads',      color: '#22c55e' },
]

function renderPage(tab: TabId) {
  switch (tab) {
    case 'dashboard':  return <Dashboard />
    case 'caches':     return <SystemCache />
    case 'devtools':   return <DevTools />
    case 'leftovers':  return <AppLeftovers />
    case 'largefiles': return <LargeFiles />
    case 'logs':       return <Logs />
    case 'downloads':  return <Downloads />
    case 'settings':   return <Settings />
    default:           return <Dashboard />
  }
}

const App: React.FC = () => {
  const { activeTab, setActiveTab, setDiskInfo, setSettings } = useAppStore()

  useEffect(() => {
    // Load disk info and settings on startup
    window.electronAPI.getDiskInfo().then(setDiskInfo).catch(() => {})
    window.electronAPI.getSettings().then(setSettings).catch(() => {})

    // Listen to scan progress
    const unsub = window.electronAPI.onScanProgress((p) => {
      useAppStore.getState().setScanProgress(p.channel, {
        current: p.current, total: p.total, label: p.label,
      })
    })
    return unsub
  }, [setDiskInfo, setSettings])

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#0d0d0d', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <div style={{
        width: 200,
        flexShrink: 0,
        backgroundColor: '#111',
        borderRight: '1px solid #1e1e1e',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 48, // space for macOS traffic lights
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid #1a1a1a', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>🧹</div>
            <div>
              <div style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>
                Clean<span style={{ color: '#06b6d4' }}>Tool</span>
              </div>
              <div style={{ color: '#333', fontSize: 9, letterSpacing: 1 }}>MACOS CLEANER</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto' }}>
          {NAV.map((item) => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  marginBottom: 2,
                  backgroundColor: isActive ? `${item.color}18` : 'transparent',
                  color: isActive ? item.color : '#555',
                  borderLeft: isActive ? `3px solid ${item.color}` : '3px solid transparent',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#999' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#555' }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer: Settings */}
        <div style={{ padding: '8px', borderTop: '1px solid #1a1a1a' }}>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 7,
              border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === 'settings' ? '#ffffff10' : 'transparent',
              color: activeTab === 'settings' ? '#e0e0e0' : '#444',
              fontSize: 12, textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 14 }}>⚙</span>
            <span>Cài đặt</span>
          </button>
          <div style={{ color: '#2a2a2a', fontSize: 9, textAlign: 'center', marginTop: 8, fontFamily: 'monospace' }}>
            v1.0.0
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {renderPage(activeTab)}
      </div>
    </div>
  )
}

export default App
