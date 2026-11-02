"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS, optionLabel } from "@/lib/canalReportOptions"
import type { ReportPurokRow } from "@/types/report"

export function PurokBreakdown({ rows }: { rows: ReportPurokRow[] }) {
  const [open, setOpen] = useState(false)
  if (rows.length === 0) return null

  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex cursor-pointer items-center gap-1 py-1 text-xs font-semibold text-[#475569]">
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />} See per purok
      </button>

      {open && (
        <div className="mt-1 rounded-xl border border-[#e2e8f0] bg-white">
          {rows.map((r, i) => (
            <div key={r.purok} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? "border-t border-[#f1f5f9]" : ""}`}>
              <span className="text-xs font-bold text-[#122A48]">Purok {r.purok}</span>
              {r.included ? (
                <span className="text-xs text-[#334155]">
                  {optionLabel(WATER_LEVEL_OPTIONS, r.overall_water_level)} · {optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, r.overall_obstruction_coverage)} · {optionLabel(WATER_FLOW_OPTIONS, r.overall_water_flow_condition)}
                </span>
              ) : (
                <span className="text-xs italic text-[#94a3b8]">{r.node_count === 0 ? "No sensors" : "No readings this week"}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
