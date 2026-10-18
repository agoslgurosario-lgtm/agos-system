"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Tag, Check, X, BadgeCheck } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogModal } from "@/components/DialogModal"
import { DIALOG_COLOR } from "@/lib/constant"
import { api } from "@/lib/api"

type PendingType = {
  waste_type_id: number
  name: string
  created_at: string
  created_by_name: string | null
  created_by_barangay: string | null
}

type ConfirmState = { kind: "approve" | "rename" | "reject"; item: PendingType; newName?: string } | null

export function PendingWasteTypes() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<PendingType[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null)

  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [success, setSuccess] = useState<{ title: string; message: ReactNode } | null>(null)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const data = await api.get("/api/custom-waste-types/?status=Pending")
      setItems(data.results ?? data)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])                 // fills the badge count
  useEffect(() => { if (open) load() }, [open, load]) // refresh when opened

  const closeConfirm = () => {
    setConfirm(null)
    setReason("")
    setReasonError("")
  }

  const handleOpenChange = (o: boolean) => {
    setOpen(o)
    if (!o) {
      setSuccess(null)
      setEditingId(null)
      setEditName("")
      setRowError(null)
      closeConfirm()
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    const { kind, item, newName } = confirm
    if (kind === "reject" && !reason.trim()) {
      setReasonError("Please give a reason.")
      return
    }
    setBusyId(item.waste_type_id)
    setRowError(null)
    try {
      await api.patch(
        `/api/custom-waste-types/${item.waste_type_id}/`,
        kind === "reject"
          ? { action: "reject", reason: reason.trim() }
          : kind === "rename"
            ? { action: "approve", name: newName }
            : { action: "approve" }
      )
      setItems(prev => prev.filter(i => i.waste_type_id !== item.waste_type_id))
      setItems(prev => prev.filter(i => i.waste_type_id !== item.waste_type_id))
      setEditingId(null)
      setSuccess(
        kind === "reject"
          ? {
              title: "Waste Type Rejected",
              message: <><strong>{item.name}</strong> was rejected and the barangay has been notified.</>,
            }
          : {
              title: "Waste Type Approved",
              message: <><strong>{kind === "rename" ? newName : item.name}</strong> was approved. It is now available to every barangay.</>,
            }
      )
      closeConfirm()
    } catch (err: any) {
      setRowError({
        id: item.waste_type_id,
        message: err?.error ?? err?.detail ?? "Something went wrong. Please try again.",
      })
      closeConfirm()
    } finally {
      setBusyId(null)
    }
  }

  const isReject = confirm?.kind === "reject"

  const confirmTitle =
    confirm?.kind === "reject" ? "Reject Waste Type"
    : confirm?.kind === "rename" ? "Rename & Approve"
    : "Approve Waste Type"

  const confirmDescription = !confirm ? "" : confirm.kind === "reject" ? (
    <span className="flex flex-col gap-2">
      <span className="block">
        Reject <strong>{confirm.item.name}</strong>? The barangay that added it will be told why.
      </span>
      <textarea
        value={reason}
        onChange={e => { setReason(e.target.value); setReasonError("") }}
        maxLength={200}
        rows={3}
        placeholder="Reason (required), e.g. use the Plastic category instead"
        className="block w-full rounded-lg border border-[#C6C6C8] bg-white p-2 text-xs text-[#122A48] outline-none focus:border-[#1565BC]"
      />
      {reasonError && <span className="block text-xs text-[#D81010]">{reasonError}</span>}
    </span>
  ) : confirm.kind === "rename" ? (
    <>Rename <strong>{confirm.item.name}</strong> to <strong>{confirm.newName}</strong> and approve it? It will be available to every barangay.</>
  ) : (
    <>Approve <strong>{confirm.item.name}</strong>? It will be available to every barangay.</>
  )

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="cursor-pointer bg-white border-2 border-[#C6C6C8] text-[#122A48] hover:bg-[#eef1f3] rounded-lg px-3 py-3 text-xs font-medium"
      >
        <Tag size={16} className="mr-1" />
        Waste Types
        {items.length > 0 && (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FF9705] px-1.5 text-[11px] font-bold text-white">
            {items.length}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="p-0 text-[#122A48] min-w-80 md:min-w-[540px] max-h-[80vh] flex flex-col [&>button]:cursor-pointer">
          <DialogHeader className="px-5 pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: DIALOG_COLOR.lightblue }}>
                <Tag className="w-5 h-5 sm:w-6 sm:h-6" color={DIALOG_COLOR.blue} />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="font-bold text-base sm:text-lg">Pending Waste Types</DialogTitle>
                <p className="text-xs text-[#727272] font-normal">
                  New “Other” waste types added by barangays. Approved types become available to every barangay.
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 pb-5 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="py-8 text-center text-xs text-[#727272]">Loading…</p>
            ) : loadError ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold text-[#D81010]">Couldn&apos;t load waste types.</p>
                <button onClick={load} className="mt-1 text-xs text-[#1565BC] hover:underline cursor-pointer">Retry</button>
              </div>
            ) : items.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#727272]">No waste types waiting for approval.</p>
            ) : (
              items.map(item => {
                const busy = busyId === item.waste_type_id
                const editing = editingId === item.waste_type_id
                return (
                  <div key={item.waste_type_id} className="mt-3 rounded-lg border border-[#C6C6C8] p-3">
                    <p className="text-sm font-bold">{item.name}</p>
                    <p className="text-[11px] text-[#727272]">
                      Added by {item.created_by_name ?? "Unknown"}
                      {item.created_by_barangay ? ` · ${item.created_by_barangay}` : ""}
                      {" · "}
                      {new Date(item.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </p>

                    {editing ? (
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          maxLength={40}
                          className="h-8 text-xs"
                        />
                        <Button
                          disabled={busy || !editName.trim()}
                          onClick={() => setConfirm({ kind: "rename", item, newName: editName.trim() })}
                          className="h-8 cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-xs"
                        >
                          <Check size={14} className="mr-1" /> Save &amp; approve
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                          className="h-8 cursor-pointer bg-[#FAFCFD] border border-[#C6C6C8] text-[#727272] hover:bg-[#e3ecf0] text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-2 flex gap-2">
                        <Button
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "approve", item })}
                          className="h-8 cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-xs"
                        >
                          Approve
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => { setRowError(null); setEditingId(item.waste_type_id); setEditName(item.name) }}
                          className="h-8 cursor-pointer text-xs border border-[#1565BC80] bg-[#CDE3DE45] hover:bg-[#b8d5cf45] text-[#122A48]"
                        >
                          Rename
                        </Button>
                        <Button
                          disabled={busy}
                          onClick={() => setConfirm({ kind: "reject", item })}
                          className="h-8 cursor-pointer text-xs border border-[#D81010] bg-transparent text-[#D81010] hover:bg-[#FFE5E5]"
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {rowError?.id === item.waste_type_id && (
                      <p className="mt-2 text-xs text-[#D81010]">{rowError.message}</p>
                    )}
                  </div>
                )
              })
            )}
          </div>
          
          <DialogModal
            open={!!confirm}
            onClose={closeConfirm}
            onConfirm={runConfirm}
            loading={busyId !== null}
            color={isReject ? DIALOG_COLOR.lightred : DIALOG_COLOR.lightgreen}
            icon={isReject ? X : Check}
            iconColor={isReject ? DIALOG_COLOR.red : DIALOG_COLOR.green}
            title={confirmTitle}
            description={confirmDescription}
            cancelLabel="Cancel"
            confirmLabel={isReject ? "Reject" : confirm?.kind === "rename" ? "Rename & Approve" : "Approve"}
          />

          <DialogModal
            open={!!success}
            onConfirm={() => setSuccess(null)}
            color={DIALOG_COLOR.lightgreen}
            icon={BadgeCheck}
            iconColor={DIALOG_COLOR.green}
            title={success?.title ?? ""}
            description={success?.message ?? ""}
            confirmLabel="Done"
          />
        </DialogContent>
      </Dialog>

    </>
  )
}