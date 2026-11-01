export type HealthStatus = 'Normal' | 'Warning' | 'Critical'

export interface NodeHealthLog {
  health_id: number
  battery_voltage: number | null
  signal_strength: number | null
  sensor_continuity: boolean | null
  status: HealthStatus | string
  firmware_version: string | null
  checked_at: string
}