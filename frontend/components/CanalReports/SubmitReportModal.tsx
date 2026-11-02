"use client"

import type { ReactNode } from "react"
import { FileCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SEVERITY_COLORS, severityLabel } from "@/lib/canalReportOptions"
import type { ReportSeverity } from "@/types/report"

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isSubmitting?: boolean
  summary: {
    location: string
    purok: number | null
    severity: ReportSeverity | null
    dateObserved: Date | null
    responder: string
    wasteCollectedKg: number
    photoCount: number
  }
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[#64748b]">{label}</span>
      <span className="flex-1 truncate text-right">{children}</span>
    </div>
  )
}

export function SubmitReportModal({ open, onClose, onConfirm, isSubmitting = false, summary }: Props) {
  const sev = summary.severity ? SEVERITY_COLORS[summary.severity] : null
  const observed = summary.dateObserved
    ? summary.dateObserved.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—"

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md rounded-3xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#dcfce7]">
            <FileCheck size={26} color="#16a34a" />
          </div>
          <DialogTitle className="text-lg font-extrabold text-[#0f172a]">Confirm Submission</DialogTitle>
          <DialogDescription className="text-xs text-[#64748b]">Review the summary before submitting.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5">
          <Row label="Canal"><span className="text-xs font-bold text-[#0f172a]">{summary.purok ? `Purok ${summary.purok}` : "N/A"}</span></Row>
          <Row label="Barangay"><span className="text-xs font-semibold text-[#334155]">{summary.location || "N/A"}</span></Row>
          <Row label="Severity">
            {sev && summary.severity ? (
              <span className="inline-block rounded-lg px-2 py-0.5 text-[11px] font-bold" style={{ backgroundColor: sev.bg, color: sev.text }}>
                {severityLabel(summary.severity)}
              </span>
            ) : <span className="text-xs text-[#334155]">—</span>}
          </Row>
          <Row label="Observed"><span className="text-xs font-semibold text-[#334155]">{observed}</span></Row>
          <Row label="Responder"><span className="text-xs font-semibold text-[#334155]">{summary.responder || "N/A"}</span></Row>
          <Row label="Waste collected"><span className="text-xs font-bold text-[#16a34a]">{summary.wasteCollectedKg.toFixed(2)} kg</span></Row>
          <Row label="Photos"><span className="text-xs font-semibold text-[#334155]">{summary.photoCount} file(s)</span></Row>
        </div>

        <p className="text-center text-[11px] text-[#94a3b8]">Once submitted, this report goes to MENRO and can no longer be edited.</p>

        <div className="flex gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1 cursor-pointer border-[#cbd5e1] text-[#475569]">Cancel</Button>
          <Button onClick={onConfirm} disabled={isSubmitting} className="flex-1 cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">
            {isSubmitting ? "Submitting..." : "Confirm & Submit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
