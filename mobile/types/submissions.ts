export type PeriodInfo = {
  period_start: string
  period_end: string
  due_date: string
  grace_end: string
  status: 'Open' | 'Overdue' | 'Missed' | 'Submitted'
  verified_count: number
  submission_id: number | null
  is_late: boolean | null
  submitted_at: string | null
  can_submit: boolean
}

export type PreviewRow = {
  report_id: number
  purok: number | null
  severity: 'Critical' | 'Medium' | 'Low' | null
  date_observed: string | null
  date_responded: string | null
  waste_collected_amount: number | null
  waste_collected_unit: string
  node_name: string
  from_clog_event: boolean
  carried_over: boolean
}

export type SubmissionPreview = {
  period_start: string
  period_end: string
  due_date: string
  grace_end: string
  today: string
  status: PeriodInfo['status']
  would_be_late: boolean
  days_late: number
  already_submitted: boolean
  reports: PreviewRow[]
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