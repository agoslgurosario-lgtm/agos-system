export interface ClogEvent {
  event_id: number
  node: number
  barangay: number
  classification: number | null
  clear_streak: number
  severity: 'Low' | 'Medium' | 'High'
  first_severity: 'Low' | 'Medium' | 'High' | null
  peak_severity: 'Low' | 'Medium' | 'High' | null
  status: 'Detected' | 'Responded' | 'Cleared' | 'Verified'
  detected_at: string
  responded_at: string | null
  resolved_at: string | null
  cleared_by: number | null
  responded_by: number | null
  auto_cleared: boolean
  barangay_details: {
    barangay_id: number
    barangay_name: string
  } | null

  node_details: {
    node_id: number
    node_name: string
  } | null

  classification_details: {
    dominant_waste_type: string
    recyclable_pct: number
    biodegradable_pct: number
    residual_pct: number
    special_waste_pct: number
    none_pct: number
    confidence: number
    estimated_volume: number
  } | null

  reading_details: {
    reading_id: number
    water_level: number | null
    water_flow_rate: number | null
    water_flow: string
    reading_status: string
    clog_pct: number | null
    timestamp: string
  } | null

  cleared_by_details: {
    user_id: number
    first_name: string
    last_name: string
  } | null

  responded_by_details: {
    user_id: number
    first_name: string
    last_name: string
  } | null
}