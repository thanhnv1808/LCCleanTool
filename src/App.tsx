import React, { useEffect } from 'react'
import {
  LayoutDashboard, Database, Terminal, Puzzle,
  FileSearch, ScrollText, Download, Settings, Brush,
} from 'lucide-react'
import { useAppStore, TabId } from './store/useAppStore'
import Dashboard from './pages/Dashboard'
import SystemCache from './pages/SystemCache'
import DevTools from './pages/DevTools'
import AppLeftovers from './pages/AppLeftovers'
import LargeFiles from './pages/LargeFiles'
import Logs from './pages/Logs'
import Downloads from './pages/Downloads'
import SettingsPage from './pages/Settings'

interface NavItem {
  id: TabId
  icon: React.ElementType
  label: string
  color: string
}

const NAV: NavItem[] = [
  { id: 'dashboard',  icon: LayoutDashboard, label: 'Tổng quan',    color: '#06b6d4' },
  { id: 'caches',     icon: Database,         label: 'Cache HT',     color: '#a855f7' },
  { id: 'devtools',   icon: Terminal,          label: 'Dev Tools',    color: '#f59e0b' },
  { id: 'leftovers',  icon: Puzzle,            label: 'App Leftover', color: '#f97316' },
  { id: 'largefiles', icon: FileSearch,        label: 'File Lớn',     color: '#ef4444' },
  { id: 'logs',       icon: ScrollText,        label: 'Logs',         color: '#6b7280' },
  { id: 'downloads',  icon: Download,          label: 'Downloads',    color: '#22c55e' },
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
    case 'settings':   return <SettingsPage />
    default:           return <Dashboard />
  }
}

const App: React.FC = () => {
  const { activeTab, setActiveTab, setDiskInfo, setSettings } = useAppStore()

  useEffect(() => {
    window.electronAPI.getDiskInfo().then(setDiskInfo).catch(() => {})
    window.electronAPI.getSettings().then(setSettings).catch(() => {})

    // Restore previous scan results from disk cache
    window.electronAPI.getResultsCache().then((cache) => {
      const s = useAppStore.getState()
      if (cache.caches)     { s.setCacheEntries(cache.caches.entries as never);        s.setScanTimestamp('caches',     cache.caches.timestamp) }
      if (cache.devtools)   { s.setDevEntries(cache.devtools.entries as never);        s.setScanTimestamp('devtools',   cache.devtools.timestamp) }
      if (cache.nodeModules){ s.setNodeModules(cache.nodeModules.entries as never);    s.setScanTimestamp('nodeModules',cache.nodeModules.timestamp) }
      if (cache.leftovers)  { s.setLeftoverEntries(cache.leftovers.entries as never);  s.setScanTimestamp('leftovers',  cache.leftovers.timestamp) }
      if (cache.largeFiles) { s.setLargeFileEntries(cache.largeFiles.entries as never);s.setScanTimestamp('largeFiles', cache.largeFiles.timestamp) }
      if (cache.logs)       { s.setLogEntries(cache.logs.entries as never);            s.setScanTimestamp('logs',       cache.logs.timestamp) }
      if (cache.downloads)  { s.setDownloadEntries(cache.downloads.entries as never);  s.setScanTimestamp('downloads',  cache.downloads.timestamp) }
    }).catch(() => {})

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
        width: 200, flexShrink: 0,
        backgroundColor: '#111',
        borderRight: '1px solid #1e1e1e',
        display: 'flex', flexDirection: 'column',
        paddingTop: 48,
      }}>
        {/* Logo */}
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #1a1a1a', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #06b6d4 0%, #a855f7 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Brush size={14} color="#fff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 13, letterSpacing: 0.3 }}>
                Clean<span style={{ color: '#06b6d4' }}>Tool</span>
              </div>
              <div style={{ color: '#3a3a3a', fontSize: 9, letterSpacing: 1 }}>MACOS CLEANER</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '4px 8px', overflowY: 'auto' }}>
          {NAV.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '7px 10px',
                  borderRadius: 7, border: 'none', cursor: 'pointer',
                  marginBottom: 2,
                  backgroundColor: isActive ? `${item.color}18` : 'transparent',
                  color: isActive ? item.color : '#5a5a5a',
                  borderLeft: isActive ? `2px solid ${item.color}` : '2px solid transparent',
                  transition: 'all 0.15s',
                  textAlign: 'left',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = '#aaa' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#5a5a5a' }}
              >
                <Icon size={14} strokeWidth={isActive ? 2 : 1.5} style={{ flexShrink: 0 }} />
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
              width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', borderRadius: 7,
              border: 'none', cursor: 'pointer',
              backgroundColor: activeTab === 'settings' ? '#ffffff10' : 'transparent',
              color: activeTab === 'settings' ? '#e0e0e0' : '#5a5a5a',
              fontSize: 12, textAlign: 'left',
              borderLeft: activeTab === 'settings' ? '2px solid #555' : '2px solid transparent',
            }}
            onMouseEnter={(e) => { if (activeTab !== 'settings') e.currentTarget.style.color = '#aaa' }}
            onMouseLeave={(e) => { if (activeTab !== 'settings') e.currentTarget.style.color = '#5a5a5a' }}
          >
            <Settings size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            <span>Cài đặt</span>
          </button>
          <div style={{ color: '#282828', fontSize: 9, textAlign: 'center', marginTop: 6, fontFamily: 'monospace' }}>
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
