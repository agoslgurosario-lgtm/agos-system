"use client"

import type { ReactNode } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Props {
  open: boolean
  title: string
  message: string
  icon?: ReactNode
  iconBg?: string
  buttonLabel?: string
  onClose: () => void
}

// one-button message: "Nothing to save", "Draft saved", ...
export function NoticeModal({ open, title, message, icon, iconBg = "#fef3c7", buttonLabel = "Got it", onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl p-5">
        <DialogHeader className="items-center text-center">
          <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: iconBg }}>
            {icon ?? <Info size={24} color="#d97706" />}
          </div>
          <DialogTitle className="text-base font-extrabold text-[#0f172a]">{title}</DialogTitle>
          <DialogDescription className="text-xs leading-5 text-[#64748b]">{message}</DialogDescription>
        </DialogHeader>
        <Button onClick={onClose} className="cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">{buttonLabel}</Button>
      </DialogContent>
    </Dialog>
  )
}
