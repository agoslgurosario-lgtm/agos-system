// DB values stay Low/Medium/High; only the displayed label changes
export const CLOG_SEVERITY_LABEL: Record<string, string> = {
  Low: 'Low',
  Medium: 'Moderate',
  High: 'Critical',
}

export const clogSeverityLabel = (s?: string | null) =>
  (s && CLOG_SEVERITY_LABEL[s]) || s || '—'