export type PeriodStatus = "Open" | "Overdue" | "Missed" | "Submitted"

// one half-month submission period from GET /api/canal-reports/periods/
export type PeriodInfo = {
  period_start: string // YYYY-MM-DD
  period_end: string
  due_date: string
  status: PeriodStatus
  can_submit: boolean
  verified_count: number
  late_until?: string | null // last day a late submission is still accepted (Overdue periods)
}

// one row of GET /api/canal-reports/submission-preview/?period=YYYY-MM-DD
export type PreviewReportRow = {
  report_id: number
  purok: number | null
  severity: string | null
  date_observed: string | null
  date_responded: string | null
  waste_collected_amount: number | null
  waste_collected_unit: string
  node_name: string
  from_clog_event: boolean
  carried_over: boolean
  purok_label: string
}

// GET /api/canal-reports/submission-preview/?period=YYYY-MM-DD  (saves nothing)
export type SubmissionPreview = {
  period_start: string
  period_end: string
  due_date: string
  today: string
  status: PeriodStatus
  grace_end: string
  would_be_late: boolean
  days_late: number
  already_submitted: boolean
  reports: PreviewReportRow[]
  totals: {
    report_count: number
    total_waste_kg: number
    avg_response_minutes: number | null
    severity_counts: Record<string, number>
    purok_counts: Record<string, number>
  }
  signatories: Record<string, string>
  unverified_count: number
  blockers: string[]
  warnings: string[]
  can_submit: boolean
}