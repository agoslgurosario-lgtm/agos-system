"use client"

import { useEffect, useRef, useState } from "react"
import { Check, MapPinOff, MapPinPlus, Pencil, Trash2, Upload, X } from "lucide-react"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import { point } from "@turf/helpers"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import { DialogModal } from "@/components/DialogModal"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { DIALOG_COLOR } from "@/lib/constant"
import { api } from "@/lib/api"
import { fetchBarangayBoundaryById } from "@/lib/barangayBoundary"
import { DEFAULT_PUROK_COUNT, MAX_PUROK_COUNT } from "@/lib/purok"

type BarangayLite = {
  barangay_id: number
  barangay_name: string
  latitude: number
  longitude: number
  purok_count?: number
}

type Props = {
  open: boolean
  barangay: BarangayLite | null
  existingNames: string[]
  onClose: () => void
  onSaved: (saved: any, mode: "add" | "edit") => void
}

type BoundaryAction = "keep" | "replace" | "remove"

const round6 = (n: number) => Math.round(n * 1e6) / 1e6

function collect(coords: any, out: number[][]) {
  if (!Array.isArray(coords)) return
  if (typeof coords[0] === "number") { out.push(coords as number[]); return }
  coords.forEach(c => collect(c, out))
}

// Accepts Polygon / MultiPolygon, a single Feature, or a FeatureCollection with exactly one Feature.
function readOutline(raw: any): { geometry: any; center: [number, number] } | { error: string } {
  let obj = raw
  if (obj?.type === "FeatureCollection") {
    if (!Array.isArray(obj.features) || obj.features.length !== 1) {
      return { error: "The file must contain exactly one barangay outline." }
    }
    obj = obj.features[0]
  }
  const geometry = obj?.type === "Feature" ? obj.geometry : obj
  if (!geometry || (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon")) {
    return { error: "The outline must be a Polygon or MultiPolygon." }
  }

  const pts: number[][] = []
  collect(geometry.coordinates, pts)
  if (pts.length < 4) return { error: "The outline has too few points." }

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity
  for (const p of pts) {
    const lng = p[0], lat = p[1]
    if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
      return { error: "Coordinates must be longitude/latitude (WGS84)." }
    }
    minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat)
    minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng)
  }
  return { geometry, center: [round6((minLat + maxLat) / 2), round6((minLng + maxLng) / 2)] }
}

function parseCoord(value: string, lo: number, hi: number): number | null {
  if (value.trim() === "") return null
  const n = Number(value)
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null
}

