import React from 'react'
import ComingSoon from '../components/ComingSoon'

const LargeFiles: React.FC = () => (
  <ComingSoon
    icon="🔍"
    title="File Lớn"
    color="#ef4444"
    phase="Phase 5"
    features={[
      'Quét toàn bộ home folder, liệt kê file > 100MB (tùy chỉnh)',
      'Sắp xếp theo dung lượng, ngày tạo, ngày truy cập',
      'Filter theo loại: video, disk image (.dmg/.iso), archive, backup',
      'Phát hiện file trùng lặp theo MD5/SHA hash',
      'Click để hiện trong Finder hoặc xóa ngay',
      'Exclude paths: bỏ qua các thư mục chỉ định',
    ]}
  />
)

export default LargeFiles
