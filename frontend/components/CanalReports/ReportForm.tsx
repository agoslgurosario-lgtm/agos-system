"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, ClipboardList, Lock, Plus, Save, Trash2, UserCheck, Waves, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { Toast } from "@/components/Toast"
import { useToast } from "@/components/hooks/useToast"
import { getUser } from "@/lib/auth"
import { ROUTES } from "@/lib/canalReportRoutes"
import { MEDIA_CATEGORIES, WASTE_CATEGORIES, WASTE_HINT, type WasteKey } from "@/lib/wasteCategories"
import {
  errorMessage, getCleanupPreview, getCustomWasteTypes, getReport, saveReport, type ReportFormValues,
} from "@/lib/canalReportsApi"
import { CleanupSummary } from "./CleanupSummary"
import { AddOtherWasteModal } from "./AddOtherWasteModal"
import { IncompleteReportModal } from "./IncompleteReportModal"
import { NoticeModal } from "./NoticeModal"
import { PhotoField, type PhotoItem } from "./PhotoField"
import { PhotoPreviewModal } from "./PhotoPreviewModal"
import type {
  CleanupPreviewPurok, CustomWasteType, ObstructionCoverage, WaterFlowCondition, WaterLevel,
} from "@/types/report"

const MUNICIPALITY = "Rosario, La Union" // used when the barangay record has no municipality
type Cat = "Before_Clearing" | "After_Clearing" | "Additional_Evidence"
type CustomRow = { type: CustomWasteType; kg: string }

const inp = "w-full rounded-lg border border-[#64748B]/70 bg-[#F8FAFB] px-3 py-2 text-[13px] text-[#122A48] outline-none placeholder:text-[#94A3B8] focus:border-[#1565C0] focus:ring-2 focus:ring-[#1565C0]/15"

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const emptyWaste = () => Object.fromEntries(WASTE_CATEGORIES.map(c => [c.key, ""])) as Record<WasteKey, string>

// one card per section, same look as the other web forms: icon tile, title + subtitle, divider, body
function Section({ icon, title, subtitle, children }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#d5dde5] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <header className="flex items-center gap-3 px-3.5 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#cfe5e0] text-[#1565C0]">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#122A48]">{title}</h2>
          <p className="text-xs text-[#64748B]">{subtitle}</p>
        </div>
      </header>
      <div className="border-t border-[#e8edf2] p-4">{children}</div>
    </section>
  )
}

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#122A48]">
      {children} {required && <span className="text-[#dc2626]">*</span>}
    </label>
  )
}

function Locked({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#CBD5E1] bg-[#EEF2F6] px-3 py-2 text-[13px] text-[#64748B]">
      <Lock size={14} /> {value || "—"}
    </div>
  )
}

const money = (v: string) => (v === "" || isNaN(Number(v)) ? 0 : Number(v))

