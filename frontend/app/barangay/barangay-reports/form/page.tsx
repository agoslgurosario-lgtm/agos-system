"use client"

// Weekly Cleanup Report form (web version of the mobile screen), aligned with the backend views.py.
// /barangay/barangay-reports/form                -> new report
// /barangay/barangay-reports/form?report_id=12   -> continue a draft   (?id=12 also works)
//
// How the backend treats a cleanup report:
//  - it is a whole-barangay report (report_scope = "Barangay"), so there is no purok picker
//  - the form saves a Draft, then POST /api/canal-reports/{id}/complete/ finishes it
//  - on complete, canal condition = worst value across the puroks that have sensor data;
//    the barangay's own three values are only used when NO purok has sensor data
//  - date_responded is the cleanup date; it can't be in the future, and only one cleanup per day
//  - photos go to POST /api/report-media/upload/ with report_id

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft, Brush, CheckCircle2, ChevronDown, ClipboardCheck, ImagePlus, Lock,
  Plus, Save, Trash2, Upload, UserCheck, Waves, X, FileCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Toast } from "@/components/Toast"
import { useToast } from "@/components/hooks/useToast"
import { useSignatoryStatus } from "@/lib/hooks/useSignatoryStatus"
import { IncompleteSignatoriesModal } from "@/components/CanalReports/IncompleteSignatoriesModal"
import { NoticeModal } from "@/components/CanalReports/NoticeModal"
import { IncompleteReportModal } from "@/components/CanalReports/IncompleteReportModal"
import { ConfirmModal } from "@/components/CanalReports/ConfirmModal"
import { AddOtherWasteModal } from "@/components/CanalReports/AddOtherWasteModal"
import { fetchWithAuth, getUser } from "@/lib/auth"
import { ROUTES } from "@/lib/canalReportRoutes"
import { WASTE_CATEGORIES, WASTE_HINT, MEDIA_CATEGORIES, type WasteKey } from "@/lib/wasteCategories"
import type {
  CanalMonitoringReport, CleanupPreviewPurok, CustomWasteType, MediaCategory, ObstructionCoverage,
  ReportMedia, WaterFlowCondition, WaterLevel,
} from "@/types/report"

const API = process.env.NEXT_PUBLIC_API_URL

// ---------- options (ordered mildest -> worst, so the highest index is the worst) ----------
const WATER_LEVELS: { v: WaterLevel; l: string }[] = [
  { v: "Low", l: "Low" }, { v: "Moderate", l: "Moderate" }, { v: "High", l: "High" },
]
const OBSTRUCTIONS: { v: ObstructionCoverage; l: string }[] = [
  { v: "Under_25", l: "<25%" }, { v: "25_50", l: "25–50%" }, { v: "50_75", l: "50–75%" }, { v: "Over_75", l: ">75%" },
]
const FLOWS: { v: WaterFlowCondition; l: string }[] = [
  { v: "Normal", l: "Normal" }, { v: "Reduced", l: "Reduced" }, { v: "Blocked", l: "Blocked" },
]
const labelOf = <T extends string>(opts: { v: T; l: string }[], v: T | null | undefined) =>
  opts.find(o => o.v === v)?.l ?? "—"

function worst<T extends string>(opts: { v: T }[], vals: (T | null | undefined)[]): T | null {
  let best = -1
  vals.forEach(v => {
    if (!v) return
    const i = opts.findIndex(o => o.v === v)
    if (i > best) best = i
  })
  return best < 0 ? null : opts[best].v
}


// the backend accepts several photos in every category
const PHOTO_SLOTS = MEDIA_CATEGORIES.map(m => ({ cat: m.value as MediaCategory, label: m.label, required: m.required }))

// names for the `missing` list the backend sends back from /complete/
const MISSING_LABELS: Record<string, string> = {
  assigned_personnel: "Assigned personnel",
  date_responded: "Date / time of the cleanup",
  action_taken: "Action taken",
  waste_collected_amount: "Waste collected",
  before_photos: "Before Cleanup photo",
  after_photos: "After Cleanup photo",
}

