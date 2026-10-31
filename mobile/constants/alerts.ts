import { Ionicons } from "@expo/vector-icons";

import { AlertType, ClogTier, WaterSeverity, WaterLevelAlertContext, ReportReminderContext } from "../types/alert";

export const ALERT_META: Record<AlertType, { label: string; icon: keyof typeof Ionicons.glyphMap; tier: ClogTier | null }> = {
  Water_Level_Rising: {
    label: "Water Level Rising",
    icon: "water-outline",
    tier: null,
  },
  Low_Clog_Alert: {
    label: "Low Clog Detected",
    icon: "warning-outline",
    tier: "Low",
  },
  Moderate_Clog_Alert: {
    label: "Moderate Clog Detected",
    icon: "warning-outline",
    tier: "Moderate",
  },
  Critical_Clog: {
    label: "Critical Clog Detected",
    icon: "warning-outline",
    tier: "Critical",
  },
  Waste_Type_Rejected: {
    label: "Waste Type Not Approved",
    icon: "close-circle-outline",
    tier: null,
  },
  Waste_Type_Approved: {
    label: "Waste Type Approved",
    icon: "checkmark-circle-outline",
    tier: null,
  },
  Node_Offline:   { label: "Node Offline",   icon: "cloud-offline-outline",    tier: null },
  Low_Battery:    { label: "Low Battery",    icon: "battery-dead-outline",     tier: null },
  Weak_Signal:    { label: "Weak Signal",    icon: "cellular-outline",         tier: null },
  Sensor_Failure: { label: "Sensor Failure", icon: "alert-circle-outline",     tier: null },
  Report_Due_Soon: { label: "Report Due Soon", icon: "calendar-outline", tier: null },
  Report_Overdue:  { label: "Report Overdue",  icon: "alarm-outline",    tier: null },
};

export const ALERT_STYLE: Record<AlertType, { indicator: string; badgeBg: string; badgeText: string}> ={
  Water_Level_Rising: {
    indicator: "#1565BC",
    badgeBg: "bg-[#D6E8FF]",
    badgeText: "text-[#1565BC]",
  },
  Low_Clog_Alert: {
    indicator: "#D2A000",
    badgeBg: "bg-[#FFF9DC]",
    badgeText: "text-[#D2A000]",
  },
  Moderate_Clog_Alert: {
    indicator: "#E65100",
    badgeBg: "bg-[#FFF0D6]",
    badgeText: "text-[#E65100]",
  },
  Critical_Clog: {
    indicator: "#D81010",
    badgeBg: "bg-[#FFE5E5]",
    badgeText: "text-[#D81010]",
  },
  Waste_Type_Rejected: {
    indicator: "#7C3AED",
    badgeBg: "bg-[#EDE4FC]",
    badgeText: "text-[#7C3AED]",
  },
  Waste_Type_Approved: {
    indicator: "#16A34A",
    badgeBg: "bg-[#DCFCE7]",
    badgeText: "text-[#16A34A]",
  },
  Node_Offline:   { indicator: "#582579", badgeBg: "bg-[#F0E6F7]", badgeText: "text-[#582579]" },
  Low_Battery:    { indicator: "#582579", badgeBg: "bg-[#F0E6F7]", badgeText: "text-[#582579]" },
  Weak_Signal:    { indicator: "#582579", badgeBg: "bg-[#F0E6F7]", badgeText: "text-[#582579]" },
  Sensor_Failure: { indicator: "#582579", badgeBg: "bg-[#F0E6F7]", badgeText: "text-[#582579]" },
  Report_Due_Soon: { indicator: "#0E7490", badgeBg: "bg-[#CFFAFE]", badgeText: "text-[#0E7490]" },
  Report_Overdue:  { indicator: "#E65100", badgeBg: "bg-[#FFF0D6]", badgeText: "text-[#E65100]" },
};

export const WATER_SEVERITY_STYLE: Record<WaterSeverity, { badgeBg: string; badgeText: string; color: string }> = {
  Warning:  { badgeBg: "bg-[#FFF0D6]", badgeText: "text-[#E65100]", color: "#E65100" },
  Critical: { badgeBg: "bg-[#FFE5E5]", badgeText: "text-[#D81010]", color: "#D81010" },
};

// Older alerts have no saved severity, so work it out from the water level %
export function getWaterSeverity(ctx: WaterLevelAlertContext): WaterSeverity {
  if (ctx.severity === "Warning" || ctx.severity === "Critical") return ctx.severity;
  if (ctx.water_level_pct != null && ctx.critical_pct != null && ctx.water_level_pct >= ctx.critical_pct) {
    return "Critical";
  }
  return "Warning";
}

// the types the Alerts screen requests and the bell counts (keep in one place)
export const APP_ALERT_TYPES: AlertType[] = [
  "Water_Level_Rising",
  "Low_Clog_Alert",
  "Moderate_Clog_Alert",
  "Critical_Clog",
  "Waste_Type_Rejected",
  "Waste_Type_Approved",
  "Node_Offline",
  "Low_Battery",
  "Weak_Signal",
  "Sensor_Failure",
  "Report_Due_Soon",
  "Report_Overdue",
];

export const HEALTH_ALERT_TYPES: AlertType[] = ["Node_Offline", "Low_Battery", "Weak_Signal", "Sensor_Failure"];

export function batteryLevel(v: number) {
  if (v >= 4.1) return `Full (${v}V)`;
  if (v >= 3.9) return `Good (${v}V)`;
  if (v >= 3.7) return `Moderate (${v}V)`;
  if (v >= 3.5) return `Low (${v}V)`;
  return `Critical (${v}V)`;
}

export function signalLevel(dbm: number) {
  if (dbm >= -65) return `Excellent (${dbm} dBm)`;
  if (dbm >= -75) return `Good (${dbm} dBm)`;
  if (dbm >= -85) return `Fair (${dbm} dBm)`;
  if (dbm >= -95) return `Weak (${dbm} dBm)`;
  return `No Signal (${dbm} dBm)`;
}

export const REPORT_ALERT_TYPES: AlertType[] = ["Report_Due_Soon", "Report_Overdue"];

export function fmtDueDay(iso?: string) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

// same wording as the push notification
export function reminderText(type: AlertType, ctx: ReportReminderContext) {
  const due = fmtDueDay(ctx.due_date);
  const when = type === "Report_Due_Soon" ? `is due on ${due}` : `was due on ${due}`;
  const todo = ctx.ready_count
    ? type === "Report_Due_Soon" ? "Submit it to MENRO now." : "You can still submit it late."
    : "You have no verified reports yet. Complete and verify your reports, then submit.";
  return `Your report for ${ctx.period_label ?? "this period"} ${when}. ${todo}`;
}