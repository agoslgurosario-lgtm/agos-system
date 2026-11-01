export interface SensorNodeApi {
  node_id: number;
  node_name: string;
  barangay_details: { barangay_id: number; barangay_name: string } | null;
  hotspot_details: {
    hotspot_id: number;
    name: string;
    description: string | null;
    latitude: number;
    longitude: number;
    canal_width: number | null;
    canal_depth: number | null;
    sensor_height: number | null;
    max_capacity_kg: number | null;
  } | null;
  status: string;
  availability_status: string;
  installed_at: string;
  water_level: number | null;
  water_flow_rate: number | null;
  clog_pct: number | null;
  condition: "Normal" | "Warning" | "Critical" | null;
  health_status: string | null;
  last_reading_at: string | null;
  is_online: boolean;
  is_force_sleeping: boolean;
}

export interface ClogEventApi {
  event_id: number;
  node: number;
  status: "Detected" | "Responded" | "Cleared"
  severity: "Low" | "Medium" | "High";
}