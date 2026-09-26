"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import RosLogo from "@/public/ROS-logo.jpg"

// icons
import { ArrowLeft, FileText, Image as ImageIcon, FileDown } from "lucide-react"

// shadcn
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

// components
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { Toast } from "@/components/Toast"
import { useToast } from "@/components/hooks/useToast"
import StyledBadge from "../StyledBadge"
import { PrintCanalReport } from "@/components/PrintReport/PrintCanalReport"

// lib
import { fetchWithAuth } from "@/lib/auth"
import {
  SEVERITY_STYLE, FINAL_CONDITION_LABEL, FINAL_CONDITION_STYLE,
  WATER_LEVEL_LABEL, OBSTRUCTION_LABEL, WATER_FLOW_LABEL,
  WASTE_CATEGORIES, formatDateTime, filedByName,
} from "@/lib/reportOptions"
import type { CanalMonitoringReport, ReportMedia } from "@/types/report"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

type Props = {
  id: string | null
  backHref: string
}

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

function ReportDocument({ report }: { report: CanalMonitoringReport }) {
  const barangayName = report.barangay_details?.barangay_name ?? "—"
  const coordinates =
    report.latitude != null && report.longitude != null
      ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
      : ""

  const wasteRows = [
    ...WASTE_CATEGORIES.map(c => ({ label: c.label, kg: Number(report[c.key] ?? 0) })),
    {
      label: report.waste_other_label ? `Other (${report.waste_other_label})` : "Other",
      kg: report.waste_other_kg ?? 0,
    },
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
          Report No. {report.report_id} &nbsp;|&nbsp; Filed by <span className="font-semibold">{filedByName(report)}</span>
        </p>
      </div>

      {/* Monitoring site */}
      <SectionBar title="Monitoring Site Information" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <Field label="Canal Name / ID">{report.canal_name}</Field>
        <Field label="Barangay">{barangayName}</Field>
        <Field label="City / Municipality">Rosario</Field>
        <Field label="Province">La Union</Field>
        <Field label="GPS Coordinates (Lat, Long)">{coordinates}</Field>
        <Field label="Nearest Landmark">{report.nearest_landmark}</Field>
      </div>

      {/* Detection summary */}
      <SectionBar title="Detection Summary" />
      <div className="grid grid-cols-2 gap-x-8 gap-y-3">
        <Field label="Date / Time Observed">{formatDateTime(report.date_observed)}</Field>
        <Field label="Severity">
          {report.severity && <StyledBadge text={report.severity} style={SEVERITY_STYLE[report.severity]} />}
        </Field>
      </div>

      {/* Canal condition */}
      <SectionBar title="Canal Condition" />
      <div className="grid grid-cols-3 gap-x-8 gap-y-3">
        <Field label="Water Level">{report.water_level && WATER_LEVEL_LABEL[report.water_level]}</Field>
        <Field label="Water Flow Condition">{report.water_flow_condition && WATER_FLOW_LABEL[report.water_flow_condition]}</Field>
        <Field label="Obstruction Coverage">{report.obstruction_coverage && OBSTRUCTION_LABEL[report.obstruction_coverage]}</Field>
      </div>

      {/* Waste composition */}
      <SectionBar title="Waste Composition (kg)" />
      <div className="grid grid-cols-2 gap-x-10">
        {wasteRows.map(row => (
          <div key={row.label} className="flex items-center justify-between border-b border-[#DDDDDD] py-1.5 text-sm text-[#122A48]">
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
        <Field label="Date / Time Responded">{formatDateTime(report.date_responded)}</Field>
        <Field label="Waste Collected">
          {report.waste_collected_amount != null ? `${Number(report.waste_collected_amount).toFixed(2)} kg` : ""}
        </Field>
        <Field label="Final Canal Condition">
          {report.final_canal_condition && (
            <StyledBadge
              text={FINAL_CONDITION_LABEL[report.final_canal_condition]}
              style={FINAL_CONDITION_STYLE[report.final_canal_condition]}
            />
          )}
        </Field>
      </div>
      <TextBox label="Action Taken" text={report.action_taken} />
      <TextBox label="Remarks" text={report.remarks} />
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
                  <button key={m.media} type="button" onClick={() => onOpen(m.file_url!)} className="cursor-zoom-in">
                    <img
                      src={m.file_url!}
                      alt={group.label}
                      className="w-full h-40 object-cover rounded-lg border border-[#C6C6C8] hover:opacity-90"
                    />
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

    urls.forEach(url => {
      const img = new window.Image()
      img.onload = img.onerror = () => {
        remaining -= 1
        if (remaining === 0) finish()
      }
      img.src = url
    })

    const timeout = setTimeout(finish, 4000)
    return () => clearTimeout(timeout)
  }, [printRequested, report])

const currentUser = getUser()
const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

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
                {report.barangay_details?.barangay_name} — {report.canal_name || "Untitled canal"}
              </p>
              {report.severity && <StyledBadge text={report.severity} style={SEVERITY_STYLE[report.severity]} />}
            </div>
          </div>
          <Button
            onClick={() => setPrintRequested(true)}
            className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-white"
          >
            <FileDown size={16} className="mr-1" />
            Export
          </Button>
        </div>

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
          <ReportDocument report={report} />
        ) : (
          <PhotosPanel media={report.media} onOpen={setPreviewUrl} />
        )}
      </div>

      {/* Photo preview */}
      <Dialog open={previewUrl !== null} onOpenChange={(open) => { if (!open) setPreviewUrl(null) }}>
        <DialogContent className="max-w-[90vw] sm:max-w-4xl p-2">
          <DialogTitle className="sr-only">Photo preview</DialogTitle>
          {previewUrl && <img src={previewUrl} alt="Report photo" className="w-full max-h-[80vh] object-contain rounded" />}
        </DialogContent>
      </Dialog>

      <Toast toasts={toasts} onRemove={removeToast} />

      {report && <PrintCanalReport report={report} generatedBy={generatedBy} />}
    </>
  )
}