export type ReadingStatus = 'Normal' | 'Warning' | 'Critical'

export interface SensorReading {
  reading_id: number
  node_details: {
    node_id: number
    node_name: string
    barangay_details: { barangay_id: number | null; barangay_name: string } | null
    hotspot_details: { hotspot_id: number | null; name: string } | null
  } | null
  water_level: number
  water_flow_rate: number | null
  water_flow: 'Normal' | 'Slow' | 'Stagnant'
  reading_status: ReadingStatus
  clog_pct: number | null
  timestamp: string
}

export interface ReadingsSummary {
  total: number
  normal: number
  warning: number
  critical: number
}

export interface ReadingsPage {
  count: number
  next: string | null
  previous: string | null
  results: SensorReading[]
  summary?: ReadingsSummary
}