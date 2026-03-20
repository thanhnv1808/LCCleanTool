import React from 'react'
import ComingSoon from '../components/ComingSoon'

const AppLeftovers: React.FC = () => (
  <ComingSoon
    icon="🧩"
    title="App Leftovers"
    color="#f97316"
    phase="Phase 4"
    features={[
      'Quét ~/Library/Application Support theo app',
      'Quét ~/Library/Preferences (.plist)',
      'Quét ~/Library/Containers & Group Containers',
      'Orphan detection — phát hiện app đã xóa còn sót dữ liệu',
      'Hiện tổng kích thước dữ liệu theo từng app',
      'Xóa an toàn chỉ khi app không còn tồn tại',
    ]}
  />
)

export default AppLeftovers
