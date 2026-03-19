# CleanTool — macOS Disk Cleaner
> Mục tiêu: Ứng dụng dọn dẹp dung lượng macOS — trực quan, an toàn, hiệu quả
> Tech stack: Electron + React + TypeScript + Tailwind (dark theme, tham khảo AlexTool)
> Cập nhật: 2026-03-19

---

## PHASE 0 — Khởi tạo project

- [ ] **0.1** Scaffold Electron + Vite + React + TypeScript (clone cấu trúc AlexTool)
- [ ] **0.2** Cấu hình Tailwind dark theme, font monospace
- [ ] **0.3** Cấu hình electron-builder cho macOS (`.dmg`, code sign nếu có)
- [ ] **0.4** IPC bridge cơ bản: `preload.ts` expose các API cần thiết
- [ ] **0.5** Permission macOS: Full Disk Access hướng dẫn user cấp quyền

---

## PHASE 1 — Dashboard (Tab Tổng quan)

- [ ] **1.1** Hiển thị **Disk Usage Bar** — used / free / total (animated, màu gradient)
- [ ] **1.2** Dung lượng theo từng phân vùng (nếu có nhiều ổ)
- [ ] **1.3** **Quick Scan** button — quét nhanh tất cả nhóm, hiển thị preview dung lượng có thể giải phóng
- [ ] **1.4** Summary cards: Cache | Dev Tools | App Leftovers | Logs | Large Files
  - Mỗi card: icon, tổng dung lượng ước tính, trạng thái (chưa quét / đã quét / sạch)
- [ ] **1.5** Nút **"Dọn tất cả"** — chạy toàn bộ các mục đã chọn
- [ ] **1.6** Lịch sử: "Lần dọn trước: X ngày trước, giải phóng Y GB"

---

## PHASE 2 — System Cache (Tab Cache Hệ thống)

- [ ] **2.1** Quét `~/Library/Caches` — danh sách theo app, dung lượng từng app
- [ ] **2.2** Quét `/Library/Caches` — system-level cache
- [ ] **2.3** Quét `/tmp` và `~/tmp` — temp files
- [ ] **2.4** Safari cache: `~/Library/Caches/com.apple.Safari`
- [ ] **2.5** Chrome cache: `~/Library/Caches/Google/Chrome`
- [ ] **2.6** Firefox cache: `~/Library/Caches/Firefox`
- [ ] **2.7** Edge, Arc, Brave — tự động detect cache path
- [ ] **2.8** UI: bảng danh sách có checkbox, sort theo dung lượng, preview path
- [ ] **2.9** Safe mode: bỏ qua file đang lock / đang dùng (kiểm tra trước khi xóa)

---

## PHASE 3 — Development Tools (Tab Dev Cleanup)

### 3A — Node.js / JavaScript
- [ ] **3A.1** Tìm tất cả thư mục `node_modules` trên toàn máy (configurable root paths)
  - Hiển thị: project name, path, dung lượng, last modified
  - Filter: chưa dùng > 30 ngày / 60 ngày / 90 ngày
- [ ] **3A.2** npm cache: `~/.npm/_cacache`
- [ ] **3A.3** yarn cache: `~/Library/Caches/Yarn` + `~/.yarn/cache`
- [ ] **3A.4** pnpm store: `~/.pnpm-store`
- [ ] **3A.5** Bun cache: `~/.bun`

### 3B — Homebrew
- [ ] **3B.1** Quét Homebrew cache: `~/Library/Caches/Homebrew`
- [ ] **3B.2** Liệt kê các package cũ (old versions) có thể `brew cleanup`
- [ ] **3B.3** Chạy `brew cleanup --dry-run` trước để preview
- [ ] **3B.4** Nút thực thi `brew cleanup` với progress log

### 3C — Xcode / iOS
- [ ] **3C.1** DerivedData: `~/Library/Developer/Xcode/DerivedData`
- [ ] **3C.2** iOS Device Support: `~/Library/Developer/Xcode/iOS DeviceSupport`
  - Tự động detect version iOS đang kết nối → bảo vệ, đề xuất xóa version cũ
