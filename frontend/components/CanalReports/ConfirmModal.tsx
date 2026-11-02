"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  title: string
  message: string
  icon: ReactNode
  iconBg?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

// two-button question: "Complete this report?", "Verify this report?", "Submit to MENRO?"
export function ConfirmModal({
  open, title, message, icon, iconBg = "#dcfce7",
  confirmLabel = "Confirm", cancelLabel = "Cancel", loading = false, onClose, onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
            {icon}
          </div>
          <DialogTitle className="text-base font-extrabold text-[#0f172a]">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-5 text-[#64748b]">{message}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2.5">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 cursor-pointer border-[#cbd5e1] text-[#475569]">
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">
            {loading ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
