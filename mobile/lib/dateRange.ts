// 'YYYY-MM-DD' in the phone's local time
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 'YYYY-MM-DD' -> Date at local midnight
export function fromISODate(iso: string): Date {
  return new Date(`${iso}T00:00:00`)
}

// first day of this month .. today (the default range on most screens)
export function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) }
}

export function todayRange(): { from: string; to: string } {
  const today = toISODate(new Date())
  return { from: today, to: today }
}

// 'Oct 1, 2026 - Oct 2, 2026' for the filter button and empty-state text
export function rangeLabel(from: string, to: string): string {
  const fmt = (iso: string) =>
    fromISODate(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  if (from && to) return from === to ? fmt(from) : `${fmt(from)} - ${fmt(to)}`
  if (from) return `From ${fmt(from)}`
  if (to) return `Until ${fmt(to)}`
  return 'All Time'
}

// ?from=..&to=.. for the API, or the fallback when no range is set
export function rangeQuery(from: string, to: string, fallback = 'month=All'): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return params.toString() || fallback
}

// is an ISO timestamp inside the range (local dates, both ends included, empty side = open)?
export function inRange(iso: string, from: string, to: string): boolean {
  const day = toISODate(new Date(iso))
  return (!from || day >= from) && (!to || day <= to)
}
