"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TriangleAlert, CircleCheck, X, Eye } from "lucide-react"
import StyledBadge from "@/components/StyledBadge"
import { FINAL_CONDITION_LABEL, FINAL_CONDITION_STYLE, formatDate } from "@/lib/reportOptions"
import type { CanalMonitoringReport } from "@/types/report"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  // reports for the period being shown; the dialog picks out the unresolved ones itself
  reports: CanalMonitoringReport[]
  periodLabel: string
  onView: (report: CanalMonitoringReport) => void
}

const when = (r: CanalMonitoringReport) => new Date(r.date_observed ?? r.created_at).getTime()

export default function FollowUpDialog({ open, onOpenChange, reports, periodLabel, onView }: Props) {
  // still obstructed first, then partially cleared; newest first within each
  const unresolved = reports
    .filter(r => r.final_canal_condition === "Still_Obstructed" || r.final_canal_condition === "Partially_Clear")
    .sort((a, b) => {
      const rank = (r: CanalMonitoringReport) => (r.final_canal_condition === "Still_Obstructed" ? 0 : 1)
      return rank(a) - rank(b) || when(b) - when(a)
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:hidden text-[#122A48] w-[460px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#FFF3E0]">
                <TriangleAlert size={16} color="#E65100" />
              </div>
              <p className="font-bold text-sm">
                Needs Follow-up — {periodLabel} ({unresolved.length})
              </p>
            </div>
            <button onClick={() => onOpenChange(false)} className="cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </DialogHeader>

        <DialogTitle className="sr-only">Reports needing follow-up</DialogTitle>
        <hr />

        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {unresolved.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <CircleCheck size={28} color="#2C7B3C" />
              <p className="text-xs text-[#727272] text-center">Every canal reported in this period was fully cleared.</p>
            </div>
          ) : (
            unresolved.map(r => (
              <div key={r.report_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{r.canal_name || "Untitled canal"}</p>
                  <p className="text-[11px] text-[#727272] truncate">
                    {r.barangay_details?.barangay_name} · {formatDate(r.date_observed)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.final_canal_condition && (
                    <StyledBadge
                      text={FINAL_CONDITION_LABEL[r.final_canal_condition]}
                      style={FINAL_CONDITION_STYLE[r.final_canal_condition]}
                    />
                  )}
                  <Button
                    onClick={() => onView(r)}
                    className="h-7 px-2 text-xs border border-[#1565BC80] bg-[#CDE3DE45] hover:bg-[#b8d5cf45] text-[#122A48] cursor-pointer"
                  >
                    <Eye size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}