export function ReportForm({ reportId }: { reportId: number | null }) {
  const router = useRouter()
  const { toasts, addToast, removeToast } = useToast()

  const [loading, setLoading] = useState(!!reportId)
  const [busy, setBusy] = useState<"draft" | "complete" | null>(null)
  const [barangay, setBarangay] = useState("")
  const [municipality, setMunicipality] = useState(MUNICIPALITY)

  const [date, setDate] = useState(toLocalInput(new Date()))
  const [waste, setWaste] = useState<Record<WasteKey, string>>(emptyWaste())
  const [custom, setCustom] = useState<CustomRow[]>([])
  const [personnel, setPersonnel] = useState("")
  const [action, setAction] = useState("")
  const [remarks, setRemarks] = useState("")
  const [manual, setManual] = useState<{ water: WaterLevel | null; obstruction: ObstructionCoverage | null; flow: WaterFlowCondition | null }>({ water: null, obstruction: null, flow: null })
  const [photos, setPhotos] = useState<Record<Cat, PhotoItem[]>>({ Before_Clearing: [], After_Clearing: [], Additional_Evidence: [] })
  const [removedMedia, setRemovedMedia] = useState<number[]>([])

  const [puroks, setPuroks] = useState<CleanupPreviewPurok[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [wasteTypes, setWasteTypes] = useState<CustomWasteType[]>([])

  // modals
  const [addWasteOpen, setAddWasteOpen] = useState(false)
  const [missing, setMissing] = useState<string[]>([])
  const [nothingToSave, setNothingToSave] = useState(false)
  const [draftSaved, setDraftSaved] = useState<number | null>(null)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  // who am I: barangay name for the locked field (new reports have no barangay_details yet)
  useEffect(() => {
    const u: any = getUser()
    setBarangay(u?.barangay_name ?? u?.barangay_details?.barangay_name ?? u?.barangay?.barangay_name ?? "")
  }, [])

  useEffect(() => { getCustomWasteTypes().then(setWasteTypes).catch(() => setWasteTypes([])) }, [])

  // continue a draft
  useEffect(() => {
    if (!reportId) return
    getReport(reportId)
      .then(r => {
        setBarangay(r.barangay_details?.barangay_name ?? "")
        setMunicipality((r.barangay_details as any)?.municipality ?? MUNICIPALITY)
        const when = r.date_responded ?? r.date_observed
        if (when) setDate(toLocalInput(new Date(when)))
        const w = emptyWaste()
        WASTE_CATEGORIES.forEach(c => { const v = r[c.key]; w[c.key] = v ? String(v) : "" })
        setWaste(w)
        setCustom(r.custom_waste.map(c => ({
          type: { waste_type_id: c.waste_type, name: c.waste_type_name, status: c.waste_type_status },
          kg: String(c.weight_kg),
        })))
        setPersonnel(r.assigned_personnel ?? "")
        setAction(r.action_taken ?? "")
        setRemarks(r.remarks ?? "")
        setManual({ water: r.overall_water_level, obstruction: r.overall_obstruction_coverage, flow: r.overall_water_flow_condition })
        const grouped: Record<Cat, PhotoItem[]> = { Before_Clearing: [], After_Clearing: [], Additional_Evidence: [] }
        r.media.forEach(m => {
          if (m.file_url) grouped[m.media_category].push({ id: `m${m.media}`, url: m.file_url, mediaId: m.media })
        })
        setPhotos(grouped)
      })
      .catch(() => addToast("Failed to load this report.", "error"))
      .finally(() => setLoading(false))
  }, [reportId])

  // sensor summary for the 7 days before the chosen cleanup date
  useEffect(() => {
    if (!date) return
    setPreviewLoading(true)
    getCleanupPreview(new Date(date).toISOString())
      .then(setPuroks)
      .catch(() => setPuroks([]))
      .finally(() => setPreviewLoading(false))
  }, [date])

  const hasSensorData = puroks.some(p => p.has_sensor_data)
  const needsManual = puroks.length > 0 && !hasSensorData
  const isSaturday = new Date(date).getDay() === 6

  const totalKg = useMemo(
    () => WASTE_CATEGORIES.reduce((s, c) => s + money(waste[c.key]), 0) + custom.reduce((s, c) => s + money(c.kg), 0),
    [waste, custom]
  )

  const allPhotos = [...photos.Before_Clearing, ...photos.After_Clearing, ...photos.Additional_Evidence]

  const setKg = (key: WasteKey, v: string) => { if (/^\d*\.?\d{0,2}$/.test(v)) setWaste(w => ({ ...w, [key]: v })) }

  const addFiles = (cat: Cat, files: File[]) =>
    setPhotos(p => ({
      ...p,
      [cat]: [...p[cat], ...files.map(file => ({ id: crypto.randomUUID(), url: URL.createObjectURL(file), file }))],
    }))

  const removePhoto = (cat: Cat, id: string) => {
    const item = photos[cat].find(p => p.id === id)
    if (item?.mediaId) setRemovedMedia(r => [...r, item.mediaId!])
    if (item?.file) URL.revokeObjectURL(item.url)
    setPhotos(p => ({ ...p, [cat]: p[cat].filter(x => x.id !== id) }))
  }

  const hasAnyData =
    totalKg > 0 || custom.length > 0 || personnel.trim() !== "" || action.trim() !== "" || remarks.trim() !== "" ||
    allPhotos.length > 0 || manual.water !== null || manual.obstruction !== null || manual.flow !== null

  const missingFields = (): string[] => {
    const m: string[] = []
    if (needsManual) {
      if (!manual.water) m.push("Overall water level")
      if (!manual.obstruction) m.push("Overall obstruction")
      if (!manual.flow) m.push("Overall water flow")
    }
    if (!personnel.trim()) m.push("Assigned personnel")
    if (!action.trim()) m.push("Action taken")
    if (totalKg <= 0) m.push("Waste composition (at least one category)")
    if (photos.Before_Clearing.length === 0) m.push("Before Cleanup photo")
    if (photos.After_Clearing.length === 0) m.push("After Cleanup photo")
    return m
  }

  const buildValues = (): ReportFormValues => ({
    dateISO: new Date(date).toISOString(),
    waste: Object.fromEntries(WASTE_CATEGORIES.map(c => [c.key, money(waste[c.key])])) as Record<WasteKey, number>,
    custom: custom.map(c => ({ waste_type: c.type.waste_type_id, weight_kg: money(c.kg) })),
    assigned_personnel: personnel.trim(),
    action_taken: action.trim(),
    remarks: remarks.trim(),
    totalKg,
    manualCondition: needsManual ? manual : null, // sensors fill the condition when there is data
    newPhotos: (Object.keys(photos) as Cat[]).flatMap(cat => photos[cat].filter(p => p.file).map(p => ({ file: p.file!, category: cat }))),
    removedMediaIds: removedMedia,
  })

  const saveDraft = async () => {
    if (!hasAnyData) { setNothingToSave(true); return }
    setBusy("draft")
    try {
      const saved = await saveReport(reportId, buildValues(), false)
      setDraftSaved(saved.report_id)
    } catch (err) {
      addToast(errorMessage(err, "Failed to save the draft. Please try again."), "error")
    } finally {
      setBusy(null)
    }
  }

  const completeAndReview = async () => {
    const m = missingFields()
    if (m.length > 0) { setMissing(m); return }
    setBusy("complete")
    try {
      const saved = await saveReport(reportId, buildValues(), true)
      router.push(ROUTES.view(saved.report_id))
    } catch (err) {
      addToast(errorMessage(err, "Failed to save the report. Please try again."), "error")
      setBusy(null)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><SpinnerIcon size={32} color="#16a34a" /></div>

  const mediaStart: Record<Cat, number> = {
    Before_Clearing: 0,
    After_Clearing: photos.Before_Clearing.length,
    Additional_Evidence: photos.Before_Clearing.length + photos.After_Clearing.length,
  }

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <button type="button" onClick={() => router.push(ROUTES.list)} className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#122A48] hover:opacity-70">
          <ArrowLeft size={18} /> Weekly Cleanup Report
        </button>

        {/* cleanup details */}
        <Section icon={<ClipboardList size={20} />} title="Cleanup Details" subtitle="Where and when the cleanup took place">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Barangay</Label><Locked value={barangay} /></div>
            <div><Label>Municipality</Label><Locked value={municipality} /></div>
            <div>
              <Label required>Date / Time of the Cleanup</Label>
              <input type="datetime-local" value={date} max={toLocalInput(new Date())} onChange={(e) => setDate(e.target.value)} className={inp} />
              {!isSaturday && <p className="mt-1 text-xs text-[#b45309]">This date is not a Saturday. You can still continue.</p>}
            </div>
          </div>
        </Section>

        {/* canal condition */}
        <Section icon={<Waves size={20} />} title="Overall Canal Condition" subtitle="Sensor readings for the 7 days before the cleanup">
          <p className="mb-3 text-xs text-[#64748B]">Taken from your sensors for the 7 days before the cleanup. Puroks without sensors are not counted.</p>
          <CleanupSummary
            puroks={puroks}
            loading={previewLoading}
            manual={manual}
            onManualChange={(patch) => setManual(m => ({
              water: patch.waterLevel ?? m.water,
              obstruction: patch.obstructionCoverage ?? m.obstruction,
              flow: patch.waterFlowCondition ?? m.flow,
            }))}
          />
        </Section>

        {/* waste composition */}
        <Section icon={<Trash2 size={20} />} title="Waste Composition" subtitle="Estimated weight per category, in kg">
          <p className="mb-3 text-xs text-[#64748B]">Estimate what was in the canal. Anything left blank is recorded as 0 when you submit. Waste Collected is totaled automatically.</p>
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
            <p className="mb-1 text-xs font-bold text-[#334155]">By Category (kg)</p>
            <p className="mb-4 text-[11px] leading-4 text-[#94a3b8]">{WASTE_HINT}</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {WASTE_CATEGORIES.map(c => (
                <div key={c.key}>
                  <Label>{c.label} (kg)</Label>
                  <input inputMode="decimal" placeholder="0.00" value={waste[c.key]} onChange={(e) => setKg(c.key, e.target.value)} className={inp} />
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-[#e2e8f0] pt-4">
              <p className="mb-1 text-xs font-bold text-[#334155]">Other Waste (kg)</p>
              <p className="mb-3 text-[11px] leading-4 text-[#94a3b8]">
                Anything not listed above, like wood or a mattress. Types you add are saved for your next report, and other barangays see them once MENRO approves.
              </p>
              {custom.map((row, i) => (
                <div key={row.type.waste_type_id} className="mb-2 flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#122A48]">
                    {row.type.name}
                    {row.type.status === "Pending" && <span className="ml-2 text-[10px] font-semibold text-[#b45309]">Pending approval</span>}
                  </span>
                  <input
                    inputMode="decimal" placeholder="0.00" value={row.kg}
                    onChange={(e) => /^\d*\.?\d{0,2}$/.test(e.target.value) && setCustom(c => c.map((x, j) => (j === i ? { ...x, kg: e.target.value } : x)))}
                    className={`${inp} w-32`}
                  />
                  <button type="button" aria-label="Remove" onClick={() => setCustom(c => c.filter((_, j) => j !== i))} className="cursor-pointer rounded-full p-1.5 text-[#94a3b8] hover:bg-[#fee2e2] hover:text-[#dc2626]">
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAddWasteOpen(true)}
                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#16a34a] bg-white py-2.5 text-[13px] font-semibold text-[#15803d] hover:bg-[#f0fdf4]"
              >
                <Plus size={16} /> Add other waste
              </button>
            </div>
          </div>
        </Section>

        {/* barangay response */}
        <Section icon={<UserCheck size={20} />} title="Barangay Response" subtitle="Who did the cleanup and what was done">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label required>Assigned Personnel</Label>
              <input value={personnel} onChange={(e) => setPersonnel(e.target.value)} placeholder="Who carried out the cleanup" className={inp} />
            </div>
            <div>
              <Label>Waste Collected (auto total)</Label>
              <Locked value={`${totalKg.toFixed(2)} kg`} />
            </div>
            <div className="md:col-span-2">
              <Label required>Action Taken</Label>
              <textarea value={action} onChange={(e) => setAction(e.target.value)} placeholder="Describe what was done to clear the canal..." className={`${inp} min-h-24 resize-y`} />
            </div>
            <div className="md:col-span-2">
              <Label>Remarks</Label>
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Purok 5 has no sensor. Canal was mostly clear, only a few leaves." className={`${inp} min-h-20 resize-y`} />
              <p className="mt-1.5 text-[11px] leading-4 text-[#94a3b8]">
                Puroks without sensors aren&apos;t part of the summary above. If you want to report on them, describe their canal condition here, along with anything else worth noting.
              </p>
            </div>
          </div>
        </Section>

        {/* photos */}
        <Section icon={<Upload size={20} />} title="Photos" subtitle="Before and after shots of the canal">
          <div className="grid gap-x-6 md:grid-cols-3">
            {MEDIA_CATEGORIES.map(c => (
              <PhotoField
                key={c.value}
                label={c.label}
                required={c.required}
                items={photos[c.value]}
                onAdd={(files) => addFiles(c.value, files)}
                onRemove={(id) => removePhoto(c.value, id)}
                onPreview={(id) => setPreviewIndex(mediaStart[c.value] + photos[c.value].findIndex(p => p.id === id))}
              />
            ))}
          </div>
        </Section>

        {/* actions: right-aligned, primary last */}
        <div className="flex flex-col-reverse gap-2.5 pb-6 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => router.push(ROUTES.list)} disabled={busy !== null} className="cursor-pointer border-[#cbd5e1] font-medium text-[#475569]">
            Cancel
          </Button>
          <Button variant="outline" onClick={saveDraft} disabled={busy !== null} className="cursor-pointer border-[#cbd5e1] font-semibold text-[#475569]">
            {busy === "draft" ? <SpinnerIcon size={16} color="#475569" /> : <Save size={16} className="mr-1.5" />}
            Save Draft
          </Button>
          <Button onClick={completeAndReview} disabled={busy !== null} className="cursor-pointer bg-[#1565C0] font-semibold text-white hover:bg-[#0f4c94]">
            {busy === "complete" ? <SpinnerIcon size={16} color="#fff" /> : <Check size={16} className="mr-1.5" />}
            Complete &amp; Review
          </Button>
        </div>
      </div>

      <AddOtherWasteModal
        open={addWasteOpen}
        onClose={() => setAddWasteOpen(false)}
        wasteTypes={wasteTypes}
        excludeIds={custom.map(c => c.type.waste_type_id)}
        onPick={(t) => setCustom(c => [...c, { type: t, kg: "" }])}
        onCreated={(t) => { setWasteTypes(w => [...w, t]); setCustom(c => [...c, { type: t, kg: "" }]) }}
      />

      <IncompleteReportModal open={missing.length > 0} missingFields={missing} onClose={() => setMissing([])} />

      <NoticeModal
        open={nothingToSave}
        title="Nothing to save"
        message="Fill in something first, then save it as a draft."
        onClose={() => setNothingToSave(false)}
      />

      <NoticeModal
        open={draftSaved !== null}
        title="Draft Saved"
        message="You can continue this report anytime from the Reports page, on any device signed in to your barangay account."
        icon={<Save size={24} color="#16a34a" />}
        iconBg="#dcfce7"
        onClose={() => router.push(ROUTES.list)}
      />

      <PhotoPreviewModal
        open={previewIndex !== null}
        photos={allPhotos.map(p => ({ uri: p.url }))}
        initialIndex={previewIndex ?? 0}
        onClose={() => setPreviewIndex(null)}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  )
}