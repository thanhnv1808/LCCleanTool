import type { Lang } from '../i18n/translations'
import { translations } from '../i18n/translations'

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function formatDate(ms: number, lang: Lang = 'en'): string {
  if (!ms) return '—'
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US'
  return new Date(ms).toLocaleDateString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export function scanTimestampLabel(ts: number, lang: Lang = 'en'): string {
  const d = new Date(ts)
  const HH = d.getHours().toString().padStart(2, '0')
  const mm = d.getMinutes().toString().padStart(2, '0')
  const mins = Math.floor((Date.now() - ts) / 60000)
  const f = translations[lang].format
  const ago = mins < 1 ? f.justNow : mins < 60 ? f.minsAgo(mins) : f.hoursAgo(Math.floor(mins / 60))
  return f.scannedAt(`${HH}:${mm}`, ago)
}

export function timeAgo(ms: number, lang: Lang = 'en'): string {
  if (!ms) return '—'
  const diff = Date.now() - ms
  const days = Math.floor(diff / 86400000)
  const f = translations[lang].format
  if (days === 0) return f.today
  if (days === 1) return f.yesterday
  if (days < 30) return f.daysAgo(days)
  if (days < 365) return f.monthsAgo(Math.floor(days / 30))
  return f.yearsAgo(Math.floor(days / 365))
}
