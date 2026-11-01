"use client"

import { useEffect, useRef, useState } from "react"
import { Check, MapPinPlus, Plus, Trash2, X } from "lucide-react"
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import { point } from "@turf/helpers"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import { DialogModal } from "@/components/DialogModal"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { DIALOG_COLOR } from "@/lib/constant"
import { api } from "@/lib/api"
import { fetchWithAuth } from "@/lib/auth"
import { fetchBarangayBoundaryById } from "@/lib/barangayBoundary"
import { PurokSelect } from "@/components/PurokSelect"

type Row = {
  id: number
  code: string
  description: string
  latitude: string
  longitude: string
  canalWidth: string
  canalShape: string
  sensorHeight: string
  canalDepth: string
  purok: string
}
type RowErrors = Record<string, string>

type Props = {
  open: boolean
  barangay: { barangay_id: number; barangay_name: string; latitude?: number | null; longitude?: number | null; purok_count?: number | null } | null
  existingMarkers?: any[]
  onClose: () => void
  onCreated: (created: any[]) => void
}

const MAX_ROWS = 50

// backend field name -> our field name
const API_FIELD: Record<string, string> = {
  code: "code",
  description: "description",
  latitude: "latitude",
  longitude: "longitude",
  purok: "purok",
  canal_width: "canalWidth",
  canal_shape: "canalShape",
  sensor_height: "sensorHeight",
  canal_depth: "canalDepth",
}

function TextField({
  label, value, onChange, error, placeholder, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void
  error?: string; placeholder?: string; type?: string
}) {
  return (
    <Field className="flex gap-1.5 flex-col flex-1">
      <FieldLabel className="text-[#122A48] text-[11px]">{label}</FieldLabel>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`text-[#122A48] rounded-lg text-xs !font-normal md:h-9 bg-[#1565BC05] ${error ? "border-[#FF0000]" : "border-[#727272]"}`}
      />
      <FieldError className="text-xs">{error}</FieldError>
    </Field>
  )
}