- [ ] **3C.3** Simulator runtimes: `~/Library/Developer/CoreSimulator/Volumes`
- [ ] **3C.4** Xcode Archives: `~/Library/Developer/Xcode/Archives`
- [ ] **3C.5** CocoaPods cache: `~/Library/Caches/CocoaPods`

### 3D — Docker
- [ ] **3D.1** Detect Docker có cài không → hiện panel Docker
- [ ] **3D.2** Liệt kê: dangling images, stopped containers, unused volumes, build cache
- [ ] **3D.3** Preview dung lượng từng nhóm (`docker system df`)
- [ ] **3D.4** Thực thi `docker system prune` (có options chọn nhóm nào)

### 3E — Python / khác
- [ ] **3E.1** pip cache: `~/Library/Caches/pip`
- [ ] **3E.2** conda envs / packages cũ
- [ ] **3E.3** Gradle cache: `~/.gradle/caches`
- [ ] **3E.4** Maven: `~/.m2/repository`
- [ ] **3E.5** Rust / Cargo: `~/.cargo/registry`
- [ ] **3E.6** Go module cache: `~/go/pkg/mod`

---

## PHASE 4 — App Leftovers (Tab Dư Lượng App)

- [ ] **4.1** Quét `~/Library/Application Support` — liệt kê theo app
- [ ] **4.2** Quét `~/Library/Preferences` — `.plist` của app đã xóa
- [ ] **4.3** Quét `~/Library/Containers` — sandbox data
- [ ] **4.4** Quét `~/Library/Group Containers`
- [ ] **4.5** **Orphan detection**: so sánh với danh sách app đang có trong `/Applications` + App Store
  - Đánh dấu: "App đã xóa" vs "App còn tồn tại"
- [ ] **4.6** Chi tiết từng app: Application Support + Preferences + Containers + Caches gộp lại
- [ ] **4.7** Safe delete: chỉ xóa khi app không còn tồn tại (không xóa nhầm app đang dùng)

---

## PHASE 5 — Large File Finder (Tab File Lớn)

- [ ] **5.1** Quét toàn bộ home folder, liệt kê file > ngưỡng (mặc định 100MB, user chỉnh được)
- [ ] **5.2** Hiển thị dạng bảng: tên file, path, dung lượng, ngày tạo, ngày truy cập
- [ ] **5.3** Treemap visualization (optional) — phân cấp thư mục theo dung lượng
- [ ] **5.4** Filter theo loại: video, disk image (`.dmg`, `.iso`), archive, backup
- [ ] **5.5** Detect file trùng lặp theo hash MD5/SHA (opt-in, chậm)
- [ ] **5.6** Click để reveal in Finder hoặc xóa ngay trong app
- [ ] **5.7** Exclude paths: user có thể thêm paths không quét (VD: external drives, iCloud)

---

## PHASE 6 — Log & Crash Reports (Tab Logs)

- [ ] **6.1** Quét `~/Library/Logs` — log theo app
- [ ] **6.2** Quét `/Library/Logs` — system logs
- [ ] **6.3** Crash reports: `~/Library/Logs/DiagnosticReports`
- [ ] **6.4** Console logs cũ: filter log > 7 ngày / 30 ngày
- [ ] **6.5** Preview nội dung file log trước khi xóa (đọc 50 dòng cuối)

---

## PHASE 7 — Mail & iCloud (Tab Mail / Cloud)

- [ ] **7.1** Mail attachments cache: `~/Library/Mail`
  - Phân tích cấu trúc, liệt kê attachments lớn theo account
- [ ] **7.2** iCloud Drive offline cache (files đã tải về, có thể evict)
- [ ] **7.3** Messages attachments: `~/Library/Messages/Attachments`
- [ ] **7.4** FaceTime cache
- [ ] **7.5** Không xóa trực tiếp Mail — hướng dẫn user thao tác trong Mail.app (tránh corrupt)

