import type {
  CanalMonitoringReport, ReportSeverity, WaterLevel, ObstructionCoverage,
  WaterFlowCondition, ReportPurokRow,
} from "@/types/report"

type BadgeStyle = { badge: string; dot: string }

export const SEVERITY_STYLE: Record<ReportSeverity, BadgeStyle> = {
  Critical: { badge: "bg-[#FDD1D2] text-[#CC251F]", dot: "bg-[#CC251F]" },
  Medium:   { badge: "bg-[#FFF3E0] text-[#E65100]", dot: "bg-[#E65100]" },
  Low:      { badge: "bg-[#DBEAFE] text-[#1565BC]", dot: "bg-[#1565BC]" },
}

export const SEVERITY_LABEL: Record<ReportSeverity, string> = {
  Critical: "Critical", Medium: "Moderate", Low: "Low",
}

export const reportSeverityLabel = (s?: string | null) =>
  (s && (SEVERITY_LABEL as Record<string, string>)[s]) || s || ""

export const WATER_LEVEL_LABEL: Record<WaterLevel, string> = {
  Low: "Low", Moderate: "Moderate", High: "High",
}

export const OBSTRUCTION_LABEL: Record<ObstructionCoverage, string> = {
  Under_25: "<25%", "25_50": "25–50%", "50_75": "50–75%", Over_75: ">75%",
}

export const WATER_FLOW_LABEL: Record<WaterFlowCondition, string> = {
  Normal: "Normal", Reduced: "Reduced", Blocked: "Blocked",
}

// the twelve fixed categories; "Other" is handled separately because it carries a label
export const WASTE_CATEGORIES: { key: keyof CanalMonitoringReport; label: string }[] = [
  { key: "waste_plastic_kg", label: "Plastic" },
  { key: "waste_food_wrapper_kg", label: "Food Wrapper" },
  { key: "waste_paper_cardboard_kg", label: "Paper / Cardboard" },
  { key: "waste_glass_kg", label: "Glass" },
  { key: "waste_organic_kg", label: "Organic" },
  { key: "waste_metal_kg", label: "Metal" },
  { key: "waste_foam_kg", label: "Foam" },
  { key: "waste_textile_kg", label: "Clothes / Textiles" },
  { key: "waste_ewaste_kg", label: "E-waste" },
  { key: "waste_sanitary_kg", label: "Sanitary / Hygiene" },
  { key: "waste_footwear_kg", label: "Footwear / Rubber" },
  { key: "waste_medical_kg", label: "Medical" },
]


export const formatDateTime = (iso: string | null): string => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  })
}

