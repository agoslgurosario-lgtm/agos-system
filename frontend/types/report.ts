export type ReportSeverity = 'Critical' | 'Medium' | 'Low'
export type WaterLevel = 'Low' | 'Moderate' | 'High'
export type ObstructionCoverage = 'Under_25' | '25_50' | '50_75' | 'Over_75'
export type WaterFlowCondition = 'Normal' | 'Reduced' | 'Blocked'
export type MediaCategory = 'Before_Clearing' | 'After_Clearing' | 'Additional_Evidence'

export type ReportBarangay = {
  barangay_id: number
  barangay_name: string
  latitude: number
  longitude: number
  is_registered: boolean
  is_active?: boolean
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

export type ReportNodeSummary = {
  summary_id: number
  node: number | null
  hotspot: number | null
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
}

export type ReportSubmissionInfo = {
  submission_id: number
  period_start: string
  period_end: string
  label: string
  is_late: boolean
  days_late: number
  submitted_at: string
}

export type CanalMonitoringReport = {
  report_id: number
  is_submitted: boolean

  barangay: number
  purok: number | null
  report_scope: 'Purok' | 'Barangay'
  condition_source: 'Sensor' | 'Manual' | 'Mixed'
  purok_rows?: ReportPurokRow[]
  node_summaries?: ReportNodeSummary[]
  submission_info?: ReportSubmissionInfo | null

  date_observed: string | null
  severity: ReportSeverity | null

  overall_water_level: WaterLevel | null
  overall_obstruction_coverage: ObstructionCoverage | null
  overall_water_flow_condition: WaterFlowCondition | null

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

  assigned_personnel: string | null
  date_responded: string | null
  action_taken: string | null
  waste_collected_amount: number | null
  waste_collected_unit: string
  remarks: string

  reported_by: number | null
  clog_event: number | null
  created_at: string
  submitted_at: string | null

  barangay_details: ReportBarangay | null
  reported_by_details: ReportUser | null
  media: ReportMedia[]

  signatory_snapshot: Record<string, string> | null
}

export type ReportPurokRow = {
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

export type ReportCustomWaste = {
  item_id: number
  waste_type: number
  waste_type_name: string
  waste_type_status: 'Pending' | 'Approved' | 'Rejected'
  weight_kg: number
}