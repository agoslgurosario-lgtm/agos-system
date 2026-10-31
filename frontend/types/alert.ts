export type AlertType =
  | "Water_Level_Rising"
  | "Low_Clog_Alert"
  | "Moderate_Clog_Alert"
  | "Critical_Clog"
  | "Node_Offline"
  | "Low_Battery"
  | "Weak_Signal"
  | "Sensor_Failure"
  | "Report_Submitted" // guess: match the backend value
  | "Waste_Type_Rejected"
  | "Waste_Type_Approved";

export interface AlertContext {
  // clog alerts
  water_level?: number;
  water_flow?: string;
  water_flow_rate?: number | null;
  clog_pct?: number;
  dominant_waste_type?: string;
  recyclable_pct?: number;
  biodegradable_pct?: number;
  residual_pct?: number;
  special_waste_pct?: number;
  confidence?: number;
  estimated_volume?: number;
  // water level alerts
  severity?: "Warning" | "Critical";
  water_level_pct?: number | null;
  warning_pct?: number;
  critical_pct?: number;
  // waste type review alerts
  waste_type?: string;
  reason?: string;
  original_name?: string;
}

export interface Alert {
  alert_id: number;
  alert_type: AlertType;
  node_name: string | null;
  barangay_name: string | null;
  barangay_id?: number | null;
  timestamp: string;
  is_read: boolean;
  alert_context: AlertContext | null;
}
