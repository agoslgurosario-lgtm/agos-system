"use client"

import type { CanalMonitoringReport, ReportBarangay } from "@/types/report"

type Props = {
  reports: CanalMonitoringReport[]
  barangays: ReportBarangay[]
  periodLabel: string
}

export default function ReportProgressBar({ reports, barangays, periodLabel }: Props) {
  const reportedIds = new Set(reports.map(r => r.barangay))
  const total = barangays.length
  const reported = barangays.filter(b => reportedIds.has(b.barangay_id)).length
  const notReported = total - reported

  const pct = total > 0 ? (reported / total) * 100 : 0

  const legend = [
    { dot: "bg-[#2C7B3C]", count: reported, label: "Reported", sub: "Submitted at least once" },
    { dot: "bg-[#C6C6C8]", count: notReported, label: "Not yet reported", sub: "No submission this period" },
  ]

  return (
    <div className="bg-[#FAFCFD] border border-[#C2C1C1] rounded-lg p-4 flex flex-col gap-3 h-full">

      {/* Title + share of barangays reported */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-sm text-[#122A48]">
          Barangays Reported <span className="font-normal text-[#5A6A7A]">· {periodLabel}</span>
        </p>
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="text-xl font-bold text-[#122A48] leading-none">{total > 0 ? `${Math.round(pct)}%` : "—"}</span>
          <span className="text-[10px] text-[#5A6A7A]">{reported} of {total}</span>
        </div>
      </div>

      {/* Bar */}
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-[#E5E5E6]">
        {total > 0 && (
          <div className="bg-[#2C7B3C] h-full transition-all duration-500" style={{ width: `${pct}%` }} />
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