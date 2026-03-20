import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

const Settings: React.FC = () => {
  const { settings, setSettings } = useAppStore()
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
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e0e0e0' }}>Cài đặt</h2>
        <p style={{ color: '#444', fontSize: 12, marginTop: 4 }}>Cấu hình hành vi quét và dọn dẹp</p>
      </div>

      <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Scan roots */}
        <Section title="Thư mục quét node_modules" desc="Mỗi dòng một path. Mặc định: home folder">
          <textarea
            value={roots}
            onChange={(e) => setRoots(e.target.value)}
            rows={4}
            style={{
              width: '100%', background: '#1a1a1a', color: '#d0d0d0',
              border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 10px',
              fontSize: 12, fontFamily: 'monospace', resize: 'vertical', outline: 'none',
            }}
          />
        </Section>

        {/* Large file threshold */}
        <Section title="Ngưỡng file lớn (MB)" desc="File lớn hơn ngưỡng này sẽ hiển thị trong tab File Lớn">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              min={10} max={10000}
              style={{ width: 100, background: '#1a1a1a', color: '#d0d0d0', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 10px', fontSize: 13 }}
            />
            <span style={{ color: '#444', fontSize: 12 }}>MB</span>
          </div>
        </Section>

        {/* Threshold days */}
        <Section title="Ngưỡng ngày không dùng" desc="File/thư mục cũ hơn số ngày này được đánh dấu để xem xét xóa">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              min={1} max={365}
              style={{ width: 100, background: '#1a1a1a', color: '#d0d0d0', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 10px', fontSize: 13 }}
            />
            <span style={{ color: '#444', fontSize: 12 }}>ngày</span>
          </div>
        </Section>

        {/* Safety note */}
        <div style={{ padding: '12px 16px', borderRadius: 8, backgroundColor: '#1a1300', border: '1px solid #f59e0b22', fontSize: 12, color: '#f59e0b88', lineHeight: 1.6 }}>
          ⚠ CleanTool luôn chuyển file vào <strong style={{ color: '#f59e0b' }}>Trash</strong> thay vì xóa vĩnh viễn.
          Bạn có thể khôi phục bất kỳ lúc nào từ Trash trong Finder.
        </div>

        {/* Save button */}
        <button
          onClick={save}
          style={{
            alignSelf: 'flex-start', padding: '8px 22px', borderRadius: 8, border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: saved ? '#22c55e' : '#06b6d4', color: '#fff',
            transition: 'background 0.2s',
          }}
        >
          {saved ? '✓ Đã lưu' : '💾 Lưu cài đặt'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: '#d0d0d0', fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{title}</div>
        <div style={{ color: '#444', fontSize: 11 }}>{desc}</div>
      </div>
      {children}
    </div>
  )
}

export default Settings
