const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

/** "10 minutes ago" / "2 days ago" — the shape the dashboards render directly. */
export function relativeTime(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) {
    const m = Math.round(diff / MINUTE)
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (diff < DAY) {
    const h = Math.round(diff / HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  if (diff < WEEK) {
    const d = Math.round(diff / DAY)
    return `${d} day${d === 1 ? '' : 's'} ago`
  }
  const w = Math.round(diff / WEEK)
  return `${w} week${w === 1 ? '' : 's'} ago`
}

export function minutesSince(date) {
  if (!date) return null
  return Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / MINUTE))
}