export function BarangayFormDialog({ open, barangay, existingNames, onClose, onSaved }: Props) {
  const isEdit = !!barangay
  const fileRef = useRef<HTMLInputElement>(null)
  const uploadCount = useRef(0)

  const [name, setName] = useState("")
  const [lat, setLat] = useState("")
  const [lng, setLng] = useState("")
  const [purokCount, setPurokCount] = useState(String(DEFAULT_PUROK_COUNT))
  const [boundary, setBoundary] = useState<any>(null)
  const [boundaryAction, setBoundaryAction] = useState<BoundaryAction>("keep")
  const [fileName, setFileName] = useState("")
  const [boundaryLoading, setBoundaryLoading] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState("")
  const [discardOpen, setDiscardOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [outsideOpen, setOutsideOpen] = useState(false)
  const [outsideList, setOutsideList] = useState<{ hotspot_id: number; name: string }[]>([])

  // reset every time the dialog opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setName(barangay?.barangay_name ?? "")
    setLat(barangay ? String(barangay.latitude) : "")
    setLng(barangay ? String(barangay.longitude) : "")
    setPurokCount(String(barangay?.purok_count ?? DEFAULT_PUROK_COUNT))
    setBoundary(null)
    setBoundaryAction("keep")
    setFileName("")
    setErrors({})
    setFormError("")
    setDiscardOpen(false)
    setConfirmOpen(false)
    setSubmitting(false)
    setOutsideOpen(false)
    setOutsideList([])

    if (barangay) {
      setBoundaryLoading(true)
      fetchBarangayBoundaryById(barangay.barangay_id, barangay.barangay_name).then(g => {
        if (cancelled) return
        setBoundary(g)
        setBoundaryLoading(false)
      })
    } else {
      setBoundaryLoading(false)
    }
    return () => { cancelled = true }
  }, [open, barangay?.barangay_id])

  const latNum = parseCoord(lat, -90, 90)
  const lngNum = parseCoord(lng, -180, 180)
  const purokNum =
    /^\d+$/.test(purokCount.trim()) && Number(purokCount) >= 1 && Number(purokCount) <= MAX_PUROK_COUNT
      ? Number(purokCount)
      : null
  const trimmed = name.trim()
  const renamed = isEdit && trimmed !== barangay!.barangay_name

  const outside =
    !!boundary && latNum != null && lngNum != null &&
    !booleanPointInPolygon(point([lngNum, latNum]), boundary)

  const dirty = isEdit
    ? renamed ||
      latNum !== barangay!.latitude ||
      lngNum !== barangay!.longitude ||
      purokNum !== (barangay!.purok_count ?? DEFAULT_PUROK_COUNT) ||
      boundaryAction !== "keep"
    : !!(trimmed || lat || lng || purokCount !== String(DEFAULT_PUROK_COUNT) || boundaryAction !== "keep")

  const requestClose = () => {
    if (submitting) return
    if (dirty) setDiscardOpen(true)
    else onClose()
  }

  const clearError = (key: string) => setErrors(prev => (prev[key] ? { ...prev, [key]: "" } : prev))

  const handleMapClick = (la: number, ln: number) => {
    setLat(la.toFixed(6))
    setLng(ln.toFixed(6))
    clearError("latitude"); clearError("longitude")
  }

  const handleFile = async (file: File | undefined | null) => {
    if (!file) return
    clearError("boundary")
    if (file.size > 2_000_000) {
      setErrors(prev => ({ ...prev, boundary: "The file is too large (max 2 MB)." }))
      return
    }
    let raw: any
    try {
      raw = JSON.parse(await file.text())
    } catch {
      setErrors(prev => ({ ...prev, boundary: "The file is not valid JSON/GeoJSON." }))
      return
    }
    const res = readOutline(raw)
    if ("error" in res) {
      setErrors(prev => ({ ...prev, boundary: res.error }))
      return
    }
    uploadCount.current += 1
    // unique label so the map redraws when a different file is uploaded
    setBoundary({ type: "Feature", properties: { adm4_en: `upload-${uploadCount.current}` }, geometry: res.geometry })
    setBoundaryAction("replace")
    setFileName(file.name)
    setLat(String(res.center[0]))
    setLng(String(res.center[1]))
    clearError("latitude"); clearError("longitude")
  }

  const removeOutline = () => {
    setBoundary(null)
    setFileName("")
    setBoundaryAction(isEdit ? "remove" : "keep")
    clearError("boundary")
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!trimmed) e.barangay_name = "Barangay name is required."
    else if (trimmed.length > 100) e.barangay_name = "Name must be 100 characters or fewer."
    else if (trimmed.toLowerCase() === "admin") e.barangay_name = "This name is reserved."
    else if (existingNames.some(n => n.trim().toLowerCase() === trimmed.toLowerCase())) {
      e.barangay_name = "A barangay with this name already exists."
    }
    if (latNum == null) e.latitude = "Enter a valid latitude, or click the map."
    if (lngNum == null) e.longitude = "Enter a valid longitude, or click the map."
    if (purokNum == null) e.purok_count = `Enter a number from 1 to ${MAX_PUROK_COUNT}.`
    return e
  }

  const buildPayload = (confirmOutside = false) => {
    if (!isEdit) {
      const p: any = { barangay_name: trimmed, latitude: latNum, longitude: lngNum, purok_count: purokNum }
      if (boundaryAction === "replace") p.boundary = boundary
      return p
    }
    const p: any = {}
    if (renamed) p.barangay_name = trimmed
    if (latNum !== barangay!.latitude) p.latitude = latNum
    if (lngNum !== barangay!.longitude) p.longitude = lngNum
    if (purokNum !== (barangay!.purok_count ?? DEFAULT_PUROK_COUNT)) p.purok_count = purokNum
    if (boundaryAction === "replace") p.boundary = boundary
    if (boundaryAction === "remove") p.boundary = null
    if (confirmOutside) p.confirm_outside_hotspots = true
    return p
  }

  const handleSave = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) { setFormError("Please fix the highlighted fields."); return }
    if (isEdit && Object.keys(buildPayload()).length === 0) { setFormError("No changes to save."); return }
    setFormError("")
    setConfirmOpen(true)
  }

  const handleSubmit = async (confirmOutside = false) => {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      const payload = buildPayload(confirmOutside)
      const saved = isEdit
        ? await api.patch(`/api/barangays/${barangay!.barangay_id}/`, payload)
        : await api.post("/api/barangays/", payload)
      setSubmitting(false)
      onSaved(saved, isEdit ? "edit" : "add")
    } catch (err: any) {
      setSubmitting(false)
      if (err?.outside_hotspots?.length) {
        setOutsideList(err.outside_hotspots)
        setOutsideOpen(true)
        return
      }
      const fe: Record<string, string> = {}
      for (const k of ["barangay_name", "latitude", "longitude", "purok_count", "boundary"]) {
        if (err?.[k]) fe[k] = String(err[k])
      }
      setErrors(fe)
      setFormError(
        err?.detail ?? err?.error ??
        (Object.keys(fe).length ? "Please fix the highlighted fields." : "Failed to save. Please try again.")
      )
    }
  }

  const title = isEdit ? "Edit Barangay" : "Add Barangay"

  return (
    <>
      <Dialog open={open}>
        <DialogContent className="overflow-hidden [&>button]:hidden p-0 gap-0 flex flex-col text-[#122A48] min-w-80 md:min-w-[960px] max-h-[92vh]">
          <DialogHeader className="shrink-0">
            <div className="flex items-start justify-between gap-3 p-4 md:p-5">
              <div className="flex gap-3 min-w-0">
                <div className="flex-shrink-0 self-start rounded-lg p-2 md:p-2.5 text-white bg-[#1565BC]">
                  {isEdit ? <Pencil className="md:h-7.5 md:w-7.5" /> : <MapPinPlus className="md:h-7.5 md:w-7.5" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="font-bold text-base md:text-lg">{title}</p>
                  <p className="text-[10px] md:text-sm">
                    {isEdit
                      ? `Update the details of ${barangay!.barangay_name}.`
                      : "Add a new barangay. Click the map for its center point and optionally upload its outline."}
                  </p>
                </div>
              </div>
              <button type="button" onClick={requestClose} className="cursor-pointer flex-shrink-0">
                <X size={18} />
              </button>
            </div>
          </DialogHeader>
          <DialogTitle className="sr-only">{title}</DialogTitle>

          <div className="flex flex-col md:flex-row md:h-[480px] min-h-0 border-t border-[#C6C6C8] max-md:overflow-y-auto">
            {/* map */}
            <div className="md:w-[55%] p-3 flex flex-col min-h-[320px] md:min-h-0">
              <p className="font-semibold text-xs md:text-sm">Center point</p>
              <p className={`text-[10px] md:text-xs mt-0.5 ${outside ? "text-[#E65100]" : "text-[#727272]"}`}>
                {outside
                  ? "This point is outside the outline. Click inside the highlighted area, or keep it if that is intended."
                  : boundaryLoading
                    ? "Loading outline..."
                    : "Click the map to set the center point."}
              </p>
              <div className="flex-1 min-h-[200px] mt-2 rounded-lg border border-[#C6C6C8] overflow-hidden">
                <AgosMapWrapper
                  latitude={latNum ?? undefined}
                  longitude={lngNum ?? undefined}
                  label={trimmed || "New barangay"}
                  zoom={boundary ? 14 : latNum != null ? 15 : 13}
                  onMapClick={handleMapClick}
                  boundaryGeoJson={boundary}
                  showLegend={false}
                />
              </div>
            </div>

            {/* form */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 border-t md:border-t-0 md:border-l border-[#C6C6C8]">
              <Field className="flex gap-1.5 flex-col">
                <FieldLabel className="text-[#122A48] text-[11px]">BARANGAY NAME *</FieldLabel>
                <Input
                  value={name}
                  maxLength={100}
                  onChange={e => { setName(e.target.value); clearError("barangay_name") }}
                  placeholder="e.g. Barangay name"
                  className={`text-[#122A48] rounded-lg text-xs !font-normal md:h-9 bg-[#1565BC05] ${errors.barangay_name ? "border-[#FF0000]" : "border-[#727272]"}`}
                />
                <FieldError className="text-xs">{errors.barangay_name}</FieldError>
                {renamed && !errors.barangay_name && (
                  <p className="text-[11px] text-[#E65100]">
                    Renaming changes the name everywhere in the system, including past records and this barangay&apos;s hotspot names.
                  </p>
                )}
              </Field>

              <div className="flex gap-3">
                {([
                  ["LATITUDE *", lat, setLat, "latitude"],
                  ["LONGITUDE *", lng, setLng, "longitude"],
                ] as const).map(([label, value, setter, key]) => (
                  <Field key={key} className="flex gap-1.5 flex-col flex-1">
                    <FieldLabel className="text-[#122A48] text-[11px]">{label}</FieldLabel>
                    <Input
                      value={value}
                      onChange={e => { setter(e.target.value); clearError(key) }}
                      placeholder="from map"
                      className={`text-[#122A48] rounded-lg text-xs !font-normal md:h-9 bg-[#1565BC05] ${errors[key] ? "border-[#FF0000]" : "border-[#727272]"}`}
                    />
                    <FieldError className="text-xs">{errors[key]}</FieldError>
                  </Field>
                ))}
              </div>

              <Field className="flex gap-1.5 flex-col">
                <FieldLabel className="text-[#122A48] text-[11px]">NUMBER OF PUROKS *</FieldLabel>
                <Input
                  type="number"
                  min={1}
                  max={MAX_PUROK_COUNT}
                  value={purokCount}
                  onChange={e => { setPurokCount(e.target.value); clearError("purok_count") }}
                  className={`text-[#122A48] rounded-lg text-xs !font-normal md:h-9 bg-[#1565BC05] w-32 ${errors.purok_count ? "border-[#FF0000]" : "border-[#727272]"}`}
                />
                <FieldError className="text-xs">{errors.purok_count}</FieldError>
                <p className="text-[11px] text-[#727272]">
                  Hotspots in this barangay can be placed in Purok 1 up to this number.
                </p>
              </Field>

              <div className="flex flex-col gap-2 rounded-lg border border-[#C6C6C8] p-3">
                <p className="font-semibold text-xs">Barangay outline (optional)</p>
                <p className="text-[11px] text-[#727272]">
                  Upload a GeoJSON file (.json or .geojson) with one barangay outline. Without it, the barangay shows as a pin only.
                  Uploading also moves the center point to the middle of the outline.
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".json,.geojson,application/json,application/geo+json"
                  className="hidden"
                  onChange={e => { handleFile(e.target.files?.[0]); e.target.value = "" }}
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <Button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="cursor-pointer rounded-lg border border-[#C6C6C8] bg-[#FAFCFD] hover:bg-[#d6e4eb] text-[#122A48] text-xs px-3 py-3.5 gap-2"
                  >
                    <Upload size={14} /> {boundary ? "Replace outline" : "Upload GeoJSON"}
                  </Button>
                  {boundary && (
                    <Button
                      type="button"
                      onClick={removeOutline}
                      className="cursor-pointer rounded-lg border border-[#C6C6C8] bg-[#FFE5E5] hover:bg-[#ffd0d0] text-[#D81010] text-xs px-3 py-3.5 gap-2"
                    >
                      <Trash2 size={14} /> Remove outline
                    </Button>
                  )}
                </div>

                <p className={`text-[11px] ${errors.boundary ? "text-[#D81010]" : boundary ? "text-[#2C7B3C] font-medium" : "text-[#727272]"}`}>
                  {errors.boundary ||
                    (boundary
                      ? boundaryAction === "replace" ? `Outline ready${fileName ? `: ${fileName}` : ""}` : "Outline loaded"
                      : boundaryAction === "remove" ? "Outline will be removed when you save." : "No outline.")}
                </p>
              </div>

              {!isEdit && (
                <p className="text-[11px] text-[#727272]">
                  New barangays start as <strong>Unregistered</strong>. Register it from the list when it is ready for sensor nodes.
                </p>
              )}
            </div>
          </div>

          {/* footer */}
          <div className="shrink-0 flex items-center justify-between gap-3 p-4 border-t border-[#C6C6C8]">
            <p className={`text-xs ${formError ? "text-[#D81010]" : "text-[#727272]"}`}>{formError}</p>
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={requestClose}
                disabled={submitting}
                className="cursor-pointer hover:bg-[#e3ecf0] bg-[#FAFCFD] border border-[#C6C6C8] text-xs md:text-sm rounded-lg px-5 py-4 text-[#727272]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="cursor-pointer hover:bg-[#12569f] rounded-lg text-xs md:text-sm px-4 py-4 bg-[#1565BC] min-w-[130px]"
              >
                <Check /> {isEdit ? "Save Changes" : "Add Barangay"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DialogModal
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={() => { setDiscardOpen(false); onClose() }}
        color={DIALOG_COLOR.lightred}
        icon={X}
        iconColor={DIALOG_COLOR.red}
        title="Discard Changes?"
        description="Your unsaved changes will be lost."
        cancelLabel="Keep Editing"
        confirmLabel="Discard"
      />

      <DialogModal
        open={outsideOpen}
        onClose={() => setOutsideOpen(false)}
        onConfirm={() => { setOutsideOpen(false); handleSubmit(true) }}
        color={DIALOG_COLOR.lightorange}
        icon={MapPinOff}
        iconColor={DIALOG_COLOR.orange}
        title="Hotspots Outside New Outline"
        description={
          <>
            The new outline leaves <strong>{outsideList.length}</strong> active hotspot{outsideList.length === 1 ? "" : "s"} outside this barangay:
            <br />
            {outsideList.slice(0, 8).map(h => h.name).join(", ")}
            {outsideList.length > 8 ? `, and ${outsideList.length - 8} more` : ""}
            <br /><br />
            They will keep working and keep their history, but they will sit outside the barangay&apos;s area. Save anyway?
          </>
        }
        cancelLabel="Go Back"
        confirmLabel="Save Anyway"
      />

      <DialogModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => handleSubmit()}
        color={DIALOG_COLOR.lightgreen}
        icon={isEdit ? Pencil : MapPinPlus}
        iconColor={DIALOG_COLOR.green}
        title={isEdit ? "Confirm Changes" : "Confirm New Barangay"}
        description={
          !isEdit ? (
            <>Add <strong>{trimmed}</strong> as a new barangay? It will start as Unregistered.</>
          ) : renamed ? (
            <>
              Rename <strong>{barangay!.barangay_name}</strong> to <strong>{trimmed}</strong>? The new name will appear
              everywhere in the system, including past records, and its hotspot names will be updated to match.
            </>
          ) : (
            <>Save the changes to <strong>{barangay!.barangay_name}</strong>?</>
          )
        }
        cancelLabel="Go Back"
        confirmLabel={isEdit ? "Save" : "Add Barangay"}
      />

      <DialogModal
        open={submitting}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title="Saving Barangay"
        description="Saving, please wait..."
      />
    </>
  )
}