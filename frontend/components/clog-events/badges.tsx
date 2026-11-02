import type { EventStatus, Severity } from "@/types/clog-event"
import { SEVERITY_BADGE, STATUS_BADGE, capitalize } from "@/lib/clog-utils"

const base = "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold"

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`${base} ${SEVERITY_BADGE[severity]}`}>{capitalize(severity)}</span>
}

export function StatusBadge({ status }: { status: EventStatus }) {
  const s = STATUS_BADGE[status]
  return (
    <span className={`${base} gap-1.5 ${s.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {capitalize(status)}
    </span>
  )
}

export function PercentBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex rounded-full bg-[#e8eef1b4] px-3 py-1 text-[11px] font-semibold text-[#727272]">
      {value.toFixed(2)}%
    </span>
  )
}