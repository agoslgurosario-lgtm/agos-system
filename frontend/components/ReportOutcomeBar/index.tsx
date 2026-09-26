"use client"

import { FINAL_CONDITION_STYLE } from "@/lib/reportOptions"
import type { CanalMonitoringReport } from "@/types/report"

type Props = {
  // already filtered to the period being shown
  reports: CanalMonitoringReport[]
  periodLabel: string
}

export default function ReportOutcomeBar({ reports, periodLabel }: Props) {
  const cleared = reports.filter(r => r.final_canal_condition === "Clear").length
  const partial = reports.filter(r => r.final_canal_condition === "Partially_Clear").length
  const obstructed = reports.filter(r => r.final_canal_condition === "Still_Obstructed").length
  const total = cleared + partial + obstructed

  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0)
  const clearedPct = Math.round(pct(cleared))

  const legend = [
    { dot: FINAL_CONDITION_STYLE.Clear.dot, count: cleared, label: "Cleared", sub: "Canal fully cleared" },
    { dot: FINAL_CONDITION_STYLE.Partially_Clear.dot, count: partial, label: "Partially cleared", sub: "Canal partly cleared" },
    { dot: FINAL_CONDITION_STYLE.Still_Obstructed.dot, count: obstructed, label: "Still obstructed", sub: "Needs follow-up" },
  ]

  return (
    <div className="bg-[#FAFCFD] border border-[#C2C1C1] rounded-lg p-4 flex flex-col gap-3 h-full">

      {/* Title + share fully cleared */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-sm text-[#122A48]">{periodLabel} Cleanup Outcomes</p>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-xl font-bold text-[#122A48] leading-none">{total > 0 ? `${clearedPct}%` : "—"}</span>
          <span className="text-[10px] text-[#5A6A7A]">Fully cleared</span>
        </div>
      </div>

      {/* Bar (grey when there are no reports) */}
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-[#E5E5E6]">
        {total > 0 && (
          <>
            <div className={`${FINAL_CONDITION_STYLE.Clear.dot} h-full transition-all duration-500`} style={{ width: `${pct(cleared)}%` }} />
            <div className={`${FINAL_CONDITION_STYLE.Partially_Clear.dot} h-full transition-all duration-500`} style={{ width: `${pct(partial)}%` }} />
            <div className={`${FINAL_CONDITION_STYLE.Still_Obstructed.dot} h-full transition-all duration-500`} style={{ width: `${pct(obstructed)}%` }} />
          </>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center">
        {legend.map((item, i) => (
          <div key={item.label} className="flex items-center flex-1">
            {i > 0 && <div className="w-px h-8 bg-[#C6C6C8] shrink-0 mr-4" />}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.dot}`} />
              <div className="flex flex-col">
                <span className="font-bold text-xs text-[#122A48]">{item.count}&nbsp;{item.label}</span>
                <span className="text-[11px] text-[#5A6A7A]">{item.sub}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}