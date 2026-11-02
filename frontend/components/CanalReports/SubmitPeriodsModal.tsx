"use client"

import { useState } from "react"
import { AlertCircle, Info, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmModal } from "@/components/CanalReports/ConfirmModal"
import { NoticeModal } from "@/components/CanalReports/NoticeModal"
import { fetchWithAuth } from "@/lib/auth"
import { formatDate, formatDuration, reportSeverityLabel } from "@/lib/reportOptions"
import type { PeriodInfo, SubmissionPreview } from "@/types/submissions"

export const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

export const periodLabel = (p: Pick<PeriodInfo, "period_start" | "period_end">) =>
  `${fmtDay(p.period_start)} - ${new Date(p.period_end + "T00:00:00").getDate()}`

export const SUBMIT_STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Open: { bg: "#e0f2fe", text: "#0369a1" },
  Overdue: { bg: "#ffedd5", text: "#c2410c" },
  Missed: { bg: "#f1f5f9", text: "#64748b" },
  Submitted: { bg: "#dcfce7", text: "#166534" },
}

const API = process.env.NEXT_PUBLIC_API_URL
const SIGNATORY_ORDER = ["Punong Barangay", "Brgy. Sanitary Inspector", "Chairman Environment", "Barangay Secretary"]
const reportsText = (n: number) => `${n} verified report${n === 1 ? "" : "s"}`