type OtherRow = { waste_type_id: number; name: string; kg: string }

// ---------- helpers ----------
const pad = (n: number) => String(n).padStart(2, "0")
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const num = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? 0 : Number(s))

// error bodies look like { detail }, { error }, or { field: ["message"] }
const apiMessage = (data: any, fallback: string): string => {
  if (!data || typeof data !== "object") return fallback
  if (typeof data.detail === "string") return data.detail
  if (typeof data.error === "string") return data.error
  const first = Object.values(data)[0]
  const msg = Array.isArray(first) ? first[0] : first
  return typeof msg === "string" ? msg : fallback
}
const readJson = async (res: Response) => { try { return await res.json() } catch { return null } }

const field = "w-full rounded-lg border-2 border-[#C6C6C8] bg-white px-3 py-2 text-sm text-[#122A48] outline-none focus:border-[#16a34a]"
const locked = "flex items-center gap-2 rounded-lg border-2 border-[#C6C6C8] bg-[#EEF2F6] px-3 py-2 text-sm text-[#727272]"
const label = "mb-1 block text-xs font-semibold text-[#122A48]"

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#00000030] bg-[#FAFCFD] p-5 shadow-[0_2px_4px_rgba(0,0,0,0.05)]">
      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#16a34a]">{icon}{title}</div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

