import type { AlertType } from "@/types/alert";

export const ALERT_META: Record<AlertType, { label: string }> = {
  Water_Level_Rising: { label: "Water Level Rising" },
  Low_Clog_Alert: { label: "Low Clog" },
  Moderate_Clog_Alert: { label: "Moderate Clog" },
  Critical_Clog: { label: "Critical Clog" },
  Node_Offline: { label: "Node Offline" },
  Low_Battery: { label: "Low Battery" },
  Weak_Signal: { label: "Weak Signal" },
  Sensor_Failure: { label: "Sensor Failure" },
  Report_Submitted: { label: "Report Submitted" },
  Waste_Type_Rejected: { label: "Waste Type Rejected" },
  Waste_Type_Approved: { label: "Waste Type Approved" },
};

// full class names written out so Tailwind can see them
export const ALERT_STYLE: Record<AlertType, { badgeBg: string; badgeText: string }> = {
  Water_Level_Rising: { badgeBg: "bg-blue-100", badgeText: "text-blue-700" },
  Low_Clog_Alert: { badgeBg: "bg-yellow-100", badgeText: "text-yellow-700" },
  Moderate_Clog_Alert: { badgeBg: "bg-orange-100", badgeText: "text-orange-700" },
  Critical_Clog: { badgeBg: "bg-red-100", badgeText: "text-red-700" },
  Node_Offline: { badgeBg: "bg-purple-100", badgeText: "text-purple-700" },
  Low_Battery: { badgeBg: "bg-amber-100", badgeText: "text-amber-700" },
  Weak_Signal: { badgeBg: "bg-sky-100", badgeText: "text-sky-700" },
  Sensor_Failure: { badgeBg: "bg-rose-100", badgeText: "text-rose-700" },
  Report_Submitted: { badgeBg: "bg-teal-100", badgeText: "text-teal-700" },
  Waste_Type_Rejected: { badgeBg: "bg-red-100", badgeText: "text-red-700" },
  Waste_Type_Approved: { badgeBg: "bg-green-100", badgeText: "text-green-700" },
};

// every type, used when the "All" chip is selected
export const ALL_ALERT_TYPES = Object.keys(ALERT_META) as AlertType[];
