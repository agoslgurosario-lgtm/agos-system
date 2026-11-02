// Web port of the mobile constants/reports.ts.
// Types: merge the extra types from the mobile types/reports.ts (CustomWasteType, ReportPurokRow, CleanupPreviewPurok,
// WaterLevel, ObstructionCoverage, WaterFlowCondition, ...) into your web types/report.ts if they aren't there yet.
import type { ReportSeverity, WaterLevel, ObstructionCoverage, WaterFlowCondition } from "@/types/report"

export interface Option<T extends string> {
  value: T
  label: string
}

export const PUROK_OPTIONS: Option<string>[] = Array.from({ length: 7 }, (_, i) => ({
  value: String(i + 1),
  label: `Purok ${i + 1}`,
}))

export const SEVERITY_OPTIONS: Option<ReportSeverity>[] = [
  { value: "Critical", label: "Critical" },
  { value: "Medium", label: "Moderate" },
  { value: "Low", label: "Low" },
]

export const SEVERITY_LABEL_MAP: Record<string, string> = { Critical: "Critical", High: "High", Medium: "Moderate", Low: "Low" }
export const severityLabel = (s?: string | null) => (s && SEVERITY_LABEL_MAP[s]) || s || ""

export const SEVERITY_COLORS: Record<ReportSeverity, { bg: string; text: string }> = {
  Critical: { bg: "#FEE2E2", text: "#B91C1C" },
  Medium: { bg: "#FEF3C7", text: "#B45309" },
  Low: { bg: "#DBEAFE", text: "#1D4ED8" },
}

export const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Draft: { bg: "#f1f5f9", text: "#64748b", label: "Draft" },
  Awaiting_Post_Report: { bg: "#e0f2fe", text: "#0369a1", label: "Awaiting post-report" },
  Ready_To_Verify: { bg: "#fef3c7", text: "#b45309", label: "Ready to verify" },
  Verified: { bg: "#dcfce7", text: "#166534", label: "Verified" },
  Submitted: { bg: "#dbeafe", text: "#1d4ed8", label: "Submitted" },
  Voided: { bg: "#fee2e2", text: "#b91c1c", label: "Voided" },
}

export const WATER_LEVEL_OPTIONS: Option<WaterLevel>[] = [
  { value: "Low", label: "Low" },
  { value: "Moderate", label: "Moderate" },
  { value: "High", label: "High" },
]

export const OBSTRUCTION_COVERAGE_OPTIONS: Option<ObstructionCoverage>[] = [
  { value: "Under_25", label: "<25%" },
  { value: "25_50", label: "25–50%" },
  { value: "50_75", label: "50–75%" },
  { value: "Over_75", label: ">75%" },
]

export const WATER_FLOW_OPTIONS: Option<WaterFlowCondition>[] = [
  { value: "Normal", label: "Normal" },
  { value: "Reduced", label: "Reduced" },
  { value: "Blocked", label: "Blocked" },
]

export function optionLabel<T extends string>(options: Option<T>[], value: T | null | undefined): string {
  return options.find((o) => o.value === value)?.label ?? "—"
}
