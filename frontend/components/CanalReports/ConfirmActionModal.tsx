"use client"

import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  loading: boolean
  title: string
  message: string
  confirmLabel: string
  icon?: ReactNode
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmActionModal({ open, loading, title, message, confirmLabel, icon, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-[#E7F7EE]">
            {icon ?? <ShieldCheck size={26} color="#16a34a" />}
          </div>
          <DialogTitle className="text-base font-bold text-[#122A48]">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-5 text-[#64748B]">{message}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1 cursor-pointer border-[#E2E8F0] text-[#475569]">Cancel</Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">
            {loading ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