---

## PHASE 8 — Downloads & Trash

- [ ] **8.1** Quét `~/Downloads` — liệt kê file, sắp xếp theo tuổi / dung lượng
  - Group: `.dmg` đã cài, archive, video, document
- [ ] **8.2** Gợi ý file "an toàn để xóa": `.dmg` cũ > 30 ngày, file trùng tên
- [ ] **8.3** Trash summary: hiển thị dung lượng Trash hiện tại
- [ ] **8.4** Empty Trash với xác nhận
- [ ] **8.5** Detect và xóa `.DS_Store` files toàn bộ home folder (optional)

---

## PHASE 9 — Scheduler & Automation

- [ ] **9.1** Cài đặt **tự động quét** theo lịch: hàng tuần / hàng tháng
- [ ] **9.2** Notification khi dung lượng trống < ngưỡng (VD: < 10GB)
- [ ] **9.3** Auto-clean safe items (cache trình duyệt, npm cache...) theo lịch
- [ ] **9.4** Lưu lịch sử dọn dẹp: ngày, dung lượng giải phóng, items xóa

---

## PHASE 10 — Settings & Safety

- [ ] **10.1** **Whitelist** — paths không bao giờ xóa (user định nghĩa)
- [ ] **10.2** **Dry-run mode** — luôn preview trước khi xóa thật
- [ ] **10.3** **Trash instead of delete** — mặc định đưa vào Trash, không hard delete
- [ ] **10.4** Scan roots: user chọn thư mục nào được phép quét
- [ ] **10.5** Threshold: file cũ hơn bao nhiêu ngày mới được xem xét xóa
- [ ] **10.6** Full Disk Access: kiểm tra và hướng dẫn cấp quyền trong System Settings
- [ ] **10.7** Export report: lưu báo cáo dọn dẹp ra `.txt` hoặc `.csv`

---

## UI / UX Design Notes

| Yếu tố | Thiết kế |
|--------|----------|
| Theme | Dark, `#0f0f0f` background (giống AlexTool) |
| Layout | Sidebar tabs trái + main content phải |
| Scan progress | Progress bar + estimated time + items found |
| Confirm dialog | Hiển thị danh sách file sẽ xóa, yêu cầu xác nhận |
| Color coding | Đỏ = nguy hiểm, Vàng = cẩn thận, Xanh = an toàn |
| File size | Luôn format KB/MB/GB tự động |
| Empty state | Minh họa khi chưa quét / đã sạch |
| Accessibility | Keyboard nav, tooltip giải thích từng mục |

---

## Thứ tự triển khai đề xuất

```
0 (scaffold)
  → 1 (Dashboard + Quick Scan)
    → 2 (System Cache — quick win, an toàn nhất)
      → 8 (Downloads + Trash — người dùng thấy kết quả ngay)
        → 5 (Large File Finder)
          → 3A (node_modules — dev users)
            → 3B (Homebrew)
              → 3C (Xcode)
                → 3D (Docker)
                  → 3E (Python/Rust/Go)
                    → 4 (App Leftovers)
                      → 6 (Logs)
                        → 7 (Mail/iCloud)
                          → 9 (Scheduler)
                            → 10 (Settings & Safety)
```

---

## Ghi chú an toàn quan trọng

> ⚠️ KHÔNG bao giờ hard-delete mà không qua Trash trong lần đầu
> ⚠️ Luôn kiểm tra file lock trước khi xóa
> ⚠️ Với node_modules: kiểm tra `package.json` tồn tại và project còn active
> ⚠️ Với App Leftovers: chỉ gợi ý, không auto-delete, user phải confirm
> ⚠️ Không đụng vào System folder (`/System`, `/usr`, `/bin`)
> ⚠️ iCloud files: không xóa, chỉ evict (offload) để tránh mất data

---

*File này được update khi feature hoàn thiện hoặc kế hoạch thay đổi.*
