export type ReportSeverity = 'Critical' | 'Medium' | 'Low'
export type WaterLevel = 'Low' | 'Moderate' | 'High'
export type ObstructionCoverage = 'Under_25' | '25_50' | '50_75' | 'Over_75'
export type WaterFlowCondition = 'Normal' | 'Reduced' | 'Blocked'
export type FinalCanalCondition = 'Clear' | 'Partially_Clear' | 'Still_Obstructed'
export type MediaCategory = 'Before_Clearing' | 'After_Clearing' | 'Additional_Evidence'

export type ReportBarangay = {
  barangay_id: number
  barangay_name: string
  latitude: number
  longitude: number
  is_registered: boolean
}

export type ReportUser = {
  user_id: number
  first_name: string
  last_name: string
  position: string
}

export type ReportMedia = {
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

export type CanalMonitoringReport = {
  report_id: number
  is_submitted: boolean

  barangay: number
  canal_name: string | null
  latitude: number | null
  longitude: number | null
  nearest_landmark: string

  date_observed: string | null
  severity: ReportSeverity | null

  water_level: WaterLevel | null
  obstruction_coverage: ObstructionCoverage | null
  water_flow_condition: WaterFlowCondition | null

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

  assigned_personnel: string | null
  date_responded: string | null
  action_taken: string | null
  waste_collected_amount: number | null
  waste_collected_unit: string
  final_canal_condition: FinalCanalCondition | null
  remarks: string

  reported_by: number | null
  clog_event: number | null
  created_at: string

  barangay_details: ReportBarangay | null
  reported_by_details: ReportUser | null
  media: ReportMedia[]
}