export function AddHotspotsDialog({ open, barangay, existingMarkers = [], onClose, onCreated }: Props) {
  const idRef = useRef(1)
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({})

  const makeRow = (code: string): Row => ({
    id: idRef.current++,
    code,
    description: "",
    latitude: "",
    longitude: "",
    purok: "",
    canalWidth: "",
    canalShape: "rectangular",
    sensorHeight: "",
    canalDepth: "",
  })

  const [rows, setRows] = useState<Row[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [errors, setErrors] = useState<Record<number, RowErrors>>({})
  const [formError, setFormError] = useState("")
  const [baseCode, setBaseCode] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const [boundary, setBoundary] = useState<any>(null)
  const [boundaryFallback, setBoundaryFallback] = useState(false)
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const [mapMessage, setMapMessage] = useState("")

  // reset every time the dialog opens
  useEffect(() => {
    if (!open || !barangay) return
    let cancelled = false

    const first = makeRow("")
    setRows([first])
    setActiveId(first.id)
    setErrors({})
    setFormError("")
    setMapMessage("")
    setSubmitting(false)
    setBaseCode(1)
    setBoundary(null)
    setBoundaryFallback(false)
    setBoundaryLoading(true)
    setConfirmOpen(false)
    setDeleteTarget(null)

    fetchBarangayBoundaryById(barangay.barangay_id, barangay.barangay_name).then(g => {
      if (cancelled) return
      if (g) setBoundary(g)
      else setBoundaryFallback(true)
      setBoundaryLoading(false)
    })

    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/next-code/?barangay=${barangay.barangay_id}`)
      .then(async res => {
        if (!res.ok) return
        const n = parseInt((await res.json()).next_code, 10)
        if (cancelled || isNaN(n)) return
        setBaseCode(n)
        setRows(prev => prev.map((r, i) => (i === 0 && !r.code ? { ...r, code: String(n) } : r)))
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [open, barangay?.barangay_id])

  // map messages disappear on their own
  useEffect(() => {
    if (!mapMessage) return
    const t = setTimeout(() => setMapMessage(""), 4000)
    return () => clearTimeout(t)
  }, [mapMessage])

  if (!barangay) return null

  const nextCode = () => {
    const nums = rows.map(r => parseInt(r.code, 10)).filter(n => !isNaN(n))
    return String(Math.max(baseCode - 1, ...nums) + 1)
  }

  const addRow = () => {
    if (rows.length >= MAX_ROWS) return
    const row = makeRow(nextCode())
    setRows(prev => [...prev, row])
    setActiveId(row.id)
    setTimeout(() => cardRefs.current[row.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50)
  }

  const removeRow = (id: number) => {
    const left = rows.filter(r => r.id !== id)
    setRows(left)
    setErrors(prev => { const { [id]: _drop, ...rest } = prev; return rest })
    if (activeId === id) setActiveId(left[left.length - 1]?.id ?? null)
  }

  const update = (id: number, field: keyof Row, value: string) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)))
    setErrors(prev => (prev[id]?.[field] ? { ...prev, [id]: { ...prev[id], [field]: "" } } : prev))
  }

  const handleMapClick = (lat: number, lng: number) => {
    if (activeId == null) return
    if (boundary && !boundaryFallback && !booleanPointInPolygon(point([lng, lat]), boundary)) {
      setMapMessage("That location is outside the barangay boundary. Please click inside the highlighted area.")
      return
    }
    setMapMessage("")
    setRows(prev => prev.map(r => (r.id === activeId ? { ...r, latitude: String(lat), longitude: String(lng) } : r)))
    setErrors(prev => (prev[activeId]?.latitude ? { ...prev, [activeId]: { ...prev[activeId], latitude: "" } } : prev))
  }

  const focusRow = (id: number) => {
    setActiveId(id)
    cardRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const validate = () => {
    const e: Record<number, RowErrors> = {}
    const seen = new Map<string, number>()
    rows.forEach((r, i) => {
      const re: RowErrors = {}
      const code = r.code.trim()
      if (!code) re.code = "This field is required."
      else if (!/^[A-Za-z0-9-]+$/.test(code)) re.code = "Only letters, numbers, and hyphens are allowed."
      else if (seen.has(code)) re.code = `Same code as hotspot #${seen.get(code)! + 1}.`
      else seen.set(code, i)

      if (!r.description.trim()) re.description = "This field is required."
      if (!r.latitude || !r.longitude) re.latitude = "Click the map to pin this hotspot."
      if (!r.purok) re.purok = "Select a purok."
      if (!r.canalWidth) re.canalWidth = "Required."
      if (!r.sensorHeight) re.sensorHeight = "Required."
      if (!r.canalDepth) re.canalDepth = "Required."
      if (Object.keys(re).length) e[r.id] = re
    })
    return e
  }

  const handleSave = () => {
    if (submitting) return
    const e = validate()
    setErrors(e)
    const firstBad = rows.find(r => e[r.id])
    if (firstBad) {
      setFormError("Please fix the highlighted hotspots before saving.")
      focusRow(firstBad.id)
      return
    }
    setFormError("")
    setConfirmOpen(true)
  }

  const handleSubmit = async () => {
    setConfirmOpen(false)
    setSubmitting(true)
    try {
      const res = await api.post("/api/hotspots/bulk/", {
        barangay: barangay.barangay_id,
        hotspots: rows.map(r => ({
          code: r.code.trim(),
          purok: parseInt(r.purok),
          description: r.description.trim(),
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
          canal_width: parseFloat(r.canalWidth),
          canal_shape: r.canalShape,
          sensor_height: parseFloat(r.sensorHeight),
          canal_depth: parseFloat(r.canalDepth),
        })),
      })
      onCreated(res.created ?? [])
    } catch (err: any) {
      // the backend validates everything first, so nothing was saved; show every problem
      const next: Record<number, RowErrors> = {}
      for (const item of err?.errors ?? []) {
        const row = rows[item.index]
        if (!row) continue
        next[row.id] = {}
        for (const [k, msg] of Object.entries(item.fields ?? {})) {
          next[row.id][API_FIELD[k] ?? "general"] = String(msg)
        }
      }
      setErrors(next)
      setFormError(err?.detail ?? err?.error ?? "Something went wrong. Nothing was saved. Please try again.")
      const firstBad = rows.find(r => next[r.id])
      if (firstBad) focusRow(firstBad.id)
    } finally {
      setSubmitting(false)
    }
  }

  const isDirty =
    rows.length > 1 ||
    rows.some(r => r.description || r.latitude || r.canalWidth || r.sensorHeight || r.canalDepth)

  const requestClose = () => {
    if (submitting) return
    if (isDirty) setDiscardOpen(true)
    else onClose()
  }

  const active = rows.find(r => r.id === activeId)
  const newMarkers = rows
    .filter(r => r.latitude && r.longitude)
    .map(r => ({
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      label: `CH-${barangay.barangay_name}-${r.code || "…"}`,
      condition: "Normal",
      sublabel: r.id === activeId ? "Selected. Click the map to move it" : "New hotspot (not saved yet)",
    }))

  return (
    <>
      <Dialog open={open}>
        <DialogContent className="overflow-hidden [&>button]:hidden p-0 gap-0 flex flex-col text-[#122A48] min-w-80 md:min-w-[1040px] max-h-[92vh]">
          <DialogHeader className="shrink-0">
            <div className="flex items-start justify-between gap-3 p-4 md:p-5">
              <div className="flex gap-3 min-w-0">
                <div className="flex-shrink-0 self-start rounded-lg p-2 md:p-2.5 text-white bg-[#1565BC]">
                  <MapPinPlus className="md:h-7.5 md:w-7.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="font-bold text-base md:text-lg">Add Hotspots</p>
                  <p className="text-[10px] md:text-sm">
                    Register canal hotspots in {barangay.barangay_name}. Pin each one on the map.
                  </p>
                </div>
              </div>
              <button type="button" onClick={requestClose} className="cursor-pointer flex-shrink-0">
                <X size={18} />
              </button>
            </div>
          </DialogHeader>
          <DialogTitle className="sr-only">Add Hotspots</DialogTitle>

          <div className="flex flex-col md:flex-row md:h-[560px] min-h-0 border-t border-[#C6C6C8] max-md:overflow-y-auto">
            {/* map */}
            <div className="md:w-[45%] p-3 flex flex-col min-h-[320px] md:min-h-0">
              <p className="font-semibold text-xs md:text-sm">Map</p>
              <p className={`text-[10px] md:text-xs mt-0.5 ${mapMessage ? "text-[#D81010]" : "text-[#727272]"}`}>
                {mapMessage ||
                  (boundaryLoading
                    ? "Loading barangay boundary..."
                    : active
                      ? `Click inside the boundary to pin Hotspot #${rows.findIndex(r => r.id === active.id) + 1}.`
                      : "Select a hotspot to pin it.")}
              </p>
              <div className="flex-1 min-h-[200px] mt-2 rounded-lg border border-[#C6C6C8] overflow-hidden">
                <AgosMapWrapper
                  latitude={active?.latitude ? parseFloat(active.latitude) : barangay.latitude ?? undefined}
                  longitude={active?.longitude ? parseFloat(active.longitude) : barangay.longitude ?? undefined}
                  zoom={active?.latitude ? 16 : 15}
                  onMapClick={handleMapClick}
                  boundaryGeoJson={boundary}
                  showLegend={true}
                  colorMode="availability"
                  markers={[...existingMarkers, ...newMarkers]}
                />
              </div>
            </div>

            {/* hotspot cards */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 border-t md:border-t-0 md:border-l border-[#C6C6C8]">
              {rows.map((r, i) => {
                const e = errors[r.id] ?? {}
                const isActive = r.id === activeId
                return (
                  <div
                    key={r.id}
                    ref={el => { cardRefs.current[r.id] = el }}
                    onClick={() => setActiveId(r.id)}
                    className={`rounded-lg border p-3 cursor-pointer bg-white ${
                      isActive ? "border-[#1565BC] shadow-[0_0_0_2px_#1565BC22]" : "border-[#C6C6C8]"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-bold text-xs md:text-sm">
                        Hotspot #{i + 1}{" "}
                        <span className="font-medium text-[#727272]">CH-{barangay.barangay_name}-{r.code || "…"}</span>
                      </p>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={ev => { ev.stopPropagation(); setDeleteTarget(r.id) }}
                          className="text-[#D81010] cursor-pointer"
                          title="Remove this hotspot"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    {e.general && <p className="text-xs text-[#D81010] mb-2">{e.general}</p>}

                    <div className="flex gap-3">
                      <TextField label="CODE *" value={r.code} onChange={v => update(r.id, "code", v)} error={e.code} placeholder="2" />
                      <Field className="flex gap-1.5 flex-col flex-1">
                        <FieldLabel className="text-[#122A48] text-[11px]">PUROK *</FieldLabel>
                        <PurokSelect
                          value={r.purok}
                          onChange={v => update(r.id, "purok", v)}
                          count={barangay.purok_count}
                          error={!!e.purok}
                        />
                        <FieldError className="text-xs">{e.purok}</FieldError>
                      </Field>
                      <div className="flex-[2]">
                        <TextField
                          label="DESCRIPTION *"
                          value={r.description}
                          onChange={v => update(r.id, "description", v)}
                          error={e.description}
                          placeholder="Landmark, e.g. Near Tsongsan"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <TextField label="CANAL WIDTH (m)" type="number" value={r.canalWidth} onChange={v => update(r.id, "canalWidth", v)} error={e.canalWidth} placeholder="1.2" />
                      <Field className="flex gap-1.5 flex-col flex-1">
                        <FieldLabel className="text-[#122A48] text-[11px]">CANAL SHAPE</FieldLabel>
                        <Select value={r.canalShape} onValueChange={v => update(r.id, "canalShape", v)}>
                          <SelectTrigger className="!font-normal bg-[#1565BC05] py-0 md:py-[18px] text-xs rounded-lg border-[#727272]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper">
                            <SelectItem value="rectangular">Rectangular</SelectItem>
                            <SelectItem value="trapezoidal">Trapezoidal</SelectItem>
                            <SelectItem value="circular">Circular</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <div className="flex gap-3 mt-2">
                      <TextField label="SENSOR HEIGHT (cm)" type="number" value={r.sensorHeight} onChange={v => update(r.id, "sensorHeight", v)} error={e.sensorHeight} />
                      <TextField label="CANAL DEPTH (cm)" type="number" value={r.canalDepth} onChange={v => update(r.id, "canalDepth", v)} error={e.canalDepth} />
                    </div>

                    <div className="mt-2 text-xs">
                      {r.latitude && r.longitude ? (
                        <span className="text-[#2C7B3C] font-medium">
                          Pinned: {parseFloat(r.latitude).toFixed(5)}, {parseFloat(r.longitude).toFixed(5)}
                        </span>
                      ) : (
                        <span className={e.latitude ? "text-[#D81010]" : "text-[#727272]"}>
                          {e.latitude || "Not pinned yet. Select this card, then click the map."}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}

              <button
                type="button"
                onClick={addRow}
                disabled={rows.length >= MAX_ROWS}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#1565BC66] text-[#1565BC] text-xs md:text-sm font-semibold py-3 cursor-pointer hover:bg-[#1565BC0A] disabled:opacity-50"
              >
                <Plus size={16} /> Add another hotspot
              </button>
            </div>
          </div>

          {/* footer */}
          <div className="shrink-0 flex items-center justify-between gap-3 p-4 border-t border-[#C6C6C8]">
            <p className={`text-xs ${formError ? "text-[#D81010]" : "text-[#727272]"}`}>
              {formError || `${rows.length} hotspot${rows.length === 1 ? "" : "s"} to add`}
            </p>
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
                className="cursor-pointer hover:bg-[#12569f] rounded-lg text-xs md:text-sm px-4 py-4 bg-[#1565BC] min-w-[150px]"
              >
                <Check /> Save {rows.length} Hotspot{rows.length === 1 ? "" : "s"}
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
        title="Discard Hotspots?"
        description="Your unsaved hotspots will be lost."
        cancelLabel="Keep Editing"
        confirmLabel="Discard"
      />

      <DialogModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleSubmit}
        color={DIALOG_COLOR.lightgreen}
        icon={MapPinPlus}
        iconColor={DIALOG_COLOR.green}
        title="Confirm New Hotspots"
        description={
          <>
            Add <strong>{rows.length} hotspot{rows.length === 1 ? "" : "s"}</strong> to{" "}
            <strong>{barangay.barangay_name}</strong>?
            <br />
            {rows.map(r => `CH-${barangay.barangay_name}-${r.code.trim()}`).join(", ")}
          </>
        }
        cancelLabel="Go Back"
        confirmLabel="Add Hotspots"
      />

      <DialogModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget !== null) removeRow(deleteTarget)
          setDeleteTarget(null)
        }}
        color={DIALOG_COLOR.lightred}
        icon={Trash2}
        iconColor={DIALOG_COLOR.red}
        title="Remove Hotspot?"
        description={
          <>
            Remove <strong>Hotspot #{rows.findIndex(r => r.id === deleteTarget) + 1}</strong> from this list?
            Anything you entered for it will be lost.
          </>
        }
        cancelLabel="Keep"
        confirmLabel="Remove"
      />

      <DialogModal
        open={submitting}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title="Saving Hotspots"
        description={<>Saving {rows.length} hotspot{rows.length === 1 ? "" : "s"}. Please wait.</>}
      />
    </>
  )
}