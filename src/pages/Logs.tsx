import React from 'react'
import ComingSoon from '../components/ComingSoon'

const Logs: React.FC = () => (
  <ComingSoon
    icon="📋"
    title="Logs & Crash Reports"
    color="#6b7280"
    phase="Phase 6"
    features={[
      'Quét ~/Library/Logs — log theo app',
      'Quét /Library/Logs — system logs',
      'Crash reports: ~/Library/Logs/DiagnosticReports',
      'Filter log cũ hơn 7 / 30 ngày',
      'Preview nội dung file log trước khi xóa',
    ]}
  />
)

export default Logs
