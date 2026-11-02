"use client"

import { ClipboardCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  loading: boolean
  wasteKg: number
  photoCount: number
  onClose: () => void
  onConfirm: () => void
}

export function CompletePostModal({ open, loading, wasteKg, photoCount, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F7EE]">
            <ClipboardCheck size={26} color="#16a34a" />
          </div>
          <DialogTitle className="text-base font-bold text-[#122A48]">Complete post-report?</DialogTitle>
          <DialogDescription className="text-xs leading-5 text-[#64748B]">
            Your waste details and photos will be saved, and the canal condition will be taken from the node&apos;s sensors. You can still review the compiled report afterwards.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-[#F1F5F9] px-3 py-2.5 text-xs text-[#334155]">
          <p>Waste collected: <span className="font-bold">{wasteKg.toFixed(2)} kg</span></p>
          <p>Photos attached: <span className="font-bold">{photoCount}</span></p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 cursor-pointer border-[#E2E8F0] text-[#475569]">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">
            {loading ? "Completing..." : "Complete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
