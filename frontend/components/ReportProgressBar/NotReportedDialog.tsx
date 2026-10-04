"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TriangleAlert, CircleCheck, X } from "lucide-react"
import { formatDate, reportDate } from "@/lib/reportOptions"
import type { CanalMonitoringReport, ReportBarangay } from "@/types/report"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  reports: CanalMonitoringReport[]
  barangays: ReportBarangay[]
  periodLabel: string
}

type Tab = "missing" | "reported"

export default function NotReportedDialog({ open, onOpenChange, reports, barangays, periodLabel }: Props) {
  const [tab, setTab] = useState<Tab>("missing")

  // per barangay: how many reports and when the latest one was submitted
  const summary = new Map<number, { count: number; latest: string }>()
  reports.forEach(r => {
    const when = reportDate(r)
    const current = summary.get(r.barangay)
    summary.set(r.barangay, {
      count: (current?.count ?? 0) + 1,
      latest: current && current.latest > when ? current.latest : when,
    })
  })

  const byName = (a: ReportBarangay, b: ReportBarangay) => a.barangay_name.localeCompare(b.barangay_name)
  const missing = barangays.filter(b => !summary.has(b.barangay_id)).sort(byName)
  const reported = barangays.filter(b => summary.has(b.barangay_id)).sort(byName)
  const list = tab === "missing" ? missing : reported

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "missing", label: "Not yet reported", count: missing.length },
    { key: "reported", label: "Reported", count: reported.length },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="[&>button]:hidden text-[#122A48] w-[460px]">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-[#FFF3E0]">
                <TriangleAlert size={16} color="#E65100" />
              </div>
              <p className="font-bold text-sm">Barangay Reporting — {periodLabel}</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </DialogHeader>

        <DialogTitle className="sr-only">Barangays that have and have not reported</DialogTitle>
        <hr />

        <div className="flex gap-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer ${
                tab === t.key ? "bg-[#122A48] text-white" : "bg-[#F1F5F9] text-[#5A6A7A]"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
          {list.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <CircleCheck size={28} color="#2C7B3C" />
              <p className="text-xs text-[#727272] text-center">
                {tab === "missing"
                  ? "Every barangay has reported in this period."
                  : "No barangay has reported in this period yet."}
              </p>
            </div>
          ) : (
            list.map(b => {
              const info = summary.get(b.barangay_id)
              return (
                <div key={b.barangay_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                  <p className="text-xs font-semibold truncate">{b.barangay_name}</p>
                  {info && (
                    <p className="text-[11px] text-[#727272] shrink-0">
                      {info.count} report{info.count === 1 ? "" : "s"} · Last {formatDate(info.latest)}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}