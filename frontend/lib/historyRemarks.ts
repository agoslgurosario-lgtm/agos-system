type WithRemarks = { start_remarks?: string | null; end_remarks?: string | null }

// one readable string for tables and print rows
export const remarksText = (h: WithRemarks) =>
  [
    h.start_remarks && `Placed: ${h.start_remarks}`,
    h.end_remarks && `Left: ${h.end_remarks}`,
  ].filter(Boolean).join(' | ') || '—'