"use client"

import { useEffect, useState } from "react"
import { SlidersHorizontal, CheckCircle, X, RotateCcw } from "lucide-react"

import { api } from "@/lib/api"
import { DIALOG_COLOR } from "@/lib/constant"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogModal } from "@/components/DialogModal"
import { SpinnerIcon } from "@/components/SpinnerIcon"

type ServerRow = {
  condition: string
  warning_pct: number
  critical_pct: number
  reading_interval_seconds: number
  clear_streak_count: number
  is_default: boolean
}

// what's in the inputs (strings, so typing "25." works)
type EditRow = {
  condition: string
  warning_pct: string
  critical_pct: string
  reading_interval_seconds: string
  clear_streak_count: string
}

type FieldKey = "warning_pct" | "critical_pct" | "reading_interval_seconds" | "clear_streak_count"
type Errors = Record<string, Partial<Record<FieldKey, string>>>

const FIELDS: FieldKey[] = ["warning_pct", "critical_pct", "reading_interval_seconds", "clear_streak_count"]

const CONDITION_LABEL: Record<string, { name: string; hint: string; dot: string }> = {
  None:    { name: "None",    hint: "No rainfall warning",              dot: "#2C7B3C" },
  Yellow:  { name: "Yellow",  hint: "Yellow rainfall warning",          dot: "#E4B600" },
  Orange:  { name: "Orange",  hint: "Orange rainfall warning",          dot: "#EE9E43" },
  Red:     { name: "Red",     hint: "Red rainfall warning",             dot: "#D81010" },
  Unknown: { name: "Unknown", hint: "Rainfall data is missing or stale", dot: "#727272" },
}

const toEdit = (r: ServerRow): EditRow => ({
  condition: r.condition,
  warning_pct: String(r.warning_pct),
  critical_pct: String(r.critical_pct),
  reading_interval_seconds: String(r.reading_interval_seconds),
  clear_streak_count: String(r.clear_streak_count),
})

const isWhole = (s: string) => /^\d+$/.test(s.trim()) && parseInt(s, 10) >= 1

function humanDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s} s`
  if (s === 0) return `${m} min`
  return `${m} min ${s} s`
}

// same rules as the backend, for instant feedback
function validate(rows: EditRow[]): Errors {
  const e: Errors = {}
  for (const r of rows) {
    const re: Partial<Record<FieldKey, string>> = {}
    const w = parseFloat(r.warning_pct)
    const c = parseFloat(r.critical_pct)

    if (r.warning_pct.trim() === "" || isNaN(w)) re.warning_pct = "Enter a number."
    else if (w <= 0) re.warning_pct = "Must be greater than 0."

    if (r.critical_pct.trim() === "" || isNaN(c)) re.critical_pct = "Enter a number."
    else if (c > 100) re.critical_pct = "Cannot be more than 100."
    else if (!re.warning_pct && w >= c) re.critical_pct = "Must be higher than Warning."

    if (!isWhole(r.reading_interval_seconds)) re.reading_interval_seconds = "Whole number, at least 1."
    if (!isWhole(r.clear_streak_count)) re.clear_streak_count = "Whole number, at least 1."

    if (Object.keys(re).length) e[r.condition] = re
  }
  return e
}

function Cell({
  value, onChange, error, suffix, hint,
}: { value: string; onChange: (v: string) => void; error?: string; suffix?: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <Input
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`h-9 text-xs rounded-lg bg-[#1565BC05] !font-normal ${suffix ? "pr-7" : ""} ${error ? "border-[#FF0000]" : "border-[#727272]"}`}
        />
        {suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[#727272]">{suffix}</span>}
      </div>
      {error ? <p className="text-[11px] text-[#D81010]">{error}</p> : hint ? <p className="text-[11px] text-[#727272]">{hint}</p> : null}
    </div>
  )
}

export function AlertThresholdsCard({ waitFor = false }: { waitFor?: boolean }) {
  const [server, setServer] = useState<ServerRow[]>([])
  const [rows, setRows] = useState<EditRow[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [confirmSave, setConfirmSave] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [working, setWorking] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: "", description: "" })
  const [success, setSuccess] = useState<{ open: boolean; title: string; description: string }>({ open: false, title: "", description: "" })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: "" })

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const data: ServerRow[] = await api.get("/api/alert-thresholds/")
      setServer(data)
      setRows(data.map(toEdit))
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const changed = (r: EditRow) => {
    const s = server.find(x => x.condition === r.condition)
    if (!s) return false
    return FIELDS.some(f => parseFloat(r[f]) !== s[f] || r[f].trim() === "")
  }
  const dirty = rows.some(changed)
  const allDefault = server.length > 0 && server.every(s => s.is_default)

  const update = (condition: string, field: FieldKey, value: string) => {
    setRows(prev => prev.map(r => (r.condition === condition ? { ...r, [field]: value } : r)))
    setErrors(prev => (prev[condition]?.[field] ? { ...prev, [condition]: { ...prev[condition], [field]: undefined } } : prev))
  }

  const requestSave = () => {
    const e = validate(rows)
    setErrors(e)
    if (Object.keys(e).length === 0) setConfirmSave(true)
  }

  const applyServerErrors = (err: any) => {
    const next: Errors = {}
    for (const item of err?.errors ?? []) {
      next[item.condition] = {}
      for (const [k, msg] of Object.entries(item.fields ?? {})) {
        next[item.condition][k as FieldKey] = String(msg)
      }
    }
    setErrors(next)
  }

  const handleSave = async () => {
    setConfirmSave(false)
    setWorking({ open: true, title: "Saving Thresholds", description: "Updating the alert thresholds. Please wait." })
    try {
      const data: ServerRow[] = await api.put(
        "/api/alert-thresholds/",
        rows.map(r => ({
          condition: r.condition,
          warning_pct: parseFloat(r.warning_pct),
          critical_pct: parseFloat(r.critical_pct),
          reading_interval_seconds: parseInt(r.reading_interval_seconds, 10),
          clear_streak_count: parseInt(r.clear_streak_count, 10),
        }))
      )
      setServer(data)
      setRows(data.map(toEdit))
      setErrors({})
      setWorking({ open: false, title: "", description: "" })
      setSuccess({ open: true, title: "Thresholds Saved", description: "The alert thresholds were updated. They apply to new readings from now on." })
    } catch (err: any) {
      setWorking({ open: false, title: "", description: "" })
      applyServerErrors(err)
      setErrorDialog({ open: true, message: err?.detail ?? err?.error ?? "Something went wrong. Nothing was saved." })
    }
  }

  const handleReset = async () => {
    setConfirmReset(false)
    setWorking({ open: true, title: "Resetting Thresholds", description: "Restoring the default values. Please wait." })
    try {
      const data: ServerRow[] = await api.post("/api/alert-thresholds/reset/")
      setServer(data)
      setRows(data.map(toEdit))
      setErrors({})
      setWorking({ open: false, title: "", description: "" })
      setSuccess({ open: true, title: "Thresholds Reset", description: "All alert thresholds are back to their default values." })
    } catch (err: any) {
      setWorking({ open: false, title: "", description: "" })
      setErrorDialog({ open: true, message: err?.detail ?? err?.error ?? "Failed to reset the thresholds." })
    }
  }

  return (
    <>
      <div className="rounded-lg bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] p-3 border border-[#C9C9C9] flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-[#58D07159]">
            <SlidersHorizontal className="w-4 h-4" color="#2C7B3C" />
          </div>
          <h2 className="font-bold text-[#122A48] text-base">Alert Thresholds</h2>
        </div>

        <p className="text-[#727272] text-xs">
          Water level is measured as a percentage of the canal depth. The thresholds tighten as the rainfall warning gets more severe.
          Changes apply to <strong>new readings</strong> only. A new reading interval reaches each device the next time it fetches its settings.
          The interval also sets how long a silent node takes to be flagged offline (2 × interval + 2 minutes).
        </p>

        {loading || waitFor ? (
          <div className="flex justify-center items-center py-10">
            <div className="flex flex-col items-center gap-3">
              <SpinnerIcon size={24} color="#122A48" />
              <p className="text-[#122A48]">Loading...</p>
            </div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-xs text-[#D81010]">Failed to load the alert thresholds.</p>
            <Button onClick={load} className="h-8 text-xs rounded-lg border border-[#D81010] text-[#D81010] bg-transparent hover:bg-[#FFE5E5] cursor-pointer">
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="border border-[#C6C6C8] rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr_1fr] gap-3 bg-[#e8eef1b4] px-3 py-2 text-[11px] font-semibold text-[#727272]">
                <span>RAINFALL WARNING</span>
                <span>WARNING (%)</span>
                <span>CRITICAL (%)</span>
                <span>READING INTERVAL (SEC)</span>
                <span>CLEAR STREAK</span>
              </div>

              {rows.map(r => {
                const meta = CONDITION_LABEL[r.condition]
                const e = errors[r.condition] ?? {}
                const sec = parseInt(r.reading_interval_seconds, 10)
                return (
                  <div
                    key={r.condition}
                    className={`grid grid-cols-[1.4fr_1fr_1fr_1.2fr_1fr] gap-3 px-3 py-3 items-start border-t border-[#C6C6C8] ${changed(r) ? "bg-[#1565BC0A]" : ""}`}
                  >
                    <div className="flex items-start gap-2 pt-1">
                      <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: meta.dot }} />
                      <div>
                        <p className="text-xs font-semibold text-[#122A48]">{meta.name}</p>
                        <p className="text-[11px] text-[#727272]">{meta.hint}</p>
                      </div>
                    </div>
                    <Cell value={r.warning_pct} onChange={v => update(r.condition, "warning_pct", v)} error={e.warning_pct} suffix="%" />
                    <Cell value={r.critical_pct} onChange={v => update(r.condition, "critical_pct", v)} error={e.critical_pct} suffix="%" />
                    <Cell
                      value={r.reading_interval_seconds}
                      onChange={v => update(r.condition, "reading_interval_seconds", v)}
                      error={e.reading_interval_seconds}
                      hint={isWhole(r.reading_interval_seconds) ? `≈ ${humanDuration(sec)}` : undefined}
                    />
                    <Cell
                      value={r.clear_streak_count}
                      onChange={v => update(r.condition, "clear_streak_count", v)}
                      error={e.clear_streak_count}
                      hint="readings in a row"
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <Button
                onClick={() => setConfirmReset(true)}
                disabled={allDefault}
                className="rounded-lg border border-[#C6C6C8] bg-transparent hover:bg-[#edebeb] text-[#122A48] px-3 h-9 text-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" /> Reset to Default
              </Button>

              <div className="flex items-center gap-3">
                {dirty && (
                  <button
                    onClick={() => { setRows(server.map(toEdit)); setErrors({}) }}
                    className="text-xs text-[#727272] hover:underline cursor-pointer"
                  >
                    Undo changes
                  </button>
                )}
                <Button
                  onClick={requestSave}
                  disabled={!dirty}
                  className="rounded-lg bg-[#1565BC] hover:bg-[#0d4f96] text-white px-4 h-9 text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* confirm save */}
      <DialogModal
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={handleSave}
        color={DIALOG_COLOR.lightblue}
        icon={SlidersHorizontal}
        iconColor={DIALOG_COLOR.blue}
        title="Save Alert Thresholds?"
        description={
          <>
            This changes <strong>{rows.filter(changed).map(r => r.condition).join(", ") || "nothing"}</strong>. New readings will use these thresholds right away.
          </>
        }
        cancelLabel="Cancel"
        confirmLabel="Save"
      />

      {/* confirm reset */}
      <DialogModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={handleReset}
        color={DIALOG_COLOR.lightred}
        icon={RotateCcw}
        iconColor={DIALOG_COLOR.red}
        title="Reset to Default?"
        description="All five rainfall conditions go back to their default values. Any unsaved changes will be lost."
        cancelLabel="Cancel"
        confirmLabel="Reset"
      />

      {/* working / success / error */}
      <DialogModal
        open={working.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={working.title}
        description={working.description}
      />
      <DialogModal
        open={success.open}
        onConfirm={() => setSuccess({ open: false, title: "", description: "" })}
        color={DIALOG_COLOR.lightgreen}
        icon={CheckCircle}
        iconColor={DIALOG_COLOR.green}
        title={success.title}
        description={success.description}
        confirmLabel="OK"
      />
      <DialogModal
        open={errorDialog.open}
        onConfirm={() => setErrorDialog({ open: false, message: "" })}
        color={DIALOG_COLOR.lightred}
        icon={X}
        iconColor={DIALOG_COLOR.red}
        title="Something Went Wrong"
        description={errorDialog.message}
        confirmLabel="Okay"
      />
    </>
  )
}