function periodNote(p: PeriodInfo) {
  switch (p.status) {
    case "Open":
      return `${reportsText(p.verified_count)} ready`
    case "Overdue":
      return `${reportsText(p.verified_count)} ready${p.late_until ? ` · late submissions allowed until ${fmtDay(p.late_until)}` : ""}`
    case "Missed":
      return "Closed. Its verified reports go into your next submission."
    case "Submitted":
      return "Submitted. Nothing is waiting."
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-[#64748b]">{label}</p>
      <p className="text-base font-extrabold text-[#122A48]">{value}</p>
    </div>
  )
}

type Props = {
  open: boolean
  onClose: () => void
  periods: PeriodInfo[]
  onSubmitted?: () => void | Promise<void>
}

export function SubmitPeriodsModal({ open, onClose, periods, onSubmitted }: Props) {
  const [selected, setSelected] = useState<PeriodInfo | null>(null)
  const [preview, setPreview] = useState<SubmissionPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [doneNotice, setDoneNotice] = useState(false)

  const resetReview = () => {
    setSelected(null); setPreview(null); setPreviewError(null); setError(null); setConfirmOpen(false)
  }

  const close = () => {
    if (submitting) return
    resetReview()
    onClose()
  }

  // the backend builds the review: what would be sent, what blocks it, who signs
  const openReview = async (p: PeriodInfo) => {
    setSelected(p); setPreview(null); setPreviewError(null); setError(null)
    setLoadingPreview(true)
    try {
      const res = await fetchWithAuth(`${API}/api/canal-reports/submission-preview/?period=${p.period_start}`)
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.detail || "")
      setPreview(data)
    } catch (e: any) {
      setPreviewError(e?.message || "Couldn't load the review. Please try again.")
    } finally { setLoadingPreview(false) }
  }

  const submit = async () => {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetchWithAuth(`${API}/api/canal-reports/submissions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_start: selected.period_start }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setConfirmOpen(false)
        setError(data?.detail || "Failed to submit. Please try again.")
        return
      }
      setConfirmOpen(false)
      setDoneNotice(true)
    } catch {
      setConfirmOpen(false)
      setError("Failed to submit. Please try again.")
    } finally { setSubmitting(false) }
  }

  const finishAfterSubmit = async () => {
    setDoneNotice(false)
    await onSubmitted?.()
    resetReview()
    onClose()
  }

  const style = selected ? SUBMIT_STATUS_STYLE[preview?.status ?? selected.status] : null
  const severityText = preview
    ? Object.entries(preview.totals.severity_counts).map(([k, n]) => `${reportSeverityLabel(k)} ${n}`).join(", ") || "—"
    : "—"

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-lg rounded-2xl p-5">
          {!selected ? (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#122A48]">
                  <Send size={18} color="#16a34a" />
                  Submit to MENRO
                </DialogTitle>
                <DialogDescription className="text-xs text-[#64748b]">
                  Reports are submitted once per half-month. Only verified reports are included. A missed deadline can still be submitted late until the next deadline passes.
                </DialogDescription>
              </DialogHeader>

              <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
                {periods.map((p) => {
                  const s = SUBMIT_STATUS_STYLE[p.status]
                  return (
                    <div key={p.period_start} className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#122A48]">{periodLabel(p)}</p>
                        <span className="rounded-xl px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: s.bg, color: s.text }}>
                          {p.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#64748b]">Due {fmtDay(p.due_date)}</p>
                      <p className="mt-0.5 text-xs text-[#64748b]">{periodNote(p)}</p>

                      {p.can_submit && (
                        <Button
                          onClick={() => openReview(p)}
                          className="mt-3 w-full cursor-pointer bg-[#16a34a] text-xs font-bold text-white hover:bg-[#15803d]"
                        >
                          Review & submit
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="text-left">
                <DialogTitle className="text-base font-bold text-[#122A48]">{periodLabel(selected)}</DialogTitle>
                <DialogDescription className="sr-only">Review this submission before sending it to MENRO.</DialogDescription>
              </DialogHeader>

              <div className="flex max-h-[65vh] flex-col gap-3 overflow-y-auto pr-1">
                {loadingPreview && <p className="py-8 text-center text-sm text-[#64748b]">Loading the review...</p>}

                {previewError && (
                  <div className="flex items-start gap-2 rounded-xl bg-[#FEE2E2] p-3 text-[13px] text-[#B91C1C]">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" /> <p>{previewError}</p>
                  </div>
                )}

                {preview && style && (
                  <>
                    {/* period card */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-[#122A48]">{periodLabel(preview)}</p>
                        <div className="flex gap-1.5">
                          <span className="rounded-xl px-2.5 py-1 text-[11px] font-semibold" style={{ backgroundColor: style.bg, color: style.text }}>
                            {preview.status}
                          </span>
                          {preview.would_be_late && (
                            <span className="rounded-xl bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-semibold text-[#B45309]">Late</span>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-[#64748b]">Due {fmtDay(preview.due_date)}</p>
                      {preview.would_be_late && (
                        <p className="mt-1 text-xs font-semibold text-[#C2410C]">
                          Submitting today is {preview.days_late} day{preview.days_late === 1 ? "" : "s"} late. Allowed until {fmtDay(preview.grace_end)}.
                        </p>
                      )}
                    </div>

                    {/* blockers and warnings */}
                    {preview.blockers.map(b => (
                      <div key={b} className="flex items-start gap-2 rounded-xl bg-[#FEE2E2] p-3 text-[13px] text-[#B91C1C]">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" /> <p>{b}</p>
                      </div>
                    ))}
                    {preview.warnings.map(w => (
                      <div key={w} className="flex items-start gap-2 rounded-xl bg-[#FEF3C7] p-3 text-[13px] text-[#B45309]">
                        <Info size={18} className="mt-0.5 shrink-0" /> <p>{w}</p>
                      </div>
                    ))}

                    {/* summary */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
                      <p className="mb-2 text-xs font-bold uppercase text-[#16a34a]">Summary</p>
                      <div className="grid grid-cols-2 gap-3">
                        <Stat label="Reports" value={String(preview.totals.report_count)} />
                        <Stat label="Waste collected" value={`${preview.totals.total_waste_kg} kg`} />
                        <Stat label="Avg. response time" value={formatDuration(preview.totals.avg_response_minutes)} />
                        <Stat label="Severity" value={severityText} />
                      </div>
                      {preview.unverified_count > 0 && (
                        <p className="mt-3 text-xs text-[#B45309]">
                          {preview.unverified_count} report{preview.unverified_count === 1 ? " is" : "s are"} not verified yet and won&apos;t be included.
                        </p>
                      )}
                    </div>

                    {/* reports included */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
                      <p className="mb-2 text-xs font-bold uppercase text-[#16a34a]">Reports included ({preview.reports.length})</p>
                      {preview.reports.length === 0 ? (
                        <p className="text-sm text-[#64748b]">No verified reports for this period.</p>
                      ) : (
                        <ul className="divide-y divide-[#f1f5f9]">
                          {preview.reports.map(r => (
                            <li key={r.report_id} className="flex items-center justify-between gap-3 py-2 text-xs">
                              <div>
                                <p className="font-semibold text-[#122A48]">Report #{r.report_id} · {r.purok_label || "—"}</p>
                                <p className="text-[#64748b]">
                                  {r.date_responded ? formatDate(r.date_responded) : "—"}
                                  {r.carried_over && <span className="ml-2 rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[10px] font-semibold text-[#475569]">Carried over</span>}
                                </p>
                              </div>
                              <span className="font-semibold text-[#122A48]">
                                {r.waste_collected_amount != null ? `${r.waste_collected_amount} ${r.waste_collected_unit}` : "—"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* signatories */}
                    <div className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
                      <p className="mb-2 text-xs font-bold uppercase text-[#16a34a]">Signatories</p>
                      <ul className="space-y-1.5 text-sm">
                        {SIGNATORY_ORDER.map(pos => (
                          <li key={pos} className="flex justify-between gap-3">
                            <span className="text-[#64748b]">{pos}</span>
                            <span className="font-semibold text-[#122A48]">{preview.signatories[pos] || "—"}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {error && <p className="text-center text-xs text-[#D81010]">{error}</p>}
              </div>

              <div className="flex gap-2.5">
                <Button variant="outline" onClick={resetReview} disabled={submitting} className="flex-1 cursor-pointer border-[#cbd5e1] text-[#475569]">
                  Back
                </Button>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  disabled={!preview || !preview.can_submit || submitting}
                  className="flex-1 cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d] disabled:opacity-50"
                >
                  <Send size={16} className="mr-1" /> Submit to MENRO
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={confirmOpen}
        title="Submit to MENRO?"
        message={`Send ${reportsText(preview?.totals.report_count ?? 0)} for ${selected ? periodLabel(selected) : ""} to MENRO. Once submitted, the reports are locked and can't be edited.`}
        icon={<Send size={24} color="#16a34a" />}
        confirmLabel="Submit"
        loading={submitting}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
      <NoticeModal
        open={doneNotice}
        title="Submitted"
        message="Your report was sent to MENRO. The included reports are now locked."
        icon={<Send size={24} color="#16a34a" />}
        iconBg="#dcfce7"
        buttonLabel="OK"
        onClose={finishAfterSubmit}
      />
    </>
  )
}