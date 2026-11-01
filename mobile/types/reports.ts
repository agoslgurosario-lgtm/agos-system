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
export type WasteUnit = 'kg' | 'L' | 'Other'
export type MediaCategory = 'Before_Clearing' | 'After_Clearing' | 'Additional_Evidence'

export interface CanalMonitoringReport {
  report_id: number
  is_submitted: boolean
  status: 'Draft' | 'Awaiting_Post_Report' | 'Ready_To_Verify' | 'Verified' | 'Submitted' | 'Voided'
  condition_source: 'Sensor' | 'Manual' | 'Mixed'
  report_scope: 'Purok' | 'Barangay'
  purok_rows?: ReportPurokRow[]
  post_completed_at: string | null
  verified_at: string | null
  verified_by_name: string | null
  void_reason?: string | null
  earlier_voided?: { report_id: number; reason: string; voided_at: string | null; voided_by_name: string | null }[]
  node_summaries?: {
    node_name: string
    hotspot_name: string
    purok: number | null
    window_start: string
    window_end: string
    reading_count: number
    peak_clog_pct: number | null
    avg_clog_pct: number | null
    peak_water_level_cm: number | null
    peak_water_level_pct: number | null
    min_flow_rate: number | null
    worst_water_status: string
    worst_flow: string
  }[]

  // Monitoring site
  barangay: number
  purok: number | null

  // Detection summary
  date_observed: string | null
  severity: ReportSeverity | null

  // Canal condition
  overall_water_level: WaterLevel | null
  overall_obstruction_coverage: ObstructionCoverage | null
  overall_water_flow_condition: WaterFlowCondition | null

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
  waste_sanitary_kg: number | null
  waste_footwear_kg: number | null
  waste_medical_kg: number | null
  waste_other_kg: number | null
  waste_other_label: string
  custom_waste: ReportCustomWaste[]

  // Barangay response
  assigned_personnel: string | null
  date_responded: string | null
  action_taken: string | null
  waste_collected_amount: number | null
  waste_collected_unit: WasteUnit
  remarks: string

  // Metadata
  reported_by: number | null
  clog_event: number | null
  created_at: string
  barangay_details: BarangayDetails | null
  reported_by_details: ReportUser | null
  media: ReportMedia[]
}

export interface CustomWasteType {
  waste_type_id: number
  name: string
  status: 'Pending' | 'Approved' | 'Rejected'
}

export interface ReportCustomWaste {
  item_id: number
  waste_type: number
  waste_type_name: string
  waste_type_status: 'Pending' | 'Approved' | 'Rejected'
  weight_kg: number
}

export interface ReportPurokRow {
  row_id: number
  purok: number
  included: boolean
  source: 'Sensor' | 'Manual'
  overall_water_level: WaterLevel | null
  overall_obstruction_coverage: ObstructionCoverage | null
  overall_water_flow_condition: WaterFlowCondition | null
  node_count: number
  reading_count: number
  peak_clog_pct: number | null
}

// one purok from GET /api/canal-reports/cleanup-preview/
export interface CleanupPreviewPurok {
  purok: number
  node_names: string[]
  has_sensor_data: boolean
  reading_count: number
  peak_clog_pct: number | null
  overall_water_level: WaterLevel | null
  overall_obstruction_coverage: ObstructionCoverage | null
  overall_water_flow_condition: WaterFlowCondition | null
}

export interface CleanupPreview {
  window_start: string
  window_end: string
  puroks: CleanupPreviewPurok[]
}

// local form state for one purok card
export interface PurokFormRow {
  included: boolean
  water: WaterLevel | null
  obstruction: ObstructionCoverage | null
  flow: WaterFlowCondition | null
}