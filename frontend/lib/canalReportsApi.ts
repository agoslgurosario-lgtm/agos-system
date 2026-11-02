// Every request the report pages make lives in this file.
// Endpoints marked GUESS are not in the files you sent me. Match them to your Django urls.
import { fetchWithAuth } from "@/lib/auth"
import type { WasteKey } from "@/lib/wasteCategories"
import type {
  CanalMonitoringReport, CleanupPreviewPurok, CustomWasteType,
  WaterLevel, ObstructionCoverage, WaterFlowCondition,
} from "@/types/report"
import type { PeriodInfo } from "@/types/submissions"

const API = process.env.NEXT_PUBLIC_API_URL

// throws the parsed error body ({ error / detail }) when the request fails
async function parse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw data
  return data as T
}

export const errorMessage = (err: any, fallback: string) => err?.error ?? err?.detail ?? fallback

export const getReport = (id: string | number) =>
  fetchWithAuth(`${API}/api/canal-reports/${id}/`).then(r => parse<CanalMonitoringReport>(r))

export const getPeriods = () =>
  fetchWithAuth(`${API}/api/canal-reports/periods/`).then(r => parse<{ periods: PeriodInfo[] }>(r)).then(d => d.periods)

// GUESS: query param name for the cleanup date
export const getCleanupPreview = (dateISO: string) =>
  fetchWithAuth(`${API}/api/canal-reports/cleanup-preview/?date=${encodeURIComponent(dateISO)}`)
    .then(r => parse<{ puroks: CleanupPreviewPurok[] }>(r))
    .then(d => d.puroks)

// GUESS: list endpoint for saved waste types (the create endpoint is the one AddOtherWasteModal already uses)
export const getCustomWasteTypes = () =>
  fetchWithAuth(`${API}/api/custom-waste-types/`).then(r => parse<any>(r)).then(d => (d.results ?? d) as CustomWasteType[])

export const getSignatorySlots = () =>
  fetchWithAuth(`${API}/api/signatories/`).then(r => parse<{ position: string; active: { name: string } | null }[]>(r))

export type ReportFormValues = {
  dateISO: string
  waste: Record<WasteKey, number>
  custom: { waste_type: number; weight_kg: number }[]
  assigned_personnel: string
  action_taken: string
  remarks: string
  totalKg: number
  // only sent when no sensor data exists for the week
  manualCondition: { water: WaterLevel | null; obstruction: ObstructionCoverage | null; flow: WaterFlowCondition | null } | null
  newPhotos: { file: File; category: string }[]
  removedMediaIds: number[]
}

// GUESS: POST /api/canal-reports/ creates, PATCH /api/canal-reports/:id/ updates, multipart body.
// `complete: true` asks the backend to move the report past Draft (Complete & Review).
export async function saveReport(id: number | null, v: ReportFormValues, complete: boolean) {
  for (const mediaId of v.removedMediaIds) {
    await fetchWithAuth(`${API}/api/report-media/${mediaId}/`, { method: "DELETE" }) // GUESS
  }

  const fd = new FormData()
  fd.append("report_scope", "Barangay")
  fd.append("date_responded", v.dateISO)
  fd.append("date_observed", v.dateISO)
  Object.entries(v.waste).forEach(([k, n]) => fd.append(k, String(n)))
  fd.append("custom_waste", JSON.stringify(v.custom))
  fd.append("assigned_personnel", v.assigned_personnel)
  fd.append("action_taken", v.action_taken)
  fd.append("remarks", v.remarks)
  fd.append("waste_collected_amount", String(v.totalKg))
  fd.append("waste_collected_unit", "kg")
  fd.append("complete", String(complete))
  if (v.manualCondition) {
    const { water, obstruction, flow } = v.manualCondition
    if (water) fd.append("overall_water_level", water)
    if (obstruction) fd.append("overall_obstruction_coverage", obstruction)
    if (flow) fd.append("overall_water_flow_condition", flow)
  }
  v.newPhotos.forEach(p => {
    fd.append("media_files", p.file)
    fd.append("media_categories", p.category)
  })

  const res = await fetchWithAuth(`${API}/api/canal-reports/${id ? `${id}/` : ""}`, { method: id ? "PATCH" : "POST", body: fd })
  return parse<CanalMonitoringReport>(res)
}

const post = (path: string, body?: object) =>
  fetchWithAuth(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }).then(r => parse<any>(r))

export const verifyReport = (id: number) => post(`/api/canal-reports/${id}/verify/`) // GUESS
export const voidReport = (id: number, reason: string) => post(`/api/canal-reports/${id}/void/`, { reason }) // GUESS
export const submitPeriod = (period_start: string) => post(`/api/canal-reports/submit/`, { period_start }) // GUESS
