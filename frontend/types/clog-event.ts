export type Severity = "critical" | "moderate" | "low";
export type SeverityFilter = "all" | Severity;
export type EventStatus = "detected" | "responded" | "resolved" | "cleared";

export interface ClogEvent {
  id: string;
  barangay: string;
  nodeId: string; // e.g. "SN-1"
  severity: Severity;
  status: EventStatus;
  clogPercent: number;
  detectedAt: string; // ISO string
  waterLevelCm: number;
  waterFlowMs: number;
  estimatedWeightG: number;
  readingId: number;
  classification: string | null;
  respondedAt?: string | null;
  respondedBy?: string | null;
  autoCleared?: boolean;
  clearedAt?: string | null;
}

/** Counts for the date range, ignoring the severity tab. */
export interface ClogSummary {
  total: number;
  detected: number;
  responded: number;
  resolved: number; // resolved + cleared
  critical: number;
  moderate: number;
  low: number;
}