function Chips<T extends string>({ options, value, onChange, disabled }: {
  options: { v: T; l: string }[]; value: T | null; onChange: (v: T) => void; disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.v} type="button" disabled={disabled} onClick={() => onChange(o.v)}
          className={`rounded-lg border px-4 py-1.5 text-xs font-semibold transition ${
            value === o.v ? "border-[#16a34a] bg-[#16a34a] text-white" : "border-[#C6C6C8] bg-white text-[#122A48] hover:bg-[#f5f5f5]"
          } ${disabled ? "cursor-default" : "cursor-pointer"}`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

// ---------- page ----------
function CleanupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const draftId = params.get("report_id") ?? params.get("id")
  const { toasts, addToast, removeToast } = useToast()
  const signatories = useSignatoryStatus()
  const [signatoryOpen, setSignatoryOpen] = useState(false)
  const noSignatories = signatories.loading || !signatories.complete // stay blocked while checking or if the check fails
  // open the modal once as soon as the check finishes and something is wrong
  useEffect(() => {
    if (!signatories.loading && !signatories.complete) setSignatoryOpen(true)
  }, [signatories.loading, signatories.complete])

  const [reportId, setReportId] = useState<number | null>(draftId ? Number(draftId) : null)
  const [loadingDraft, setLoadingDraft] = useState(!!draftId)
  const [saving, setSaving] = useState(false)

  const [barangayName, setBarangayName] = useState<string>("—")
  const [dateResponded, setDateResponded] = useState("")

  // the barangay's own values: only used (and sent) when no purok has sensor data
  const [level, setLevel] = useState<WaterLevel | null>(null)
  const [obstruction, setObstruction] = useState<ObstructionCoverage | null>(null)
  const [flow, setFlow] = useState<WaterFlowCondition | null>(null)
  const [showPuroks, setShowPuroks] = useState(false)
  const [preview, setPreview] = useState<CleanupPreviewPurok[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)

  const [waste, setWaste] = useState<Record<WasteKey, string>>(() => Object.fromEntries(WASTE_CATEGORIES.map(f => [f.key, ""])) as Record<WasteKey, string>)
  const [other, setOther] = useState<OtherRow[]>([])
  const [wasteTypes, setWasteTypes] = useState<CustomWasteType[]>([])
  const [otherModal, setOtherModal] = useState(false)

  const [personnel, setPersonnel] = useState("")
  const [action, setAction] = useState("")
  const [remarks, setRemarks] = useState("")

  const [existingMedia, setExistingMedia] = useState<ReportMedia[]>([])
  const [pending, setPending] = useState<Record<MediaCategory, File[]>>({ Before_Clearing: [], After_Clearing: [], Additional_Evidence: [] })

  const [incomplete, setIncomplete] = useState<string[] | null>(null)
  const [nothingToSave, setNothingToSave] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null) // photo shown full size

  const applyReport = (r: CanalMonitoringReport) => {
    const x = r as any
    // a cleanup can be edited while it is a Draft or waiting to be verified, never after
    if (x.is_submitted || !["Draft", "Ready_To_Verify"].includes(x.status)) {
      addToast("This report is locked and can no longer be edited.", "error")
      router.push(ROUTES.list)
      return
    }
    if (r.barangay_details?.barangay_name) setBarangayName(r.barangay_details.barangay_name)
    const when = x.date_responded ?? r.date_observed
    if (when) setDateResponded(toLocalInput(new Date(when)))
    else setDateResponded(toLocalInput(new Date()))
    setLevel(r.overall_water_level); setObstruction(r.overall_obstruction_coverage); setFlow(r.overall_water_flow_condition)
    setWaste(Object.fromEntries(WASTE_CATEGORIES.map(f => [f.key, (r as any)[f.key] != null ? String((r as any)[f.key]) : ""])) as Record<WasteKey, string>)
    setOther((r.custom_waste ?? []).map((c: any) => ({
      waste_type_id: c.waste_type ?? c.waste_type_id, name: c.waste_type_name, kg: String(c.weight_kg),
    })))
    setPersonnel(r.assigned_personnel ?? ""); setAction(r.action_taken ?? ""); setRemarks(r.remarks ?? "")
    setExistingMedia(r.media ?? [])
  }

  // browser-only values are filled in after mount so the server and client HTML match (avoids the hydration error)
  useEffect(() => {
    const name = (getUser() as any)?.barangay_details?.barangay_name
    if (name) setBarangayName(prev => (prev === "—" ? name : prev))
    if (!draftId) setDateResponded(toLocalInput(new Date()))
  }, [])

  // saved waste types (approved ones + this barangay's own pending ones)
  useEffect(() => {
    fetchWithAuth(`${API}/api/custom-waste-types/`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setWasteTypes(data.results ?? data))
      .catch(() => setWasteTypes([]))
  }, [])

  // Escape closes the full-size photo
  useEffect(() => {
    if (!viewing) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setViewing(null)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewing])

  // load draft
  useEffect(() => {
    if (!draftId) return
    fetchWithAuth(`${API}/api/canal-reports/${draftId}/`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(applyReport)
      .catch(() => addToast("Failed to load the draft.", "error"))
      .finally(() => setLoadingDraft(false))
  }, [draftId])

  // sensor summary for the 7 days up to the cleanup date (every purok of the barangay is returned)
  useEffect(() => {
    const d = new Date(dateResponded)
    if (isNaN(d.getTime())) return
    setPreviewLoading(true)
    fetchWithAuth(`${API}/api/canal-reports/cleanup-preview/?date=${encodeURIComponent(d.toISOString())}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(data => setPreview(Array.isArray(data?.puroks) ? data.puroks : []))
      .catch(() => setPreview([]))
      .finally(() => setPreviewLoading(false))
  }, [dateResponded])

  // ----- derived -----
  const counted = preview.filter(p => p.has_sensor_data)
  const fromSensor = counted.length > 0
  const readings = counted.reduce((s, p) => s + (p.reading_count ?? 0), 0)
  const effLevel = fromSensor ? worst(WATER_LEVELS, counted.map(p => p.overall_water_level)) : level
  const effObstruction = fromSensor ? worst(OBSTRUCTIONS, counted.map(p => p.overall_obstruction_coverage)) : obstruction
  const effFlow = fromSensor ? worst(FLOWS, counted.map(p => p.overall_water_flow_condition)) : flow

  const categoryTotal = WASTE_CATEGORIES.reduce((s, f) => s + num(waste[f.key]), 0)
  const totalKg = categoryTotal + other.reduce((s, o) => s + num(o.kg), 0)

  const photoCount = (cat: MediaCategory) => existingMedia.filter(m => m.media_category === cat).length + pending[cat].length
  const totalPhotos = PHOTO_SLOTS.reduce((s, p) => s + photoCount(p.cat), 0)

  const picked = new Date(dateResponded)
  const hasDate = !isNaN(picked.getTime())
  const notSaturday = hasDate && picked.getDay() !== 6
  const inFuture = hasDate && picked.getTime() > Date.now() + 5 * 60 * 1000 // the backend allows 5 minutes

  const hasAnyInput =
    totalKg > 0 || personnel.trim() !== "" || action.trim() !== "" || remarks.trim() !== "" ||
    (!fromSensor && (level || obstruction || flow) !== null) || totalPhotos > 0

  // mirrors the checks in CanalReportCompleteView / _complete_cleanup
  const validate = () => {
    const missing: string[] = []
    if (!hasDate) missing.push(MISSING_LABELS.date_responded)
    if (!personnel.trim()) missing.push(MISSING_LABELS.assigned_personnel)
    if (!action.trim()) missing.push(MISSING_LABELS.action_taken)
    if (!fromSensor && !previewLoading) {
      if (!level) missing.push("Overall water level")
      if (!obstruction) missing.push("Overall obstruction")
      if (!flow) missing.push("Overall water flow")
    }
    if (photoCount("Before_Clearing") === 0) missing.push(MISSING_LABELS.before_photos)
    if (photoCount("After_Clearing") === 0) missing.push(MISSING_LABELS.after_photos)
    return missing
  }

  // ----- saving -----
  const buildPayload = () => {
    const iso = hasDate ? picked.toISOString() : null
    return {
      report_scope: "Barangay", // whole-barangay cleanup: sent on every save so old drafts are updated too
      purok: null,
      date_responded: iso,
      date_observed: iso, // the backend copies date_responded into this when the report is completed
      // the barangay's own condition is only kept when no purok has sensor data
      ...(fromSensor ? {} : { overall_water_level: level, overall_obstruction_coverage: obstruction, overall_water_flow_condition: flow }),
      ...Object.fromEntries(WASTE_CATEGORIES.map(f => [f.key, waste[f.key].trim() === "" ? null : num(waste[f.key])])),
      // TODO: confirm the field name your serializer expects for the other-waste rows
      custom_waste_input: other.filter(o => num(o.kg) > 0).map(o => ({ waste_type: o.waste_type_id, name: o.name, weight_kg: num(o.kg) })),
      assigned_personnel: personnel.trim() || null,
      action_taken: action.trim() || null,
      waste_collected_amount: totalKg,
      waste_collected_unit: "kg",
      remarks: remarks.trim(),
    }
  }

  const saveReport = async (): Promise<number> => {
    const body = JSON.stringify({ ...buildPayload(), ...(reportId ? {} : { status: "Draft" }) })
    const res = await fetchWithAuth(
      reportId ? `${API}/api/canal-reports/${reportId}/` : `${API}/api/canal-reports/`,
      { method: reportId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body },
    )
    const saved = await readJson(res)
    if (!res.ok) throw new Error(apiMessage(saved, "Failed to save the report."))
    const id: number = saved.report_id
    setReportId(id)

    // upload newly picked photos
    for (const cat of Object.keys(pending) as MediaCategory[]) {
      for (const file of pending[cat]) {
        const fd = new FormData()
        fd.append("report_id", String(id))
        fd.append("media_category", cat)
        fd.append("file", file)
        const up = await fetchWithAuth(`${API}/api/report-media/upload/`, { method: "POST", body: fd })
        if (!up.ok) {
          const raw = await up.text()
          let data: any = null
          try { data = JSON.parse(raw) } catch { /* not JSON, e.g. an HTML error page */ }
          console.error("Photo upload failed", up.status, raw.slice(0, 500))
          throw new Error(apiMessage(data, `A photo could not be uploaded (HTTP ${up.status}).`))
        }
      }
    }
    setPending({ Before_Clearing: [], After_Clearing: [], Additional_Evidence: [] })

    // refresh the media list so uploaded photos show up
    const fresh = await fetchWithAuth(`${API}/api/canal-reports/${id}/`)
    if (fresh.ok) setExistingMedia(((await fresh.json()) as CanalMonitoringReport).media ?? [])
    return id
  }

  const onSaveDraft = async () => {
    if (!hasAnyInput) { setNothingToSave(true); return }
    setSaving(true)
    try { await saveReport(); setDraftSaved(true) }
    catch (e: any) { addToast(e?.message || "Failed to save the draft. Please try again.", "error") }
    finally { setSaving(false) }
  }

  const onComplete = () => {
    if (inFuture) { addToast("The cleanup date can't be in the future.", "error"); return }
    const missing = validate()
    if (missing.length) setIncomplete(missing)
    else setConfirmOpen(true)
  }

  // save, then finish it: POST /complete/ turns the Draft into Ready_To_Verify
  const onConfirm = async () => {
    setSaving(true)
    try {
      const id = await saveReport()
      const res = await fetchWithAuth(`${API}/api/canal-reports/${id}/complete/`, { method: "POST" })
      if (!res.ok) {
        const data = await readJson(res)
        setConfirmOpen(false)
        if (Array.isArray(data?.missing) && data.missing.length) {
          setIncomplete(data.missing.map((k: string) => MISSING_LABELS[k] ?? k))
        } else {
          addToast(apiMessage(data, "Failed to complete the report. Please try again."), "error")
        }
        return
      }
      router.push(ROUTES.view(id)) // review it there, then verify
    } catch (e: any) {
      setConfirmOpen(false)
      addToast(e?.message || "Failed to complete the report. Please try again.", "error")
    } finally { setSaving(false) }
  }

  // copy the files out of the input right away: the FileList is emptied when the input is reset
  const pickFiles = (cat: MediaCategory, files: File[]) => {
    if (!files.length) return
    setPending(p => ({ ...p, [cat]: [...p[cat], ...files] }))
  }

  // delete a photo that is already saved on the report
  const removeSaved = async (m: ReportMedia) => {
    try {
      const res = await fetchWithAuth(`${API}/api/report-media/${m.media}/`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setExistingMedia(list => list.filter(x => x.media !== m.media))
    } catch {
      addToast("Failed to remove the photo.", "error")
    }
  }

  if (loadingDraft) return <p className="py-20 text-center text-sm text-[#727272]">Loading…</p>

  return (
    <div className="flex w-full flex-col gap-4 pb-8 text-[#122A48]">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.push(ROUTES.list)} className="cursor-pointer rounded-full p-1.5 hover:bg-[#e8eef1]" aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-base font-bold">Weekly Cleanup Report</h1>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4">
          {/* cleanup details */}
          <Section icon={<Brush size={14} />} title="Cleanup details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><span className={label}>Barangay</span><div className={locked}><Lock size={14} />{barangayName}</div></div>
              <div><span className={label}>Municipality</span><div className={locked}><Lock size={14} />Rosario, La Union</div></div>
            </div>
            <div>
              <label className={label}>Date / Time of the Cleanup <span className="text-[#D81010]">*</span></label>
              <input
                type="datetime-local" value={dateResponded} max={toLocalInput(new Date())}
                onChange={e => setDateResponded(e.target.value)} className={field}
              />
              {inFuture && <p className="mt-1 text-xs text-[#D81010]">The cleanup date can&apos;t be in the future.</p>}
              {!inFuture && notSaturday && <p className="mt-1 text-xs text-[#c2410c]">This date is not a Saturday. You can still continue.</p>}
              <p className="mt-1 text-xs text-[#727272]">Only one cleanup report is allowed per day.</p>
            </div>
          </Section>

          {/* overall canal condition */}
          <Section icon={<Waves size={14} />} title="Overall canal condition">
            <p className="text-xs text-[#727272]">
              Taken from the sensors of every purok for the 7 days up to the cleanup, using the worst value. You only enter it yourself when no purok has sensor data.
            </p>
            <div className={`rounded-xl border p-4 ${fromSensor ? "border-[#bfdbfe] bg-[#eff6ff]" : "border-[#fde68a] bg-[#fffbeb]"}`}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold">Barangay summary</p>
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${fromSensor ? "bg-[#dbeafe] text-[#1d4ed8]" : "bg-[#fde68a] text-[#92400e]"}`}>
                  {previewLoading ? "LOADING" : fromSensor ? "SENSOR" : "MANUAL"}
                </span>
              </div>
              {fromSensor && (
                <p className="mb-3 text-xs text-[#64748b]">
                  Based on {counted.length} of {preview.length} puroks with sensor data · {readings} readings
                </p>
              )}
              {!fromSensor && !previewLoading && (
                <p className="mb-3 text-xs text-[#b45309]">No sensor data for this week. Enter the canal condition for the whole barangay.</p>
              )}

              <span className={label}>Water level {!fromSensor && <span className="text-[#D81010]">*</span>}</span>
              <Chips options={WATER_LEVELS} value={effLevel} onChange={setLevel} disabled={fromSensor} />
              <span className={`${label} mt-3`}>Obstruction coverage {!fromSensor && <span className="text-[#D81010]">*</span>}</span>
              <Chips options={OBSTRUCTIONS} value={effObstruction} onChange={setObstruction} disabled={fromSensor} />
              <span className={`${label} mt-3`}>Water flow {!fromSensor && <span className="text-[#D81010]">*</span>}</span>
              <Chips options={FLOWS} value={effFlow} onChange={setFlow} disabled={fromSensor} />
            </div>

            <button type="button" onClick={() => setShowPuroks(s => !s)} className="flex w-fit cursor-pointer items-center gap-1 text-xs font-semibold">
              <ChevronDown size={14} className={showPuroks ? "rotate-180" : ""} /> See per purok
            </button>
            {showPuroks && (
              <div className="flex flex-col gap-1.5 text-xs">
                {preview.length === 0 && <p className="text-[#727272]">No purok data.</p>}
                {preview.map(p => (
                  <div key={p.purok} className="flex justify-between rounded-lg border border-[#e2e8f0] bg-white px-3 py-2">
                    <span className="font-semibold">Purok {p.purok}</span>
                    <span className="text-[#727272]">
                      {p.has_sensor_data
                        ? `${labelOf(WATER_LEVELS, p.overall_water_level)} · ${labelOf(OBSTRUCTIONS, p.overall_obstruction_coverage)} · ${labelOf(FLOWS, p.overall_water_flow_condition)}`
                        : (p.node_names?.length ?? 0) === 0 ? "No sensors" : "No readings this week"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          {/* waste composition */}
          <Section icon={<Trash2 size={14} />} title="Waste composition">
            <p className="text-xs text-[#727272]">Estimate what was in the canal. Anything left blank is recorded as 0. Waste Collected is totaled automatically.</p>
            <p className="text-[11px] leading-4 text-[#94a3b8]">{WASTE_HINT}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {WASTE_CATEGORIES.map(f => (
                <div key={f.key}>
                  <label className={label}>{f.label} (kg)</label>
                  <input
                    type="number" min="0" step="any" placeholder="0.00" value={waste[f.key]}
                    onChange={e => setWaste(w => ({ ...w, [f.key]: e.target.value }))} className={field}
                  />
                </div>
              ))}
            </div>

            <div className="border-t border-[#e2e8f0] pt-3">
              <span className={label}>Other Waste (kg)</span>
              <p className="mb-2 text-xs text-[#727272]">Anything not listed above, like wood or a mattress. New types are reviewed by MENRO, and other barangays see them once approved.</p>
              {other.map((o, i) => (
                <div key={o.waste_type_id} className="mb-2 flex items-center gap-2">
                  <div className={`${locked} flex-1`}>{o.name}</div>
                  <input type="number" min="0" step="any" placeholder="kg" value={o.kg} onChange={e => setOther(l => l.map((x, j) => (j === i ? { ...x, kg: e.target.value } : x)))} className={`${field} max-w-32`} />
                  <button type="button" onClick={() => setOther(l => l.filter((_, j) => j !== i))} className="cursor-pointer rounded-lg p-2 text-[#D81010] hover:bg-[#fee2e2]" aria-label="Remove"><X size={16} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setOtherModal(true)} className="flex w-full cursor-pointer items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#16a34a80] py-2 text-xs font-semibold text-[#16a34a] hover:bg-[#f0fdf4]">
                <Plus size={14} /> Add other waste
              </button>
            </div>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          {/* barangay response */}
          <Section icon={<UserCheck size={14} />} title="Barangay response">
            <div>
              <label className={label}>Assigned Personnel <span className="text-[#D81010]">*</span></label>
              <input value={personnel} onChange={e => setPersonnel(e.target.value)} placeholder="Who carried out the cleanup" className={field} />
            </div>
            <div>
              <label className={label}>Action Taken <span className="text-[#D81010]">*</span></label>
              <textarea rows={3} value={action} onChange={e => setAction(e.target.value)} placeholder="Describe what was done to clear the canal..." className={field} />
            </div>
            <div>
              <label className={label}>Waste Collected (auto total)</label>
              <div className={locked}><Lock size={14} />{totalKg.toFixed(2)} kg</div>
            </div>
            <p className="text-xs text-[#727272]">Puroks without sensors aren&apos;t part of the summary above. If you want to report on them, describe their canal condition here, along with anything else worth noting.</p>
            <div>
              <label className={label}>Remarks</label>
              <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. Purok 5 has no sensor. Canal was mostly clear, only a few leaves." className={field} />
            </div>
          </Section>

          {/* photos */}
          <Section icon={<Upload size={14} />} title="Photos">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PHOTO_SLOTS.map(slot => (
                <div key={slot.cat}>
                  <span className={label}>{slot.label} {slot.required && <span className="text-[#D81010]">*</span>}</span>
                  <div className="flex flex-col gap-2">
                    {existingMedia.filter(m => m.media_category === slot.cat && m.file_url).map(m => (
                      <div key={m.media} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.file_url!} alt={slot.label} onClick={() => setViewing(m.file_url!)} className="h-24 w-full cursor-zoom-in rounded-lg border border-[#e2e8f0] object-cover" />
                        <button type="button" onClick={() => removeSaved(m)} aria-label="Remove photo"
                          className="absolute right-1 top-1 cursor-pointer rounded-full bg-white/90 p-0.5 text-[#D81010]"><X size={14} /></button>
                      </div>
                    ))}
                    {pending[slot.cat].map((f, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] px-2 py-1.5 text-xs">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={URL.createObjectURL(f)} alt="" onClick={() => setViewing(URL.createObjectURL(f))} className="h-10 w-10 shrink-0 cursor-zoom-in rounded object-cover" />
                        <span onClick={() => setViewing(URL.createObjectURL(f))} className="flex-1 cursor-pointer truncate hover:underline">{f.name}</span>
                        <button type="button" onClick={() => setPending(p => ({ ...p, [slot.cat]: p[slot.cat].filter((_, j) => j !== i) }))} className="cursor-pointer text-[#D81010]" aria-label="Remove"><X size={14} /></button>
                      </div>
                    ))}
                    <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#16a34a80] bg-[#dcfce7] text-xs font-semibold text-[#16a34a] hover:bg-[#bbf7d0]">
                      <ImagePlus size={22} />
                      Add Photo
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => { const picked = Array.from(e.target.files ?? []); e.target.value = ""; pickFiles(slot.cat, picked) }} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
        <Button onClick={onComplete} disabled={saving || noSignatories} className="flex-1 cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d] sm:w-60 sm:flex-none">
          <CheckCircle2 size={16} className="mr-1" /> Complete &amp; Review
        </Button>
        <Button variant="outline" onClick={onSaveDraft} disabled={saving} className="flex-1 cursor-pointer border-[#cbd5e1] text-[#475569] sm:w-60 sm:flex-none">
          <Save size={16} className="mr-1" /> {saving ? "Saving..." : "Save Draft"}
        </Button>
        {!signatories.loading && !signatories.complete && (
          <button type="button" onClick={() => setSignatoryOpen(true)}
            className="cursor-pointer text-xs font-semibold text-[#d97706] underline sm:self-center">
            Why can't I complete this?
          </button>
        )}
      </div>

      {/* add other waste */}
      <AddOtherWasteModal
        open={otherModal}
        onClose={() => setOtherModal(false)}
        wasteTypes={wasteTypes}
        excludeIds={other.map(o => o.waste_type_id)}
        onPick={t => setOther(l => [...l, { waste_type_id: t.waste_type_id, name: t.name, kg: "" }])}
        onCreated={t => {
          setWasteTypes(l => (l.some(x => x.waste_type_id === t.waste_type_id) ? l : [...l, t]))
          setOther(l => (l.some(o => o.waste_type_id === t.waste_type_id) ? l : [...l, { waste_type_id: t.waste_type_id, name: t.name, kg: "" }]))
        }}
      />

      {/* signatories missing, or the check failed */}
      <IncompleteSignatoriesModal
        open={signatoryOpen && !signatories.error}
        missingPositions={signatories.missing}
        onClose={() => setSignatoryOpen(false)}
      />
      <NoticeModal
        open={signatoryOpen && signatories.error}
        title="Couldn't check signatories"
        message="We couldn't check your barangay's signatories, so completing is turned off for now. Please reload the page and try again."
        onClose={() => setSignatoryOpen(false)}
      />

      {/* report incomplete */}
      <IncompleteReportModal open={incomplete !== null} missingFields={incomplete ?? []} onClose={() => setIncomplete(null)} />

      {/* nothing to save */}
      <NoticeModal
        open={nothingToSave}
        title="Nothing to save"
        message="Fill in something first, then save it as a draft."
        buttonLabel="OK"
        onClose={() => setNothingToSave(false)}
      />

      {/* draft saved */}
      <NoticeModal
        open={draftSaved}
        title="Draft Saved"
        message="You can continue this report anytime from the Reports tab, on any device signed in to your barangay account."
        icon={<FileCheck size={24} color="#16a34a" />}
        iconBg="#dcfce7"
        onClose={() => { setDraftSaved(false); router.push(ROUTES.list) }}
      />

      {/* confirm completion */}
      <ConfirmModal
        open={confirmOpen}
        title="Complete this report?"
        message="Your report will be saved and shown in a preview, where you can verify it. You can still edit it until you verify."
        icon={<ClipboardCheck size={24} color="#16a34a" />}
        confirmLabel="Complete"
        loading={saving}
        onClose={() => setConfirmOpen(false)}
        onConfirm={onConfirm}
      />

      {/* full-size photo */}
      {viewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4" onClick={() => setViewing(null)} role="dialog" aria-modal="true">
          <button type="button" onClick={() => setViewing(null)} aria-label="Close"
            className="absolute right-4 top-4 cursor-pointer rounded-full bg-white/15 p-2 text-white hover:bg-white/25"><X size={22} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt="" onClick={e => e.stopPropagation()} className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain" />
        </div>
      )}

      <Toast toasts={toasts} onRemove={removeToast} />
    </div>
  )
}

export default function CleanupFormPage() {
  return (
    <Suspense fallback={null}>
      <CleanupForm />
    </Suspense>
  )
}