// 'YYYY-MM-DD' in local time
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// first day of this month .. today (the default range on most pages)
export function currentMonthRange(): { from: string; to: string } {
  const now = new Date()
  return { from: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISODate(now) }
}

// ?from=..&to=.. for the API, or the fallback when no range is picked
export function rangeQuery(from: string, to: string, fallback = 'month=All'): string {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  return params.toString() || fallback
}