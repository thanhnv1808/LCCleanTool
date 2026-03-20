import React, { useState, useEffect } from 'react'
import { Save, AlertTriangle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { useTranslation } from '../i18n/useTranslation'

const Settings: React.FC = () => {
  const { settings, setSettings } = useAppStore()
  const language = useAppStore((s) => s.language)
  const setLanguage = useAppStore((s) => s.setLanguage)
  const t = useTranslation()
  const [roots, setRoots] = useState('')
  const [threshold, setThreshold] = useState(100)
  const [days, setDays] = useState(30)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setRoots(settings.scanRoots.join('\n'))
      setThreshold(settings.largFileThresholdMB)
      setDays(settings.thresholdDays)
    }
  }, [settings])

  const save = async () => {
    const updated = {
      scanRoots: roots.split('\n').map((s) => s.trim()).filter(Boolean),
      largFileThresholdMB: threshold,
      thresholdDays: days,
    }
    await window.electronAPI.saveSettings(updated)
    const fresh = await window.electronAPI.getSettings()
    setSettings(fresh)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0' }}>{t.settings.title}</h2>
        <p style={{ color: '#5a5a5a', fontSize: 12, marginTop: 4 }}>{t.settings.subtitle}</p>
      </div>

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Scan roots */}
        <Section title={t.settings.scanRoots} desc={t.settings.scanRootsDesc}>
          <textarea
            value={roots}
            onChange={(e) => setRoots(e.target.value)}
            rows={4}
            style={{
              width: '100%', background: '#1a1a1a', color: '#d0d0d0',
              border: '1px solid #282828', borderRadius: 7, padding: '8px 10px',
              fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none',
            }}
          />
        </Section>

        {/* Large file threshold */}
        <Section title={t.settings.largeFileThreshold} desc={t.settings.largeFileThresholdDesc}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              min={10} max={10000}
              style={{ width: 100, background: '#1a1a1a', color: '#d0d0d0', border: '1px solid #282828', borderRadius: 7, padding: '6px 10px', fontSize: 13, outline: 'none' }}
            />
            <span style={{ color: '#5a5a5a', fontSize: 12 }}>MB</span>
          </div>
        </Section>

        {/* Threshold days */}
        <Section title={t.settings.thresholdDays} desc={t.settings.thresholdDaysDesc}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              min={1} max={365}
              style={{ width: 100, background: '#1a1a1a', color: '#d0d0d0', border: '1px solid #282828', borderRadius: 7, padding: '6px 10px', fontSize: 13, outline: 'none' }}
            />
            <span style={{ color: '#5a5a5a', fontSize: 12 }}>{t.settings.days}</span>
          </div>
        </Section>

        {/* Language */}
        <Section title={t.settings.language} desc={t.settings.languageDesc}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['en', 'vi'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                style={{
                  padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  background: language === l ? '#06b6d4' : '#1a1a1a',
                  color: language === l ? '#fff' : '#5a5a5a',
                }}
              >
                {l === 'en' ? 'English' : 'Tiếng Việt'}
              </button>
            ))}
          </div>
        </Section>

        {/* Safety note */}
        <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: '#1a1300', border: '1px solid #f59e0b1a', fontSize: 12, color: '#f59e0b88', lineHeight: 1.6, display: 'flex', gap: 10 }}>
          <AlertTriangle size={14} color="#f59e0b88" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{t.settings.safetyNote}</span>
        </div>

        {/* Save button */}
        <button
          onClick={save}
          style={{
            alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: saved ? '#22c55e' : '#06b6d4', color: '#fff',
            transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 7,
          }}
        >
          <Save size={14} />
          {saved ? t.settings.saved : t.settings.save}
        </button>
      </div>
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: '#d0d0d0', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{title}</div>
        <div style={{ color: '#5a5a5a', fontSize: 11 }}>{desc}</div>
      </div>
      {children}
    </div>
  )
}

export default Settings
