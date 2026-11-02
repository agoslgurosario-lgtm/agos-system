"use client"

import { Save, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  missingPositions: string[]
  onClose: () => void
}

export function IncompleteSignatoriesModal({ open, missingPositions, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#fef3c7]">
            <UserX size={22} color="#d97706" />
          </div>
          <DialogTitle className="text-base font-extrabold text-[#0f172a]">Can&apos;t submit yet</DialogTitle>
          <DialogDescription className="text-xs text-[#64748b]">
            Your barangay needs a complete set of active signatories before a report can be submitted.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-[#f8fafc] px-3.5 py-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase text-[#64748b]">
            Missing {missingPositions.length === 1 ? "position" : "positions"}
          </p>
          <ul>
            {missingPositions.map((position) => (
              <li key={position} className="flex items-center gap-2 py-1 text-[13px] text-[#334155]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d97706]" />
                {position}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-2 rounded-xl bg-[#f0fdf4] px-3.5 py-2.5 text-xs text-[#166534]">
          <Save size={16} color="#16a34a" className="mt-0.5 shrink-0" />
          <p>You can still save this report as a draft. Ask your administrator to assign the missing signatories, then submit it.</p>
        </div>

        <Button onClick={onClose} className="cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">Got it</Button>
      </DialogContent>
    </Dialog>
  )
}
