"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Button } from "@/components/ui/button"
import { DIALOG_COLOR } from "@/lib/constant"
import { SpinnerIcon } from "../SpinnerIcon"

type Props = {
  open: boolean
  title: string
  description: ReactNode
  placeholder?: string
  confirmLabel?: string
  confirmColor?: string
  loading?: boolean
  onCancel: () => void
  onConfirm: (remarks: string) => void
}

export function RemarksDialog({
  open, title, description, placeholder = "e.g. Moved because the canal was dry",
  confirmLabel = "Confirm", confirmColor = DIALOG_COLOR.yellow, loading = false, onCancel, onConfirm,
}: Props) {
  const [remarks, setRemarks] = useState("")
  const [error, setError] = useState("")

  // start empty every time it opens
  useEffect(() => {
    if (open) { setRemarks(""); setError("") }
  }, [open])

  const submit = () => {
    if (loading) return
    const r = remarks.trim()
    if (!r) { setError("Remarks are required."); return }
    onConfirm(r)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !loading) onCancel() }}>
      <DialogContent className="text-[#122A48] w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-bold text-base">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[#727272]">{description}</p>
          <Field className="flex gap-1.5 flex-col">
            <FieldLabel className="text-[#122A48] text-xs">Remarks</FieldLabel>
            <textarea
              value={remarks}
              maxLength={500}
              disabled={loading}
              rows={3}
              placeholder={placeholder}
              onChange={(e) => { setRemarks(e.target.value); if (error) setError("") }}
              className={`w-full rounded-lg bg-[#1565BC05] border p-2 text-xs resize-none ${error ? "border-[#FF0000]" : "border-[#727272]"}`}
            />
            <FieldError className="text-xs">{error}</FieldError>
          </Field>
          <div className="flex gap-3 justify-end mt-1">
            <Button
              onClick={onCancel}
              disabled={loading}
              className="rounded-lg border border-[#C6C6C8] px-4 h-9 cursor-pointer text-xs bg-transparent hover:bg-[#edebeb] text-[#727272] disabled:opacity-50"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={loading}
              className="rounded-lg border border-[#C6C6C8] px-4 h-9 cursor-pointer text-xs text-white min-w-[96px] disabled:opacity-80"
              style={{ backgroundColor: confirmColor }}
            >
              {loading ? <SpinnerIcon size={16} color="#FFFFFF" /> : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}