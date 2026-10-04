import type {
  CanalMonitoringReport, ReportSeverity, WaterLevel, ObstructionCoverage,
  WaterFlowCondition,
} from "@/types/report"

type BadgeStyle = { badge: string; dot: string }

export const SEVERITY_STYLE: Record<ReportSeverity, BadgeStyle> = {
  Critical: { badge: "bg-[#FDD1D2] text-[#CC251F]", dot: "bg-[#CC251F]" },
  Medium:   { badge: "bg-[#FFF3E0] text-[#E65100]", dot: "bg-[#E65100]" },
  Low:      { badge: "bg-[#DBEAFE] text-[#1565BC]", dot: "bg-[#1565BC]" },
}

export const WATER_LEVEL_LABEL: Record<WaterLevel, string> = {
  Low: "Low", Moderate: "Moderate", High: "High",
}

export const OBSTRUCTION_LABEL: Record<ObstructionCoverage, string> = {
  Under_25: "<25%", "25_50": "25–50%", "50_75": "50–75%", Over_75: ">75%",
}

export const WATER_FLOW_LABEL: Record<WaterFlowCondition, string> = {
  Normal: "Normal", Reduced: "Reduced", Blocked: "Blocked",
}

// the nine fixed categories; "Other" is handled separately because it carries a label
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

// 'YYYY-MM' of the submission. The API sends Manila-local timestamps, so the string
// prefix is the right month (no timezone conversion needed).
export const monthOf = (report: CanalMonitoringReport): string =>
  reportDate(report).slice(0, 7)

// Cleanups are held every Saturday, and any 7-day block contains exactly one Saturday,
// so Week N is days 7(N-1)+1 to 7N of the month (Week 5 is the 29th to the end).
export const weekOf = (report: CanalMonitoringReport): number =>
  Math.ceil(Number(reportDate(report).slice(8, 10)) / 7)

const daysIn = (month: string): number => {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m, 0).getDate()
}

export const weekRange = (month: string, week: number): { start: number; end: number } => ({
  start: 7 * (week - 1) + 1,
  end: Math.min(7 * week, daysIn(month)),
})

// "All" plus the weeks that exist in that month; weeks only make sense inside one month
export const buildWeekOptions = (month: string): { value: string; label: string }[] => {
  const options = [{ value: "All", label: "All weeks" }]
  if (month === "All") return options

  const monthName = new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" })
  const weeks = Math.ceil(daysIn(month) / 7)
  for (let w = 1; w <= weeks; w++) {
    const { start, end } = weekRange(month, w)
    options.push({ value: String(w), label: `Week ${w} (${monthName} ${start}–${end})` })
  }
  return options
}

export const weekMatches = (report: CanalMonitoringReport, week: string): boolean =>
  week === "All" || String(weekOf(report)) === week

// e.g. "October 1 - 7, 2026" for the Reporting Period card
export const periodRangeLabel = (month: string, week: string): string => {
  if (month === "All") return "All months"
  const [y, m] = month.split("-").map(Number)
  const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long" })
  if (week === "All") return `${monthName} 1 - ${daysIn(month)}, ${y}`
  const { start, end } = weekRange(month, Number(week))
  return `${monthName} ${start} - ${end}, ${y}`
}

// e.g. "October 2026 · Week 1" for titles
export const periodTitle = (month: string, week: string): string => {
  if (month === "All") return "Overall"
  return week === "All" ? formatMonthLabel(month) : `${formatMonthLabel(month)} · Week ${week}`
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