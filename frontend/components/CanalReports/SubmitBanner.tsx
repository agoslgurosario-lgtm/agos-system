"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronRight, Send } from "lucide-react"
import { fetchWithAuth } from "@/lib/auth"
import type { PeriodInfo } from "@/types/submissions"
import { SubmitPeriodsModal, fmtDay, periodLabel, SUBMIT_STATUS_STYLE } from "./SubmitPeriodsModal"

// re-exported so existing imports from SubmitBanner keep working
export { fmtDay, periodLabel, SUBMIT_STATUS_STYLE }

export default function SubmitBanner({ onSubmitted }: { onSubmitted?: () => void | Promise<void> }) {
  const [periods, setPeriods] = useState<PeriodInfo[] | null>(null)
  const [open, setOpen] = useState(false)

  const loadPeriods = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/canal-reports/periods/`)
      if (!res.ok) throw new Error()
      const d: { periods: PeriodInfo[] } = await res.json()
      setPeriods(d.periods)
    } catch {
      setPeriods(null)
    }
  }, [])

  useEffect(() => { loadPeriods() }, [loadPeriods])

  if (!periods || periods.length === 0) return null

  // periods are newest first; look for the oldest one that is waiting
  const target = [...periods].reverse().find((p) => p.can_submit && p.verified_count > 0) ?? periods[0]
  const s = SUBMIT_STATUS_STYLE[target.status]
  const hasReports = target.verified_count > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-full w-full cursor-pointer flex-col justify-start rounded-xl border border-[#e2e8f0] bg-white p-3.5 text-left shadow-[0_2px_4px_rgba(0,0,0,0.06)] transition-opacity hover:opacity-90"
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Send size={18} color="#16a34a" />
            <p className="text-sm font-bold text-[#122A48]">Submit to MENRO</p>
          </div>
          <span className="rounded-xl px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: s.bg, color: s.text }}>{target.status}</span>
        </div>
        <p className="text-[13px] font-semibold text-[#122A48]">{periodLabel(target)} · due {fmtDay(target.due_date)}</p>
        <p className="mt-0.5 text-xs text-[#64748b]">
          {target.status === "Submitted"
            ? "Submitted. Nothing is waiting."
            : hasReports
              ? `${target.verified_count} verified report${target.verified_count === 1 ? "" : "s"} ready to submit`
              : "No verified reports yet for this period"}
        </p>
        <p className="mt-2.5 flex items-center gap-1 text-xs font-semibold text-[#15803d]">
          {hasReports ? "Review & submit" : "View periods"} <ChevronRight size={16} />
        </p>
      </button>

      <SubmitPeriodsModal
        open={open}
        onClose={() => setOpen(false)}
        periods={periods}
        onSubmitted={async () => { await loadPeriods(); await onSubmitted?.() }}
      />
    </>
  )
}