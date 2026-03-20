# CleanTool — Strategic Launch Plan

> **Định vị:** Mac cleaner dành cho developer — dọn npm, Cargo, Homebrew, node_modules.
> **Giá:** $19.99 one-time purchase
> **Mục tiêu Year 1:** 500 licenses = ~$10,000 ARR

---

## Bức tranh toàn cảnh

```
PHASE 1          PHASE 2            PHASE 3           PHASE 4
Pre-Launch       Launch Day         Post-Launch        Growth
(4 tuần)         (Tuần 1)           (Tháng 2–3)        (Tháng 4–12)
   │                  │                  │                  │
   ▼                  ▼                  ▼                  ▼
Chuẩn bị         Tấn công          Tối ưu            Mở rộng
landing page     HN + PH +         onboarding        affiliate +
+ trial build    Twitter           + reviews         updates
```

---

## PHASE 1 — Pre-Launch (4 tuần trước launch)

### 1.1 Sản phẩm
- [ ] Build `.dmg` ổn định, codesign + notarize (bắt buộc cho macOS 11+)
- [ ] Trial mode: full-featured 14 ngày (không cần tài khoản, không email)
- [ ] License key system (Paddle tích hợp sẵn)
- [ ] Auto-updater (Squirrel qua electron-updater)

### 1.2 Landing Page
**Nội dung phải có:**
- Headline: *"Clean your Mac. Especially the 40 GB of dev caches you forgot about."*
- Demo GIF/video: quét ra npm cache 8GB + node_modules 15GB + Xcode 20GB
- Feature breakdown với screenshots thực tế
- "Moves to Trash only. Always." — nổi bật, lặp lại nhiều lần
- Pricing: $19.99 one-time, so sánh với CleanMyMac $119.95
- Download trial button (không cần email)
- Buy button (Paddle checkout)

**Tech:** có thể dùng Framer, Carrd, hoặc Next.js tự build

### 1.3 Kênh thanh toán
- **Paddle** (Merchant of Record) — tự xử lý VAT/thuế toàn cầu
  - Phí: 5% + $0.50/transaction
  - Tích hợp license key tự động
  - Hỗ trợ refund dễ dàng (trust signal)

### 1.4 Nội dung chuẩn bị trước
- [ ] Bài blog: *"How I freed up 60 GB on my MacBook — and automated it"*
- [ ] Tweet thread về dev cache sprawl (có số liệu thực)
- [ ] Show HN draft (viết sẵn, review kỹ)

---

## PHASE 2 — Launch Day (Tuần 1)

### Thứ tự tấn công trong ngày launch

| Giờ | Hành động | Mục tiêu |
|-----|-----------|-----------|
| 06:00 | Post **Hacker News** "Show HN" | Developer traffic |
| 07:00 | Post **Product Hunt** | Visibility rộng |
| 08:00 | Tweet thread cá nhân | Community |
| 10:00 | Post **Reddit** r/macapps, r/webdev, r/rust | Niche audience |
| 12:00 | Post **Dev.to / Hashnode** bài blog | SEO dài hạn |
| 15:00 | Reply tất cả comments HN + PH | Tăng ranking |

### Hacker News — Show HN

```
Show HN: CleanTool – a Mac cleaner that actually knows about
npm, Cargo, Homebrew and node_modules

Built this because CleanMyMac had zero support for the 40 GB
of dev caches sitting on my MacBook. Cleans npm/pnpm/yarn/cargo/
homebrew/xcode/pip caches and recursively finds node_modules
across all your projects. Everything goes to Trash, never
permanent delete. $19.99 one-time.

[link to landing page]
```

### Product Hunt
- Tagline: *"The Mac cleaner built for developers"*
- Thumbnail: screenshot Dev Tools tab với số GB rõ ràng
- Offer: 20% off launch discount code (48 giờ đầu)

---

## PHASE 3 — Post-Launch (Tháng 2–3)

### 3.1 Kênh bán hàng bổ sung
- [ ] **Mac App Store** — build sandbox version (System Cache + Large Files + Logs)
  - Không có Dev Tools đầy đủ do sandbox restriction
  - Ghi rõ: "Full version with Dev Tools available at [website]"
- [ ] **Indie Hackers** — post story + milestone updates
- [ ] **MacRumors / AppleInsider** — press outreach (1-2 câu, link download)

### 3.2 SEO Content
Bài viết target các keyword có buyer intent:

| Keyword | Nội dung |
|---------|---------|
| "clean npm cache mac" | Tutorial + CTA download |
| "remove node_modules mac" | Tutorial + CTA download |
| "free up space mac developer" | Roundup bao gồm CleanTool |
| "cleanmymac alternative" | Comparison page |

### 3.3 Reviews
- Gửi license miễn phí cho 5–10 Mac blogger nhỏ
- Target: MacStories, Macworld (indie reviewers), YouTube channels ~50K subs

### 3.4 Metrics cần theo dõi

| Metric | Target Tháng 1 | Target Tháng 3 |
|--------|---------------|---------------|
| Website visitors | 2,000 | 5,000/tháng |
| Trial downloads | 200 | 500/tháng |
| Trial → Paid rate | 10% | 15% |
| Licenses sold | 20 | 75 |
| Revenue | $400 | $1,500/tháng |

---

## PHASE 4 — Growth (Tháng 4–12)

### 4.1 Affiliate Program
- 30% commission cho mỗi sale
- Target: Mac productivity blogger, YouTube, newsletter
- Platform: Paddle Affiliate hoặc Gumroad (nếu dùng Gumroad)

### 4.2 Roadmap tính năng (tăng perceived value)
- **v1.1** — Duplicate Files finder
- **v1.2** — Docker image/layer cleaner
- **v1.3** — Scheduled auto-scan (weekly report)
- **v2.0** — Native Swift/SwiftUI rewrite (loại bỏ Electron stigma)

### 4.3 Pricing evolution
- Giữ $19.99 cho đến 500 licenses
- Sau 500 licenses: tăng lên $24.99 (FOMO pricing, "founding member rate đã hết")
- Thêm Family Pack: $34.99 / 3 Macs

### 4.4 Newsletter
- Capture email sau khi download trial (optional, không ép)
- Monthly email: tips dọn Mac, changelog, milestones
- Mục tiêu 1,000 subscribers = remarketing pool cho v2

---

## Rủi ro và cách xử lý

| Rủi ro | Xác suất | Cách giảm thiểu |
|--------|----------|-----------------|
| "Electron app chậm" | Cao | Benchmark RAM usage, publish số liệu, viết rõ trên landing page |
| macOS update phá tính năng | Trung bình | Test trên beta macOS, update nhanh trong 48h |
| CleanMyMac copy dev tools | Thấp (ngắn hạn) | Build moat bằng brand + community trust |
| Apple tăng tính năng native Storage | Thấp (2026) | Focus developer angle — Apple không làm điều này |
| Low conversion rate | Trung bình | A/B test headline + pricing, thêm testimonials |

---

## Budget ước tính (minimal)

| Hạng mục | Chi phí |
|---------|---------|
| Apple Developer Account | $99/năm |
| Code signing certificate | Included trong Apple Dev |
| Paddle setup | $0 (pay per transaction) |
| Landing page (Framer/Carrd) | $0–$20/tháng |
| Domain + hosting | ~$20/năm |
| **Tổng đầu tư ban đầu** | **~$120** |

---

## Mục tiêu Year 1

```
Tháng 1–3:   Validation     →  50 licenses    →  ~$1,000
Tháng 4–6:   Traction       →  150 licenses   →  ~$3,000
Tháng 7–12:  Growth         →  300 licenses   →  ~$6,000
                                               ─────────
                              TỔNG:            ~$10,000
```

Nếu đạt **500 licenses trong năm đầu** với chi phí ~$120: ROI ~8,200%

---

## Checklist trước khi launch

### Sản phẩm
- [ ] App chạy ổn trên macOS 13, 14, 15 (Intel + Apple Silicon)
- [ ] Codesign + Notarize thành công
- [ ] Trial mode hoạt động đúng (14 ngày, expire gracefully)
- [ ] License activation/deactivation hoạt động
- [ ] Auto-updater test qua

### Business
- [ ] Paddle account live, webhook test
- [ ] Landing page live với buy button
- [ ] Privacy policy + Terms (1 trang đơn giản, bắt buộc cho Paddle)
- [ ] Support email setup (support@cleantool.app hoặc tương tự)
- [ ] Refund policy rõ ràng (30 ngày = trust signal mạnh)

### Marketing
- [ ] Show HN draft review xong
- [ ] Product Hunt draft + assets sẵn sàng
- [ ] Demo GIF/video quay xong
- [ ] Blog post viết xong, schedule sẵn
