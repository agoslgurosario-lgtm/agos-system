"use client"

import { useEffect, useRef, useState } from "react"
import { History, Plus, UserPlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { api } from "@/lib/api"

// A report stores personnel as one text string ("Juan, Pedro"). The backend joins names
// with commas, so the string and the list of names convert both ways.
export const namesFromText = (text: string): string[] =>
  (text ?? "").split(",").map((n) => n.trim()).filter(Boolean)
export const namesToText = (names: string[]): string => names.join(", ")

/* ---------- the field shown inside a form: chips + button ---------- */

export function PersonnelField({ names, onRemove, onOpen, error, disabled }: {
  names: string[]
  onRemove: (name: string) => void
  onOpen: () => void
  error?: string
  disabled?: boolean
}) {
  return (
    <div>
      <div className={`rounded-lg border-2 bg-white px-3 py-2 ${error ? "border-[#D81010]" : "border-[#C6C6C8]"}`}>
        {names.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {names.map((n) => (
              <span key={n} className="inline-flex items-center gap-1 rounded-full bg-[#E0ECFF] py-1 pl-3 pr-1.5 text-xs font-semibold text-[#122A48]">
                {n}
                <button
                  type="button" disabled={disabled} onClick={() => onRemove(n)} aria-label={`Remove ${n}`}
                  className="cursor-pointer rounded-full p-0.5 text-[#64748B] hover:bg-[#C7D9F8]"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <button
          type="button" disabled={disabled} onClick={onOpen}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#1D4ED8] hover:underline"
        >
          <UserPlus size={15} /> {names.length ? "Add / change personnel" : "Assign personnel"}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-[#D81010]">{error}</p>}
    </div>
  )
}

/* ---------- the dialog: saved names, new names, same as last report ---------- */

export function PersonnelDialog({ open, names, onChange, onClose }: {
  open: boolean
  names: string[]
  onChange: (names: string[]) => void
  onClose: () => void
}) {
  const [saved, setSaved] = useState<string[]>([])
  const [lastCrew, setLastCrew] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [text, setText] = useState("")
  const [preview, setPreview] = useState<string[]>([])
  const [similar, setSimilar] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const seq = useRef(0)

  useEffect(() => {
    if (!open) return
    let alive = true
    setText(""); setLoading(true)
    api.get("/api/personnel/")
      .then((r: any) => { if (alive) { setSaved(r.names ?? []); setLastCrew(r.last_crew ?? []) } })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [open])

  // live preview of how the typed text will be split
  useEffect(() => {
    if (!text.trim()) { setPreview([]); setSimilar({}); setError(null); setChecking(false); return }
    const mine = ++seq.current
    setChecking(true)
    const t = setTimeout(async () => {
      try {
        const r: any = await api.post("/api/personnel/", { text, save: false })
        if (mine !== seq.current) return
        setPreview(r.names ?? []); setSimilar(r.similar ?? {}); setError(null)
      } catch (e: any) {
        if (mine !== seq.current) return
        setPreview([]); setSimilar({}); setError(e?.error ?? "Could not check these names.")
      } finally {
        if (mine === seq.current) setChecking(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [text])

  const has = (n: string) => names.some((x) => x.toLowerCase() === n.toLowerCase())
  const addMany = (list: string[]) =>
    onChange([...names, ...list.filter((n, i) => !has(n) && list.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i)])

  const available = saved.filter((n) => !has(n))
  const newOnes = preview.filter((n) => !has(n))
  const missingLast = lastCrew.filter((n) => !has(n))

  const addTyped = () => {
    if (!newOnes.length || error) return
    addMany(newOnes)
    setSaved((s) => [...s, ...newOnes.filter((n) => !s.some((x) => x.toLowerCase() === n.toLowerCase()))])
    setText("")
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md rounded-2xl p-5 text-[#122A48]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Assign personnel</DialogTitle>
          <DialogDescription className="text-[11px] leading-4 text-[#94A3B8]">
            Click a saved name to add it, or type new names. New names are saved for next time.
          </DialogDescription>
        </DialogHeader>

        {names.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {names.map((n) => (
              <span key={n} className="inline-flex items-center gap-1 rounded-full bg-[#E0ECFF] py-1 pl-3 pr-1.5 text-xs font-semibold">
                {n}
                <button type="button" onClick={() => onChange(names.filter((x) => x !== n))} aria-label={`Remove ${n}`}
                  className="cursor-pointer rounded-full p-0.5 text-[#64748B] hover:bg-[#C7D9F8]">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {missingLast.length > 0 && (
          <button
            type="button" onClick={() => addMany(lastCrew)}
            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-[#BFD4F6] bg-[#F1F6FE] px-3 py-2 text-xs font-semibold text-[#1D4ED8] hover:bg-[#E3EDFC]"
          >
            <History size={14} /> Same as last report ({lastCrew.length})
          </button>
        )}

        <div>
          <p className="mb-1.5 text-[11px] font-bold text-[#64748B]">SAVED NAMES</p>
          {loading ? (
            <p className="text-xs text-[#94A3B8]">Loading…</p>
          ) : available.length === 0 ? (
            <p className="text-xs text-[#94A3B8]">
              {saved.length ? "All saved names are already added." : "No saved names yet. Type one below."}
            </p>
          ) : (
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">
              {available.map((n) => (
                <button
                  key={n} type="button" onClick={() => addMany([n])}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#F1F5F9]"
                >
                  <Plus size={12} className="text-[#64748B]" /> {n}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-1.5 text-[11px] font-bold text-[#64748B]">ADD NEW NAMES</p>
          <textarea
            rows={2} maxLength={500} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Juan Dela Cruz, Maria Santos and Ana"
            className={`w-full rounded-lg border-2 bg-white px-3 py-2 text-sm outline-none focus:border-[#1565BC] ${error ? "border-[#D81010]" : "border-[#C6C6C8]"}`}
          />
          <div className="mt-1 min-h-[34px] text-[11px]">
            {error ? (
              <p className="text-[#D81010]">{error}</p>
            ) : !text.trim() ? (
              <p className="text-[#94A3B8]">Separate names with a comma, &amp;, /, +, “and” or “at”.</p>
            ) : checking ? (
              <p className="text-[#94A3B8]">Checking…</p>
            ) : preview.length > 0 ? (
              <>
                <p className="text-[#475569]">
                  Adding {preview.length} {preview.length === 1 ? "name" : "names"}: {preview.join(" · ")}
                </p>
                {Object.entries(similar).map(([typed, existing]) => (
                  <p key={typed} className="text-[#B45309]">Did you mean “{existing}” instead of “{typed}”?</p>
                ))}
              </>
            ) : null}
          </div>
          <Button
            type="button" onClick={addTyped} disabled={!newOnes.length || !!error || checking}
            className="mt-2 w-full cursor-pointer bg-[#1F9D55] font-bold text-white hover:bg-[#188046]"
          >
            {newOnes.length > 1 ? `Add ${newOnes.length} names` : "Add name"}
          </Button>
        </div>

        <Button type="button" onClick={onClose} className="w-full cursor-pointer bg-[#122A48] font-bold text-white hover:bg-[#0d2037]">
          Done
        </Button>
      </DialogContent>
    </Dialog>
  )
}
