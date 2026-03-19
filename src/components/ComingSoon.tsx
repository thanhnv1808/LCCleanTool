import React from 'react'

interface Props {
  icon: string
  title: string
  color: string
  phase: string
  features: string[]
}

const ComingSoon: React.FC<Props> = ({ icon, title, color, phase, features }) => (
  <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, textAlign: 'center' }}>
    <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: '#e0e0e0', marginBottom: 6 }}>{title}</div>
    <div style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      backgroundColor: `${color}22`, color, fontSize: 11, fontWeight: 600, marginBottom: 24,
    }}>
      {phase} — Sắp ra mắt
    </div>

    <div style={{
      backgroundColor: '#141414', border: '1px solid #1e1e1e',
      borderRadius: 12, padding: '20px 28px', maxWidth: 420, textAlign: 'left',
    }}>
      <div style={{ color: '#555', fontSize: 11, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Tính năng sẽ có
      </div>
      {features.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
          <span style={{ color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>◆</span>
          <span style={{ color: '#555', fontSize: 12, lineHeight: 1.5 }}>{f}</span>
        </div>
      ))}
    </div>
  </div>
)

export default ComingSoon
