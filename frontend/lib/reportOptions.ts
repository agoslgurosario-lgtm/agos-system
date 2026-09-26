import type {
  CanalMonitoringReport, ReportSeverity, WaterLevel, ObstructionCoverage,
  WaterFlowCondition, FinalCanalCondition,
} from "@/types/report"

type BadgeStyle = { badge: string; dot: string }

export const SEVERITY_STYLE: Record<ReportSeverity, BadgeStyle> = {
  Critical: { badge: "bg-[#FDD1D2] text-[#CC251F]", dot: "bg-[#CC251F]" },
  Medium:   { badge: "bg-[#FFF3E0] text-[#E65100]", dot: "bg-[#E65100]" },
  Low:      { badge: "bg-[#DBEAFE] text-[#1565BC]", dot: "bg-[#1565BC]" },
}

export const FINAL_CONDITION_LABEL: Record<FinalCanalCondition, string> = {
  Clear: "Clear",
  Partially_Clear: "Partially Clear",
  Still_Obstructed: "Still Obstructed",
}

export const FINAL_CONDITION_STYLE: Record<FinalCanalCondition, BadgeStyle> = {
  Clear:            { badge: "bg-[#B2FBC173] text-[#2C7B3C]", dot: "bg-[#2C7B3C]" },
  Partially_Clear:  { badge: "bg-[#FFF3E0] text-[#E65100]",   dot: "bg-[#E65100]" },
  Still_Obstructed: { badge: "bg-[#FDD1D2] text-[#CC251F]",   dot: "bg-[#CC251F]" },
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

// 'YYYY-MM' of when the incident was observed. The API sends Manila-local timestamps,
// so the string prefix is the right month (no timezone conversion needed).
export const monthOf = (report: CanalMonitoringReport): string =>
  (report.date_observed ?? "").slice(0, 7)

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