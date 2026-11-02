"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import RosLogo from "@/public/ROS-logo.jpg"

// icons
import { ArrowLeft, FileText, Image as ImageIcon, FileDown, Expand, ShieldCheck, Pencil, FileX } from "lucide-react"

// shadcn
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// components
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { Toast } from "@/components/Toast"
import { useToast } from "@/components/hooks/useToast"
import StyledBadge from "../StyledBadge"
import { PrintCanalReport, SIGNATORY_POSITIONS } from "@/components/PrintReport/PrintCanalReport"
import { ConfirmModal } from "@/components/CanalReports/ConfirmModal"
import { NoticeModal } from "@/components/CanalReports/NoticeModal"
import { VoidReportModal } from "@/components/CanalReports/VoidReportModal"
import { IncompleteReportModal } from "@/components/CanalReports/IncompleteReportModal"
import { ROUTES } from "@/lib/canalReportRoutes"

// lib
import { fetchWithAuth, setSuppressInactiveRedirect } from "@/lib/auth"
import {
  SEVERITY_STYLE, SEVERITY_LABEL,
  WATER_LEVEL_LABEL, OBSTRUCTION_LABEL, WATER_FLOW_LABEL,
  WASTE_CATEGORIES, formatDateTime, filedByName, reportDate,
  isCleanupReport, cleanupCoverage, purokRowNote,
} from "@/lib/reportOptions"
import type { CanalMonitoringReport, ReportMedia, ReportPurokRow, ReportNodeSummary } from "@/types/report"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"
import { openPdf } from "@/lib/openPdf"
import { isIOSDevice } from "@/lib/device"


type Props = {
  id: string | null
  backHref: string
}

// names for the `missing` list the backend sends back from /verify/
const MISSING_LABELS: Record<string, string> = {
  assigned_personnel: "Assigned personnel",
  date_responded: "Date / time of the cleanup",
  action_taken: "Action taken",
  waste_collected_amount: "Waste collected",
  before_photos: "Before Cleanup photo",
  after_photos: "After Cleanup photo",
}
const missingLabel = (k: string) =>
  MISSING_LABELS[k] ?? k.replace(/_/g, " ").replace(/^./, c => c.toUpperCase())

const PHOTO_GROUPS: { category: ReportMedia["media_category"]; label: string }[] = [
  { category: "Before_Clearing", label: "Before Cleanup" },
  { category: "After_Clearing", label: "After Cleanup" },
  { category: "Additional_Evidence", label: "Additional Evidence" },
]

function LogoPlaceholder() {
  return (
    <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FAFCFD]">
      <Image
        src={RosLogo}
        alt="AGOS Logo"
        width={90}
        height={90}
        className="rounded-full flex-shrink-0 bg-[#CDE3DE]"
      />
    </div>
  )
}

