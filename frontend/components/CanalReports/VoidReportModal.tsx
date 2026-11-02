"use client"

import { useEffect, useState } from "react"
import { FileX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  loading: boolean
  fromClogEvent: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}

export function VoidReportModal({ open, loading, fromClogEvent, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("")
  useEffect(() => { if (open) setReason("") }, [open])
  const valid = reason.trim().length >= 5

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2]">
            <FileX size={24} color="#dc2626" />
          </div>
          <DialogTitle className="text-base font-bold text-[#122A48]">Void this report?</DialogTitle>
          <DialogDescription className="text-xs leading-5 text-[#64748B]">
            {fromClogEvent
              ? "The report will be removed from your list and won't be sent to MENRO. The clog event comes back as Detected so you can respond and report on it again."
              : "The report will be removed from your list and won't be sent to MENRO. This can't be undone."}
          </DialogDescription>
        </DialogHeader>

        <div>
          <label htmlFor="void-reason" className="mb-1 block text-[11px] font-bold text-[#64748B]">REASON *</label>
          <textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Wrong personnel listed"
            maxLength={500}
            disabled={loading}
            className="min-h-16 w-full resize-none rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#122A48] outline-none focus:border-[#16a34a]"
          />
          <p className="mt-1 text-[11px] text-[#94A3B8]">At least 5 characters.</p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 cursor-pointer border-[#E2E8F0] text-[#475569]">Cancel</Button>
          <Button onClick={() => onConfirm(reason.trim())} disabled={!valid || loading} className="flex-1 cursor-pointer bg-[#dc2626] font-bold text-white hover:bg-[#b91c1c]">
            {loading ? "Voiding..." : "Void report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
