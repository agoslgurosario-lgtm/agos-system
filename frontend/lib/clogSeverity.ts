// DB values stay Low/Medium/High; only the displayed word changes
const CLOG_SEVERITY_LABEL: Record<string, string> = {
  Low: 'Low',
  Medium: 'Moderate',
  High: 'Critical',
}

export const clogSeverityLabel = (s?: string | null) =>
  (s && CLOG_SEVERITY_LABEL[s]) || s || '—'

export type ClogLevel = 'Critical' | 'Moderate' | 'Low' | 'Normal' | 'Unknown'

// clog % -> level, same cutoffs as the backend (30 / 60 / 80)
export const clogLevel = (pct: number | null | undefined): ClogLevel =>
  pct == null ? 'Unknown'
  : pct >= 80 ? 'Critical'
  : pct >= 60 ? 'Moderate'
  : pct >= 30 ? 'Low'
  : 'Normal'

// one legend for every screen that shows clog levels
export const CLOG_LEGEND = [
  { label: 'Critical', range: '80% - 100%', dot: 'bg-[#D81010]' },
  { label: 'Moderate', range: '60% - 79%', dot: 'bg-[#E65100]' },
  { label: 'Low',      range: '30% - 59%', dot: 'bg-[#E4B600]' },
  { label: 'Normal',   range: '0% - 29%',  dot: 'bg-[#2C7B3C]' },
]