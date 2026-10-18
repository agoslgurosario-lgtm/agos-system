export type AlertType =
  | "Water_Level_Rising"
  | "Low_Clog_Alert"
  | "Moderate_Clog_Alert"
  | "Critical_Clog"
  | "Waste_Type_Rejected";

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

export interface WaterLevelAlertContext {
  water_level?: number;
  water_flow?: string;
  water_flow_rate?: number | null;
}

export interface WasteTypeRejectedContext {
  waste_type?: string;
  reason?: string;
}

export type AlertContext = ClogAlertContext | WaterLevelAlertContext | WasteTypeRejectedContext | Record<string, never>;

export interface Alert {
  alert_id: number;
  alert_type: AlertType;
  node_name: string | null;
  barangay_name: string | null;
  barangay_id?: number | null;
  timestamp: string;
  is_read: boolean;
  alert_context: AlertContext;
}