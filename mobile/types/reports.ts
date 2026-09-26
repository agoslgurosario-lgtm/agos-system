import type { BarangayDetails } from './user'

export interface ReportMedia {
  media: number
  report: number | null
  clog_event_id: number | null
  media_category: MediaCategory
  file_path: string | null
  file_url: string | null
  media_type: 'Image' | 'Video'
  uploaded_at: string
  uploaded_by: number | null
}

export interface ReportUser {
  user_id: number
  first_name: string
  last_name: string
}

export type ReportSeverity = 'Critical' | 'Medium' | 'Low'
export type WaterLevel = 'Low' | 'Moderate' | 'High'
export type ObstructionCoverage = 'Under_25' | '25_50' | '50_75' | 'Over_75'
export type WaterFlowCondition = 'Normal' | 'Reduced' | 'Blocked'
export type FinalCanalCondition = 'Clear' | 'Partially_Clear' | 'Still_Obstructed'
export type WasteUnit = 'kg' | 'L' | 'Other'
export type MediaCategory = 'Before_Clearing' | 'After_Clearing' | 'Additional_Evidence'

export interface CanalMonitoringReport {
  report_id: number
  is_submitted: boolean

  // Monitoring site
  barangay: number
  canal_name: string | null
  latitude: number | null
  longitude: number | null
  nearest_landmark: string

  // Detection summary
  date_observed: string | null
  severity: ReportSeverity | null

  // Canal condition
  water_level: WaterLevel | null
  obstruction_coverage: ObstructionCoverage | null
  water_flow_condition: WaterFlowCondition | null

  // Waste composition (kg)
  waste_plastic_kg: number | null
  waste_food_wrapper_kg: number | null
  waste_paper_cardboard_kg: number | null
  waste_glass_kg: number | null
  waste_organic_kg: number | null
  waste_metal_kg: number | null
  waste_foam_kg: number | null
  waste_textile_kg: number | null
  waste_ewaste_kg: number | null
  waste_other_kg: number | null
  waste_other_label: string

  // Barangay response
  assigned_personnel: string | null
  date_responded: string | null
  action_taken: string | null
  waste_collected_amount: number | null
  waste_collected_unit: WasteUnit
  final_canal_condition: FinalCanalCondition | null
  remarks: string

  // Metadata
  reported_by: number | null
  clog_event: number | null
  created_at: string
  barangay_details: BarangayDetails | null
  reported_by_details: ReportUser | null
  media: ReportMedia[]
}