"use client"

import { ClipboardX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  missingFields: string[]
  onClose: () => void
}

export function IncompleteReportModal({ open, missingFields, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#fef3c7]">
            <ClipboardX size={22} color="#d97706" />
          </div>
          <DialogTitle className="text-base font-extrabold text-[#0f172a]">Report incomplete</DialogTitle>
          <DialogDescription className="text-xs text-[#64748b]">
            {missingFields.length} required {missingFields.length === 1 ? "field is" : "fields are"} still missing.
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-56 overflow-y-auto rounded-xl bg-[#f8fafc] px-3.5 py-2.5">
          {missingFields.map((field) => (
            <li key={field} className="flex items-center gap-2 py-1 text-[13px] text-[#334155]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d97706]" />
              {field}
            </li>
          ))}
        </ul>

        <Button onClick={onClose} className="cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">Got it</Button>
      </DialogContent>
    </Dialog>
  )
}
