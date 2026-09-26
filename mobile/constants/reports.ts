import type {
  ReportSeverity, WaterLevel, ObstructionCoverage,
  WaterFlowCondition, FinalCanalCondition,
} from '@/types/reports'

export interface Option<T extends string> {
  value: T
  label: string
}

export const SEVERITY_OPTIONS: Option<ReportSeverity>[] = [
  { value: 'Critical', label: 'Critical' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
]

// used for badges in the list and view screens (swap colors if your web uses different ones)
export const SEVERITY_COLORS: Record<ReportSeverity, { bg: string; text: string }> = {
  Critical: { bg: '#FEE2E2', text: '#B91C1C' },
  Medium: { bg: '#FEF3C7', text: '#B45309' },
  Low: { bg: '#DBEAFE', text: '#1D4ED8' },
}

export const WATER_LEVEL_OPTIONS: Option<WaterLevel>[] = [
  { value: 'Low', label: 'Low' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'High', label: 'High' },
]

export const OBSTRUCTION_COVERAGE_OPTIONS: Option<ObstructionCoverage>[] = [
  { value: 'Under_25', label: '<25%' },
  { value: '25_50', label: '25–50%' },
  { value: '50_75', label: '50–75%' },
  { value: 'Over_75', label: '>75%' },
]

export const WATER_FLOW_OPTIONS: Option<WaterFlowCondition>[] = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Reduced', label: 'Reduced' },
  { value: 'Blocked', label: 'Blocked' },
]

export const FINAL_CONDITION_OPTIONS: Option<FinalCanalCondition>[] = [
  { value: 'Clear', label: 'Clear' },
  { value: 'Partially_Clear', label: 'Partially Clear' },
  { value: 'Still_Obstructed', label: 'Still Obstructed' },
]

// turns a stored value into its display label, e.g. 'Under_25' → '<25%'
export function optionLabel<T extends string>(
  options: Option<T>[],
  value: T | null | undefined
): string {
  return options.find((o) => o.value === value)?.label ?? '—'
}