export const formatDate = (iso: string | null): string => {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// The date a report counts under is when it was SUBMITTED (people file late, so the
// observed or created dates would put it in the wrong period). Drafts never reach the
// admin/MENRO lists, so the created_at fallback is only a safety net.
export const reportDate = (report: CanalMonitoringReport): string =>
  report.submitted_at ?? report.created_at

const pad = (n: number) => String(n).padStart(2, "0")

const daysIn = (month: string): number => {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}

// The period a date falls in, as its start date: 1st-15th and 16th-30th (last day in
// February). The 31st rolls into the next period. Same rule as the backend.
export const periodStartOf = (isoDate: string): string => {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number)
  if (d <= 15) return `${y}-${pad(m)}-01`
  if (d <= 30) return `${y}-${pad(m)}-16`
  return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`
}

// A submitted report belongs to the period it was submitted FOR (people file late).
// Reports from before the period system have no submission, so they use their submitted date.
export const periodOf = (report: CanalMonitoringReport): string =>
  report.submission_info?.period_start ?? periodStartOf(reportDate(report))

// 'YYYY-MM' of the period
export const monthOf = (report: CanalMonitoringReport): string => periodOf(report).slice(0, 7)

// "Oct 16-30"
export const periodLabelOf = (start: string): string => {
  const [y, m, d] = start.split("-").map(Number)
  const mon = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" })
  return d === 1 ? `${mon} 1-15` : `${mon} 16-${Math.min(30, daysIn(start.slice(0, 7)))}`
}

export const currentPeriodStart = (): string => periodStartOf(new Date().toLocaleDateString("en-CA"))

// "All" plus the two periods of that month; periods only make sense inside one month
export const buildPeriodOptions = (month: string): { value: string; label: string }[] => {
  const options = [{ value: "All", label: "All periods" }]
  if (month === "All") return options
  ;[`${month}-01`, `${month}-16`].forEach(v => options.push({ value: v, label: periodLabelOf(v) }))
  return options
}

export const periodMatches = (report: CanalMonitoringReport, period: string): boolean =>
  period === "All" || periodOf(report) === period

// e.g. "October 16 - 30, 2026" for the Reporting Period card
export const periodRangeLabel = (month: string, period: string): string => {
  if (month === "All") return "All months"
  const [y, m] = month.split("-").map(Number)
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" })
  const last = Math.min(30, daysIn(month))
  if (period === "All") return `${monthName} 1 - ${last}, ${y}`
  return `${monthName} ${period.endsWith("-01") ? "1 - 15" : `16 - ${last}`}, ${y}`
}

// e.g. "October 2026 · Oct 16-30" for titles
export const periodTitle = (month: string, period: string): string => {
  if (month === "All") return "Overall"
  return period === "All" ? formatMonthLabel(month) : `${formatMonthLabel(month)} · ${periodLabelOf(period)}`
}

export const filedByName = (report: CanalMonitoringReport): string =>
  report.reported_by_details
    ? `${report.reported_by_details.first_name} ${report.reported_by_details.last_name}`
    : "—"

export const formatMonthLabel = (value: string): string =>
  new Date(`${value}-01T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" })

// January-December of the current year, widened to cover any year that has reports.
// Oldest first, so it reads like a calendar and empty months can still be picked.
export const buildMonthOptions = (reports: CanalMonitoringReport[]): { value: string; label: string }[] => {
  const year = new Date().getFullYear()
  const reportMonths = reports.map(monthOf).filter(Boolean)
  const earliest = [`${year}-01`, ...reportMonths].sort()[0]
  const latest = [`${year}-12`, ...reportMonths].sort().reverse()[0]

  const options: { value: string; label: string }[] = []
  let [y, m] = earliest.split("-").map(Number)
  const [endY, endM] = latest.split("-").map(Number)
  while (y < endY || (y === endY && m <= endM)) {
    const value = `${y}-${String(m).padStart(2, "0")}`
    options.push({ value, label: formatMonthLabel(value) })
    m += 1
    if (m > 12) { m = 1; y += 1 }
  }
  return options
}

// minutes between the problem being observed and the barangay responding;
// null when either time is missing (submit enforces both, so this only guards old data)
export const responseMinutes = (report: CanalMonitoringReport): number | null => {
  if (!report.date_observed || !report.date_responded) return null
  const diff =
    (new Date(report.date_responded).getTime() - new Date(report.date_observed).getTime()) / 60000
  return Number.isFinite(diff) && diff >= 0 ? diff : null
}

export const averageResponseMinutes = (reports: CanalMonitoringReport[]): number | null => {
  const values = reports.map(responseMinutes).filter((v): v is number => v !== null)
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
}

// "45m", "3h 20m", "1d 4h"
export const formatDuration = (minutes: number | null): string => {
  if (minutes === null) return "—"
  const total = Math.round(minutes)
  if (total < 60) return `${total}m`
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  if (days > 0) return `${days}d ${hours}h`
  return `${hours}h ${total % 60}m`
}

// weekly cleanup report = covers the whole barangay (report_scope "Barangay")
export const isCleanupReport = (r: CanalMonitoringReport): boolean => r.report_scope === "Barangay"

export const purokLabel = (r: CanalMonitoringReport): string =>
  isCleanupReport(r) ? "Whole barangay" : r.purok ? `Purok ${r.purok}` : "—"

export const cleanupCoverage = (r: CanalMonitoringReport): { counted: number; total: number } => {
  const rows = r.purok_rows ?? []
  return { counted: rows.filter(x => x.included).length, total: rows.length }
}

export const purokRowNote = (row: ReportPurokRow): string =>
  row.node_count === 0 ? "No sensors" : "No readings this week"

export const ON_TIME_STYLE: BadgeStyle = { badge: "bg-[#DCFCE7] text-[#15803D]", dot: "bg-[#15803D]" }
export const LATE_STYLE: BadgeStyle = { badge: "bg-[#FDD1D2] text-[#CC251F]", dot: "bg-[#CC251F]" }

// null for reports submitted before the period system existed
export const submissionStatus = (r: CanalMonitoringReport): "On time" | "Late" | null =>
  r.submission_info ? (r.submission_info.is_late ? "Late" : "On time") : null