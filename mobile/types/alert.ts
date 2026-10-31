export type AlertType =
  | "Water_Level_Rising"
  | "Low_Clog_Alert"
  | "Moderate_Clog_Alert"
  | "Critical_Clog"
  | "Waste_Type_Rejected"
  | "Waste_Type_Approved"
  | "Node_Offline"
  | "Low_Battery"
  | "Weak_Signal"
  | "Sensor_Failure"
  | "Sensor_Failure"
  | "Report_Due_Soon"
  | "Report_Overdue";

export type ClogTier = "Low" | "Moderate" | "Critical";

export interface ClogAlertContext {
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
}

export type WaterSeverity = "Warning" | "Critical";

export interface WaterLevelAlertContext {
  severity?: WaterSeverity;
  water_level?: number;
  water_flow?: string;
  water_flow_rate?: number | null;
  water_level_pct?: number | null;
  warning_pct?: number;
  critical_pct?: number;
}

export interface WasteTypeRejectedContext {
  waste_type?: string;
  reason?: string;
}

export interface WasteTypeApprovedContext {
  waste_type?: string;
  original_name?: string; // only present if MENRO renamed it
}

export interface HealthAlertContext {
  battery_voltage?: number | null;
  signal_strength?: number | null;
  sensor_continuity?: boolean | null;
  health_status?: string | null;
  checked_at?: string | null;
}

export interface ReportReminderContext {
  period_start?: string;
  period_end?: string;
  due_date?: string;
  period_label?: string;
  ready_count?: number;
  unverified_count?: number;
}

export type AlertContext = ClogAlertContext | WaterLevelAlertContext | WasteTypeRejectedContext | WasteTypeApprovedContext | HealthAlertContext | ReportReminderContext | Record<string, never>;

export interface Alert {
  alert_id: number;
  alert_type: AlertType;
  node_id?: number | null;
  node_name: string | null;
  barangay_name: string | null;
  barangay_id?: number | null;
  timestamp: string;
  is_read: boolean;
  alert_context: AlertContext;
}