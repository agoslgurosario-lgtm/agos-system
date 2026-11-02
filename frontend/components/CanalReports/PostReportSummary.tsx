import { ClipboardClock, Radio } from "lucide-react"
import type { ReactNode } from "react"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import {
  WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS, optionLabel, severityLabel,
} from "@/lib/canalReportOptions"

export type SystemData = {
  available?: boolean
  reading_count?: number
  peak_clog_pct?: number | null
  avg_clog_pct?: number | null
  peak_water_level_cm?: number | null
  peak_water_level_pct?: number | null
  overall_water_level?: string | null
  overall_obstruction_coverage?: string | null
  overall_water_flow_condition?: string | null
}

type Props = {
  barangay: string
  purok: number | null
  detectedAt: Date | null
  severity: string | null
  personnel: string
  respondedAt: Date | null
  action: string
  condition: { waterLevel: string | null; obstruction: string | null; flow: string | null }
  system: SystemData | null
  systemLoading: boolean
  completed: boolean
}

function formatDateTime(d: Date | null) {
  if (!d || isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2.5">
      <p className="mb-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">{label}</p>
      <p className="text-[13px] font-semibold text-[#122A48]">{value || "—"}</p>
    </div>
  )
}

function Title({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="mb-3 mt-1 flex items-center gap-1.5">
      {icon}
      <p className="text-xs font-bold tracking-wide text-[#16a34a]">{text}</p>
    </div>
  )
}

export function PostReportSummary(p: Props) {
  // before completion, show what the sensors will record; afterwards, what was saved
  const fromSensors = !p.completed && p.system?.available
  const water = fromSensors ? p.system!.overall_water_level ?? null : p.condition.waterLevel
  const obstruction = fromSensors ? p.system!.overall_obstruction_coverage ?? null : p.condition.obstruction
  const flow = fromSensors ? p.system!.overall_water_flow_condition ?? null : p.condition.flow

  return (
    <div>
      <Title icon={<ClipboardClock size={16} color="#16a34a" />} text="RESPONSE (FROM THE PRE-REPORT)" />
      <div className="grid grid-cols-2 gap-x-3">
        <Row label="Barangay" value={p.barangay} />
        <Row label="Purok" value={p.purok ? `Purok ${p.purok}` : ""} />
        <Row label="Detected by system" value={formatDateTime(p.detectedAt)} />
        <Row label="Severity" value={severityLabel(p.severity)} />
      </div>
      <Row label="Responded" value={formatDateTime(p.respondedAt)} />
      <Row label="Assigned personnel" value={p.personnel} />
      <Row label="Action" value={p.action} />

      <div className="my-3 h-px bg-[#f1f5f9]" />

      <Title icon={<Radio size={16} color="#16a34a" />} text="CANAL CONDITION (FROM THE SENSORS)" />
      {p.systemLoading ? (
        <SpinnerIcon size={24} color="#16a34a" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-3">
            <Row label="Water level" value={optionLabel(WATER_LEVEL_OPTIONS, water as any)} />
            <Row label="Obstruction" value={optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, obstruction as any)} />
          </div>
          <Row label="Water flow" value={optionLabel(WATER_FLOW_OPTIONS, flow as any)} />

          {p.system?.available ? (
            <p className="mb-1 text-[11px] text-[#64748B]">
              Based on {p.system.reading_count} reading{p.system.reading_count === 1 ? "" : "s"} while the clog was open
              {p.system.peak_clog_pct != null ? ` · peak clog ${Math.round(p.system.peak_clog_pct)}%` : ""}
              {p.system.peak_water_level_pct != null ? ` · peak water level ${Math.round(p.system.peak_water_level_pct)}% of canal depth` : ""}
            </p>
          ) : (
            <p className="mb-1 text-[11px] text-[#dc2626]">No sensor readings were found for this event.</p>
          )}
          <p className="text-[11px] text-[#94a3b8]">
            {p.completed
              ? "Saved from the node's sensors when the post-report was completed."
              : "Taken from the node's sensors. These are recorded when you complete the post-report and can't be edited."}
          </p>
        </>
      )}

      <div className="mb-3 mt-3 h-px bg-[#f1f5f9]" />
    </div>
  )
}
