"use client"

import { useMemo, useState } from "react"
import { PlusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fetchWithAuth } from "@/lib/auth"
import type { CustomWasteType } from "@/types/report"

interface Props {
  open: boolean
  onClose: () => void
  wasteTypes: CustomWasteType[]
  excludeIds: number[]
  onPick: (type: CustomWasteType) => void
  onCreated: (type: CustomWasteType) => void
}

export function AddOtherWasteModal({ open, onClose, wasteTypes, excludeIds, onPick, onCreated }: Props) {
  const [text, setText] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)

  const typed = text.trim()
  const available = useMemo(() => wasteTypes.filter((t) => !excludeIds.includes(t.waste_type_id)), [wasteTypes, excludeIds])
  const matches = typed ? available.filter((t) => t.name.toLowerCase().includes(typed.toLowerCase())) : available
  const alreadyExists = wasteTypes.some((t) => t.name.toLowerCase() === typed.toLowerCase())
  const suggested = suggestion ? available.find((t) => t.name.toLowerCase() === suggestion.toLowerCase()) : null

  const close = () => { setText(""); setError(null); setSuggestion(null); onClose() }
  const pick = (t: CustomWasteType) => { onPick(t); close() }

  const createNew = async () => {
    setSaving(true); setError(null); setSuggestion(null)
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/custom-waste-types/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: typed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? data?.detail ?? "Couldn't add that waste type. Please try again.")
        setSuggestion(data?.suggestion ?? null)
        return
      }
      onCreated(data as CustomWasteType)
      close()
    } catch {
      setError("Couldn't add that waste type. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-[#122A48]">Add other waste</DialogTitle>
          <DialogDescription className="text-[11px] leading-4 text-[#94A3B8]">
            Pick one from the list, or type a new one (letters only, e.g. wood, mattress). New types are reviewed by MENRO.
          </DialogDescription>
        </DialogHeader>

        <input
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); setSuggestion(null) }}
          placeholder="Search or type a waste type"
          maxLength={40}
          className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#122A48] outline-none focus:border-[#16a34a]"
        />

        {available.length > 0 && <p className="text-[11px] font-semibold text-[#64748B]">Saved waste types, click to add</p>}
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {matches.map((t) => (
            <button
              key={t.waste_type_id}
              type="button"
              onClick={() => pick(t)}
              className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#16a34a] bg-[#f0fdf4] px-3.5 py-3 hover:bg-[#dcfce7]"
            >
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#15803d]">
                <PlusCircle size={18} color="#16a34a" /> {t.name}
              </span>
              {t.status === "Pending" && <span className="text-[10px] font-semibold text-[#b45309]">Pending approval</span>}
            </button>
          ))}
          {matches.length === 0 && (
            <p className="py-3 text-xs text-[#94A3B8]">{available.length === 0 && !typed ? "No saved types yet." : "No matching saved type."}</p>
          )}
        </div>

        {error && <p className="text-xs font-medium text-[#dc2626]">{error}</p>}

        {suggested && (
          <Button onClick={() => pick(suggested)} className="cursor-pointer bg-[#dcfce7] font-bold text-[#16a34a] hover:bg-[#bbf7d0]">
            Use “{suggested.name}” instead
          </Button>
        )}

        {typed.length >= 2 && !alreadyExists && (
          <Button onClick={createNew} disabled={saving} className="cursor-pointer bg-[#122A48] font-bold text-white hover:bg-[#0d2037]">
            {saving ? "Adding..." : `Add “${typed}” as a new waste type`}
          </Button>
        )}

        <Button variant="outline" onClick={close} className="cursor-pointer border-0 bg-[#f1f5f9] font-semibold text-[#64748B]">Cancel</Button>
      </DialogContent>
    </Dialog>
  )
}
