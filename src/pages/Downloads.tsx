import React from 'react'
import ComingSoon from '../components/ComingSoon'

const Downloads: React.FC = () => (
  <ComingSoon
    icon="📥"
    title="Downloads & Trash"
    color="#22c55e"
    phase="Phase 8"
    features={[
      'Liệt kê ~/Downloads: sắp xếp theo dung lượng / tuổi',
      'Gợi ý file an toàn để xóa: .dmg cũ > 30 ngày, file trùng tên',
      'Group theo loại: .dmg, archive, video, document',
      'Hiển thị dung lượng Trash hiện tại',
      'Empty Trash với xác nhận',
      'Xóa .DS_Store toàn bộ home folder',
    ]}
  />
)

export default Downloads
