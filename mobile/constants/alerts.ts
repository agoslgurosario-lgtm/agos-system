import { Ionicons } from "@expo/vector-icons";

import { AlertType, ClogTier, WaterSeverity, WaterLevelAlertContext } from "../types/alert";

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