function SectionBar({ title }: { title: string }) {
  return (
    <p className="bg-[#122A48] text-white text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded mt-5 mb-3">
      {title}
    </p>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-bold uppercase text-[#727272]">{label}</span>
      <div className="text-sm font-semibold text-[#122A48] border-b border-[#122A48]/60 pb-1 break-words">
        {children || "—"}
      </div>
    </div>
  )
}

function TextBox({ label, text }: { label: string; text: string | null }) {
  return (
    <div className="mt-3">
      <span className="text-[10px] font-bold uppercase text-[#727272]">{label}</span>
      <div className="mt-1 border border-[#122A48]/60 rounded p-3 min-h-16 text-sm text-[#122A48] whitespace-pre-wrap break-words">
        {text || "—"}
      </div>
    </div>
  )
}

function PurokBreakdownTable({ rows }: { rows: ReportPurokRow[] }) {
  if (rows.length === 0) return null
  return (
    <div className="mt-4">
      <p className="text-[10px] font-bold uppercase text-[#727272] mb-1">Per purok</p>
      <table className="w-full text-sm text-[#122A48] border border-[#122A48]/30">
        <thead>
          <tr className="bg-[#F1F5F9] text-[11px] uppercase text-[#727272]">
            <th className="text-left px-2 py-1.5">Purok</th>
            <th className="text-left px-2 py-1.5">Water level</th>
            <th className="text-left px-2 py-1.5">Obstruction</th>
            <th className="text-left px-2 py-1.5">Water flow</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.purok} className="border-t border-[#DDDDDD]">
              <td className="px-2 py-1.5 font-semibold">Purok {r.purok}</td>
              {r.included ? (
                <>
                  <td className="px-2 py-1.5">{r.overall_water_level ? WATER_LEVEL_LABEL[r.overall_water_level] : "—"}</td>
                  <td className="px-2 py-1.5">{r.overall_obstruction_coverage ? OBSTRUCTION_LABEL[r.overall_obstruction_coverage] : "—"}</td>
                  <td className="px-2 py-1.5">{r.overall_water_flow_condition ? WATER_FLOW_LABEL[r.overall_water_flow_condition] : "—"}</td>
                </>
              ) : (
                <td colSpan={3} className="px-2 py-1.5 italic text-[#727272]">{purokRowNote(r)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SensorDataSection({ summaries }: { summaries: ReportNodeSummary[] }) {
  if (summaries.length === 0) return null
  const num = (v: number | null, unit: string) => (v == null ? "—" : `${Math.round(v * 10) / 10}${unit}`)
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

  return (
    <>
      <SectionBar title="Sensor Data" />
      <p className="text-xs text-[#727272] mb-2">What the sensors recorded for this report.</p>
      <div className="flex flex-col gap-3">
        {summaries.map(s => (
          <div key={s.summary_id} className="border border-[#122A48]/30 rounded p-3 bg-[#F8F9FA]">
            <p className="font-bold text-sm text-[#122A48]">{s.node_name}</p>
            <p className="text-xs text-[#727272] mb-3">
              {s.hotspot_name}{s.purok ? ` · Purok ${s.purok}` : ""}
            </p>
            <div className="grid grid-cols-3 gap-x-8 gap-y-3">
              <Field label="Readings">{String(s.reading_count)}</Field>
              <Field label="Peak clog">{num(s.peak_clog_pct, "%")}</Field>
              <Field label="Average clog">{num(s.avg_clog_pct, "%")}</Field>
              <Field label="Peak water level">
                {s.peak_water_level_pct != null ? `${num(s.peak_water_level_pct, "%")} of depth` : num(s.peak_water_level_cm, " cm")}
              </Field>
              <Field label="Worst water status">{s.worst_water_status}</Field>
              <Field label="Worst flow">
                {s.worst_flow}{s.min_flow_rate != null ? ` (${num(s.min_flow_rate, " m/s")})` : ""}
              </Field>
            </div>
            <p className="text-[11px] text-[#727272] mt-2">{when(s.window_start)} to {when(s.window_end)}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function ReportDocument({ report, signatoryNames }: { report: CanalMonitoringReport; signatoryNames: Record<string, string> }) {
  const barangayName = report.barangay_details?.barangay_name ?? "—"
  const cleanup = isCleanupReport(report)

  const nodeSummaries = report.node_summaries ?? []
  const peakWaterPct = nodeSummaries.reduce<number | null>(
    (max, s) => (s.peak_water_level_pct == null ? max : Math.max(max ?? 0, s.peak_water_level_pct)),
    null
  )
  const peakClogPct = nodeSummaries.reduce<number | null>(
    (max, s) => (s.peak_clog_pct == null ? max : Math.max(max ?? 0, s.peak_clog_pct)),
    null
  )
  const { counted, total } = cleanupCoverage(report)

  const hasOldOther = Number(report.waste_other_kg ?? 0) > 0 || !!report.waste_other_label

  const wasteRows = [
    ...WASTE_CATEGORIES.map(c => ({ key: c.key as string, label: c.label, kg: Number(report[c.key] ?? 0) })),
    ...(report.custom_waste ?? []).map(w => ({
      key: `custom-${w.item_id}`,
      label: w.waste_type_name,
      kg: Number(w.weight_kg),
    })),
    ...(hasOldOther
      ? [{
          key: "old-other",
          label: report.waste_other_label ? `Other (${report.waste_other_label})` : "Other",
          kg: Number(report.waste_other_kg ?? 0),
        }]
      : []),
  ]

  return (
    <div className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg p-5">
      {/* Header block */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <LogoPlaceholder />
        <div className="text-center">
          <p className="text-sm text-[#122A48]">Republic of the Philippines</p>
          <p className="text-sm text-[#122A48]">Province of La Union</p>
          <p className="text-sm text-[#122A48]">Municipality Of Rosario</p>
          <p className="text-sm font-bold text-[#122A48]">Barangay {barangayName}</p>
        </div>
      </div>

      <div className="border-t-2 border-[#122A48] w-full my-3" />

      <div className="text-center mb-2">
        <p className="font-bold text-[#122A48] text-base">Municipal Environmental and Natural Resources Office</p>
        <p className="text-[#122A48] text-sm mt-1">Canal Monitoring Report</p>
        <p className="text-[#727272] text-xs mt-1">
          Report No. {report.report_id} &nbsp;|&nbsp; Created by <span className="font-semibold">{filedByName(report)}</span>
        </p>
      </div>

      {/* Monitoring site */}
      <SectionBar title="Monitoring Site Information" />
        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          <Field label={cleanup ? "Coverage" : "Purok"}>{cleanup ? "Whole barangay" : report.purok}</Field>
          <Field label="Barangay">{barangayName}</Field>
          <Field label="City / Municipality">Rosario</Field>
          <Field label="Province">La Union</Field>
        </div>

      {/* Detection summary */}
      <SectionBar title={cleanup ? "Cleanup Details" : "Detection Summary"} />
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <Field label={cleanup ? "Date / Time of Cleanup" : "Date / Time Observed"}>{formatDateTime(report.date_observed)}</Field>
        {!cleanup && (
          <Field label="Severity">
            {report.severity && <StyledBadge text={SEVERITY_LABEL[report.severity]} style={SEVERITY_STYLE[report.severity]} />}
          </Field>
        )}
        <Field label="Date / Time Submitted">
          {formatDateTime(reportDate(report))}
          {report.submission_info && (
            <span className="font-normal text-[#727272]"> · Period {report.submission_info.label}</span>
          )}
        </Field>
      </div>

      {/* Canal condition */}
      <SectionBar
        title={
          cleanup
            ? "Overall Canal Condition (Whole Barangay)"
            : report.purok ? `Overall Canal Condition (Purok ${report.purok})` : "Overall Canal Condition"
        }
      />
      <div className="grid grid-cols-3 gap-x-8 gap-y-3">
        <Field label="Overall Water Level">
          {report.overall_water_level && WATER_LEVEL_LABEL[report.overall_water_level]}
          {peakWaterPct != null && (
            <span className="font-normal text-[#727272]"> · peak {Math.round(peakWaterPct)}% of depth</span>
          )}
        </Field>
        <Field label="Overall Water Flow Condition">{report.overall_water_flow_condition && WATER_FLOW_LABEL[report.overall_water_flow_condition]}</Field>
        <Field label="Overall Obstruction Coverage">
          {report.overall_obstruction_coverage && OBSTRUCTION_LABEL[report.overall_obstruction_coverage]}
          {peakClogPct != null && (
            <span className="font-normal text-[#727272]"> · peak clog {Math.round(peakClogPct)}%</span>
          )}
        </Field>
      </div>

      <p className="text-xs text-[#727272] mt-2">
        How to read this: water level is how high the water is compared with the canal depth.
        Obstruction is how much of the canal is blocked. High water together with high
        obstruction usually means a blockage is backing the water up.
      </p>

      {cleanup && (
        <>
          <p className="text-xs text-[#727272] mt-2">
            {report.condition_source === "Manual"
              ? "Entered by the barangay, not taken from sensors."
              : `Based on ${counted} of ${total} puroks with sensor data.`}
          </p>
          <PurokBreakdownTable rows={report.purok_rows ?? []} />
        </>
      )}

      {!cleanup && <SensorDataSection summaries={report.node_summaries ?? []} />}

      {/* Waste composition */}
      <SectionBar title="Waste Composition (kg)" />
      <div className="grid grid-cols-2 gap-x-10">
        {wasteRows.map(row => (
          <div key={row.key} className="flex items-center justify-between border-b border-[#DDDDDD] py-1.5 text-sm text-[#122A48]">
            <span>{row.label}</span>
            <span
              className={`min-w-20 text-center border border-[#122A48]/70 bg-[#F8F9FA] px-2 py-0.5 text-xs ${
                row.kg === 0 ? "text-[#727272]" : "font-bold"
              }`}
            >
              {row.kg.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Barangay response */}
      <SectionBar title="Barangay Response" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <Field label="Assigned Personnel">{report.assigned_personnel}</Field>
        {!cleanup && <Field label="Date / Time Responded">{formatDateTime(report.date_responded)}</Field>}
        <Field label="Waste Collected">
          {report.waste_collected_amount != null ? `${Number(report.waste_collected_amount).toFixed(2)} kg` : ""}
        </Field>
      </div>
      <TextBox label="Action Taken" text={report.action_taken} />
      <TextBox label="Remarks" text={report.remarks} />

      {/* Signatories */}
      <div className="grid grid-cols-2 gap-x-10 gap-y-10 mt-10">
        {SIGNATORY_POSITIONS.map(pos => {
          const name = signatoryNames[pos]
          return (
            <div key={pos} className="text-center">
              <div className="h-10" />
              <div className={`border-t border-[#122A48] pt-1 text-sm ${name ? "font-semibold text-[#122A48]" : "italic text-[#727272]"}`}>
                {name || "Name of Signatory"}
              </div>
              <div className="text-xs text-[#727272]">{pos}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PhotosPanel({ media, onOpen }: { media: ReportMedia[]; onOpen: (url: string) => void }) {
  return (
    <div className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg p-4 flex flex-col gap-6">
      {PHOTO_GROUPS.map(group => {
        const photos = media.filter(m => m.media_category === group.category && m.file_url)
        return (
          <div key={group.category}>
            <p className="font-bold text-[#122A48] text-sm mb-2">{group.label}</p>
            {photos.length === 0 ? (
              <p className="text-[#727272] text-xs">No photos attached.</p>
            ) : (
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map(m => (
                  <button
                    key={m.media}
                    type="button"
                    onClick={() => onOpen(m.file_url!)}
                    className="group relative cursor-zoom-in rounded-lg overflow-hidden"
                  >
                    <img
                      src={m.file_url!}
                      alt={group.label}
                      className="w-full h-40 object-cover rounded-lg border border-[#C6C6C8]"
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors" />

                    {/* Expand indicator, same as the user manual screenshots */}
                    <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-black/60 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Expand size={14} />
                      Click to expand
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function CanalReportDetail({ id, backHref }: Props) {
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [report, setReport] = useState<CanalMonitoringReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [activeTab, setActiveTab] = useState<"details" | "photos">("details")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [printRequested, setPrintRequested] = useState(false)
  const [signatoryNames, setSignatoryNames] = useState<Record<string, string>>({})

  // verify / void (barangay only)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [verifiedNotice, setVerifiedNotice] = useState(false)
  const [voidOpen, setVoidOpen] = useState(false)
  const [voidedNotice, setVoidedNotice] = useState<{ eventReopened: boolean } | null>(null)
  const [missingFields, setMissingFields] = useState<string[] | null>(null)
  const [acting, setActing] = useState(false)

  const fetchReport = async (isRetry = false) => {
    if (!id) {
      setFetchError(true)
      setLoading(false)
      return
    }
    if (isRetry) setRetrying(true)
    else setLoading(true)
    setFetchError(false)
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/canal-reports/${id}/`)
      if (!res.ok) throw new Error()
      setReport(await res.json())
    } catch {
      setFetchError(true)
    } finally {
      if (isRetry) setRetrying(false)
      else setLoading(false)
    }
  }

  useEffect(() => { fetchReport() }, [id])

  const resolveSignatories = async (r: CanalMonitoringReport): Promise<Record<string, string>> => {
    if (r.signatory_snapshot) return r.signatory_snapshot
    if (r.signatories && Object.keys(r.signatories).length > 0) return r.signatories
    const barangayId = r.barangay_details?.barangay_id
    if (!barangayId) return {}
    try {
      // a 403 on this optional lookup must not log the user out (barangay accounts may not be allowed to read signatories)
      setSuppressInactiveRedirect(true)
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/signatories/?barangay=${barangayId}`)
      if (!res.ok) return {}
      const slots = await res.json()
      const names: Record<string, string> = {}
      slots.forEach((s: any) => { if (s.active) names[s.position] = s.active.name })
      return names
    } catch {
      return {}
    } finally {
      setSuppressInactiveRedirect(false)
    }
  }

  // load names as soon as the report opens (also used by print)
  useEffect(() => {
    if (!report) return
    resolveSignatories(report).then(setSignatoryNames)
  }, [report])

  useEffect(() => {
    if (!printRequested || !report) return

    const urls = [
      '/ROS-logo.jpg',
      ...report.media.filter(m => m.file_url).map(m => m.file_url!),
    ]

    let remaining = urls.length
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      printReport()
      setPrintRequested(false)
    }

    resolveSignatories(report).then(names => {
      setSignatoryNames(names)
      if (remaining === 0) { finish(); return }
      urls.forEach(url => {
        const img = new window.Image()
        img.onload = img.onerror = () => {
          remaining -= 1
          if (remaining === 0) finish()
        }
        img.src = url
      })
    })

    const timeout = setTimeout(finish, 4000)
    return () => clearTimeout(timeout)
  }, [printRequested, report])

const currentUser = getUser()
const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

const handleExport = async () => {
  if (!report) return
  try {
    await openPdf(`/api/canal-reports/${report.report_id}/export/`)
  } catch {
    addToast("Failed to export the report. Please try again.", "error")
  }
}

  const API = process.env.NEXT_PUBLIC_API_URL

  const onVerify = async () => {
    if (!report) return
    setActing(true)
    try {
      const res = await fetchWithAuth(`${API}/api/canal-reports/${report.report_id}/verify/`, { method: "POST" })
      const data = await res.json().catch(() => null)
      setVerifyOpen(false)
      if (!res.ok) {
        if (Array.isArray(data?.missing) && data.missing.length) setMissingFields(data.missing.map(missingLabel))
        else addToast(data?.detail || "Failed to verify the report. Please try again.", "error")
        return
      }
      setReport(data)
      setVerifiedNotice(true)
    } catch {
      setVerifyOpen(false)
      addToast("Failed to verify the report. Please try again.", "error")
    } finally { setActing(false) }
  }

  const onVoid = async (reason: string) => {
    if (!report) return
    setActing(true)
    try {
      const res = await fetchWithAuth(`${API}/api/canal-reports/${report.report_id}/void/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        addToast(data?.detail || "Failed to void the report. Please try again.", "error")
        return
      }
      setVoidOpen(false)
      setVoidedNotice({ eventReopened: !!data?.event_reopened })
    } catch {
      addToast("Failed to void the report. Please try again.", "error")
    } finally { setActing(false) }
  }

  if (loading) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-150">
        <SpinnerIcon size={32} color="#1565BC" />
      </div>
    )
  }

  if (fetchError || !report) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-150 gap-3">
        {retrying ? (
          <>
            <SpinnerIcon size={32} color="#D81010" />
            <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
          </>
        ) : (
          <>
            <div className="text-[#D81010] text-center">
              <p className="font-semibold">Failed to load this report</p>
              <p className="text-sm">Please try again later</p>
            </div>
            <Button onClick={() => fetchReport(true)} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
          </>
        )}
      </div>
    )
  }

  // only the barangay's own pages get actions; the admin / MENRO view stays read-only
  const isBarangay = backHref.startsWith("/barangay")
  const editable = !report.is_submitted && (report.status === "Draft" || report.status === "Ready_To_Verify")
  const canVerify = isBarangay && !report.is_submitted && report.status === "Ready_To_Verify"
  const canEdit = isBarangay && editable
  const canVoid = isBarangay && !report.is_submitted && report.status !== "Submitted" && report.status !== "Voided"

  return (
    <>
      <div className="hidden md:flex flex-col">

        {/* Header bar — read-only, export only */}
        <div className="flex justify-between items-center bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg px-4 py-3 mb-4 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <button onClick={() => router.push(backHref)} className="cursor-pointer p-2 rounded-lg hover:bg-[#e8eef1]">
              <ArrowLeft size={18} className="text-[#122A48]" />
            </button>
            <div className="flex gap-3 items-center">
              <p className="font-bold text-[#122A48] text-sm">
                {report.barangay_details?.barangay_name} — {isCleanupReport(report) ? "Weekly cleanup" : report.purok ? `Purok ${report.purok}` : "Untitled report"}
              </p>
              {!isCleanupReport(report) && report.severity && <StyledBadge text={SEVERITY_LABEL[report.severity]} style={SEVERITY_STYLE[report.severity]} />}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canVerify && (
              <Button onClick={() => setVerifyOpen(true)} className="cursor-pointer bg-[#16a34a] hover:bg-[#15803d] text-white">
                <ShieldCheck size={16} className="mr-1" />
                Verify Report
              </Button>
            )}
            {canEdit && (
              <Button variant="outline" onClick={() => router.push(ROUTES.form(report.report_id))} className="cursor-pointer border-[#cbd5e1] text-[#475569]">
                <Pencil size={16} className="mr-1" />
                Edit
              </Button>
            )}
            {canVoid && (
              <Button variant="outline" onClick={() => setVoidOpen(true)} className="cursor-pointer border-[#fca5a5] text-[#dc2626] hover:bg-[#fef2f2]">
                <FileX size={16} className="mr-1" />
                Void report
              </Button>
            )}
            <Button
              onClick={() => (isIOSDevice() ? handleExport() : setPrintRequested(true))}
              className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-white"
            >
              <FileDown size={16} className="mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* verified: locked, waiting for the next submission */}
        {isBarangay && report.status === "Verified" && (
          <div className="mb-4 rounded-lg border border-[#DDD6FE] bg-[#EDE9FE] px-4 py-3 text-[#5B21B6]">
            <p className="text-sm font-bold">
              Verified by {report.verified_by_name || "—"} on {formatDateTime(report.verified_at ?? null)}
            </p>
            <p className="text-xs">This report is locked and will be included in your next submission to MENRO.</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border ${
              activeTab === "details" ? "bg-[#1565BC] text-white border-[#1565BC]" : "bg-white text-[#727272] border-[#C6C6C8] hover:bg-gray-50"
            }`}
          >
            <FileText size={14} /> Report Details
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border ${
              activeTab === "photos" ? "bg-[#1565BC] text-white border-[#1565BC]" : "bg-white text-[#727272] border-[#C6C6C8] hover:bg-gray-50"
            }`}
          >
            <ImageIcon size={14} /> Photos
          </button>
        </div>

        {activeTab === "details" ? (
          <ReportDocument report={report} signatoryNames={signatoryNames} />
        ) : (
          <PhotosPanel media={report.media} onOpen={setPreviewUrl} />
        )}
      </div>

      {/* verify */}
      <ConfirmModal
        open={verifyOpen}
        title="Verify this report?"
        message="By verifying, you confirm the details are correct. The report will be locked and included in your next submission to MENRO. You can't edit it afterwards."
        icon={<ShieldCheck size={24} color="#16a34a" />}
        confirmLabel="Verify"
        loading={acting}
        onClose={() => setVerifyOpen(false)}
        onConfirm={onVerify}
      />
      <NoticeModal
        open={verifiedNotice}
        title="Report verified"
        message="The report is locked and will be included in your next submission to MENRO."
        icon={<ShieldCheck size={24} color="#16a34a" />}
        iconBg="#dcfce7"
        buttonLabel="OK"
        onClose={() => setVerifiedNotice(false)}
      />
      <IncompleteReportModal open={missingFields !== null} missingFields={missingFields ?? []} onClose={() => setMissingFields(null)} />

      {/* void */}
      <VoidReportModal
        open={voidOpen}
        loading={acting}
        fromClogEvent={!!report.clog_event}
        onClose={() => setVoidOpen(false)}
        onConfirm={onVoid}
      />
      <NoticeModal
        open={voidedNotice !== null}
        title="Report voided"
        message={`The report was voided and removed from your list.${voidedNotice?.eventReopened ? " The clog event is back to Detected, so you can respond and report on it again." : ""}`}
        icon={<FileX size={24} color="#dc2626" />}
        iconBg="#FEE2E2"
        buttonLabel="OK"
        onClose={() => { setVoidedNotice(null); router.push(backHref) }}
      />

      {/* Photo preview */}
      <Dialog open={previewUrl !== null} onOpenChange={(open) => { if (!open) setPreviewUrl(null) }}>
        <DialogContent className="max-w-[90vw] sm:max-w-4xl p-2">
          <DialogTitle className="sr-only">Photo preview</DialogTitle>
          {previewUrl && <img src={previewUrl} alt="Report photo" className="w-full max-h-[80vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>

      <Toast toasts={toasts} onRemove={removeToast} />

      {report && <PrintCanalReport report={report} generatedBy={generatedBy} signatoryNames={signatoryNames} />}
    </>
  )
}