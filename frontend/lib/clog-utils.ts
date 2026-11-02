import type { EventStatus, Severity } from "@/types/clog-event";

// same palette as STATUS_BADGE on the health page
const GREEN = "bg-[#B2FBC173] text-[#2C7B3C]";
const AMBER = "bg-[#F4E4A7] text-[#B58F00]";
const RED = "bg-[#FFE5E5] text-[#D81010]";

export const SEVERITY_BADGE: Record<Severity, string> = {
  low: GREEN,
  moderate: AMBER,
  critical: RED,
};

export const STATUS_BADGE: Record<EventStatus, { pill: string; dot: string }> = {
  detected: { pill: RED, dot: "bg-[#D81010]" },
  responded: { pill: AMBER, dot: "bg-[#B58F00]" },
  resolved: { pill: GREEN, dot: "bg-[#2C7B3C]" },
  cleared: { pill: GREEN, dot: "bg-[#2C7B3C]" },
};

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "Oct 20, 2026 12:33 PM" */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

/** "2026-11-01" -> "Nov 1, 2026" */
export function formatDateOnly(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}