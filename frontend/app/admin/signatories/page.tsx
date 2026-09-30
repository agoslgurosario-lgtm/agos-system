"use client"

// icons
import { UserRound, X, BadgeCheck, NotebookPen, Leaf, ShieldCheck, Landmark } from "lucide-react"

// shadcn
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

// components
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { DialogModal } from "@/components/DialogModal"

// react
import { useState, useEffect } from "react"

// lib
import { api } from "@/lib/api"
import { usePageCache } from "@/components/hooks/usePageCache"
import { DIALOG_COLOR } from "@/lib/constant"


type Barangay = {
  barangay_id: number
  barangay_name: string
}

type SignatoryRecord = {
  signatory_id: number
  barangay: number
  position: string
  name: string
  status: string
  created_at: string
}

type PositionSlot = {
  position: string
  active: SignatoryRecord | null
  history: SignatoryRecord[]
}

// distinct icon/color/description per fixed position, used on both the
// cards and the edit dialog header
const POSITION_META: Record<string, { icon: typeof UserRound; color: string; description: string }> = {
  'Barangay Secretary': {
    icon: NotebookPen,
    color: '#582579',
    description: 'Keeps official barangay records and documentation',
  },
  'Chairman Environment': {
    icon: Leaf,
    color: '#2C7B3C',
    description: 'Oversees environmental and sanitation programs',
  },
  'Brgy. Sanitary Inspector': {
    icon: ShieldCheck,
    color: '#D27000',
    description: 'Inspects and certifies sanitation compliance',
  },
  'Punong Barangay': {
    icon: Landmark,
    color: '#1565BC',
    description: 'Head official of the barangay',
  },
}

// fetch raw data - list of barangays for the top selector
const fetchBarangaysRaw = async (): Promise<Barangay[]> => {
  const all = await api.get('/api/barangays/all/')
  return (all.results ?? all).filter((b: Barangay) => b.barangay_name !== 'Admin')
}


export default function SignatoryManagement() {
  const barangaysCache = usePageCache('signatories:barangays', fetchBarangaysRaw, [] as Barangay[], { autoFetch: false })

  useEffect(() => {
    barangaysCache.refetch()
  }, [])

  const barangays = barangaysCache.data
  const [selectedBarangayId, setSelectedBarangayId] = useState<string>('')

  // default the selector to the first barangay once the list loads
  useEffect(() => {
    if (!selectedBarangayId && barangays.length > 0) {
      setSelectedBarangayId(String(barangays[0].barangay_id))
    }
  }, [barangays])

  const [slots, setSlots] = useState<PositionSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(false)

  // dialog state
  const [editDialog, setEditDialog] = useState<{ open: boolean; position: string | null; currentName: string }>({
    open: false, position: null, currentName: '',
  })
  const [formName, setFormName] = useState('')
  const [saveConfirmDialog, setSaveConfirmDialog] = useState<{ open: boolean; position: string | null; name: string }>({
    open: false, position: null, name: '',
  })
  const [loadingDialog, setLoadingDialog] = useState(false)
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; position: string | null; name: string }>({
    open: false, position: null, name: '',
  })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [restoreConfirmDialog, setRestoreConfirmDialog] = useState<{
    open: boolean; signatory: SignatoryRecord | null; position: string | null
  }>({ open: false, signatory: null, position: null })

  const fetchSlots = async (barangayId: string) => {
    if (!barangayId) return
    setSlotsLoading(true)
    setSlotsError(false)
    try {
      const data = await api.get(`/api/signatories/?barangay=${barangayId}`)
      setSlots(data)
    } catch {
      setSlotsError(true)
    } finally {
      setSlotsLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots(selectedBarangayId)
  }, [selectedBarangayId])

  const selectedBarangayName = barangays.find(b => String(b.barangay_id) === selectedBarangayId)?.barangay_name ?? ''

  const handleCardClick = (slot: PositionSlot) => {
    setFormName(slot.active?.name ?? '')
    setEditDialog({ open: true, position: slot.position, currentName: slot.active?.name ?? '' })
  }

  const handleFormSave = () => {
    if (!formName.trim() || !editDialog.position) return
    setEditDialog({ open: false, position: null, currentName: '' })
    setSaveConfirmDialog({ open: true, position: editDialog.position, name: formName.trim() })
  }

  const handleConfirmSave = async () => {
    const { position, name } = saveConfirmDialog
    if (!position) return
    setSaveConfirmDialog({ open: false, position: null, name: '' })
    setLoadingDialog(true)
    try {
      await api.post('/api/signatories/', { barangay: Number(selectedBarangayId), position, name })
      await fetchSlots(selectedBarangayId)
      setLoadingDialog(false)
      setSuccessDialog({ open: true, position, name })
    } catch (err: any) {
      setLoadingDialog(false)
      setErrorDialog({ open: true, message: err?.detail ?? 'Failed to save signatory. Please try again.' })
    }
  }

  const handleRestoreClick = (e: React.MouseEvent, signatory: SignatoryRecord) => {
    e.stopPropagation() // prevent the card's own onClick (opens the add/edit dialog) from also firing
    setRestoreConfirmDialog({ open: true, signatory, position: signatory.position })
  }

  const handleConfirmRestore = async () => {
    const { signatory } = restoreConfirmDialog
    if (!signatory) return
    setRestoreConfirmDialog({ open: false, signatory: null, position: null })
    setLoadingDialog(true)
    try {
      await api.post(`/api/signatories/${signatory.signatory_id}/restore/`)
      await fetchSlots(selectedBarangayId)
      setLoadingDialog(false)
      setSuccessDialog({ open: true, position: signatory.position, name: signatory.name })
    } catch (err: any) {
      setLoadingDialog(false)
      setErrorDialog({ open: true, message: err?.detail ?? 'Failed to restore signatory. Please try again.' })
    }
  }

  // gate the whole page behind the barangay list loading, same as Barangay Management
  if (barangaysCache.loading) {
    return (
      <div className="hidden md:flex md:flex-col md:h-full">
        <div className="flex justify-between w-full mb-2">
          <div className="text-[#122A48] flex justify-center items-center text-[15px]">
            <p className="font-bold">Signatories</p>
          </div>
        </div>
        <div className="bg-[#FAFCFD] rounded-lg border-2 border-[#C6C6C8] mt-2 p-4 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex flex-col flex-1">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-9 w-48 rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-4 items-start">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border-2 border-[#C6C6C8] p-4 flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* title container */}
        <div className="flex justify-between w-full mb-2">
          <div className="text-[#122A48] flex justify-center items-center text-[15px]">
            <p className="font-bold">Signatories</p>
          </div>
        </div>

        {/* panel */}
        <div className="bg-[#FAFCFD] rounded-lg border-2 border-[#C6C6C8] mt-2 p-4 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex flex-col flex-1 min-h-[528px]">

          <div className="flex justify-between items-center mb-4">
            <p className="text-[#122A48] font-bold text-sm">
              Signatories for <span className="text-[#1565BC]">{selectedBarangayName || '...'}</span>
            </p>

            <Select value={selectedBarangayId} onValueChange={setSelectedBarangayId}>
              <SelectTrigger className="cursor-pointer text-xs w-48 px-3 py-3 bg-[#FAFCFD] border border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="Select Barangay" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                {[...barangays].sort((a, b) => a.barangay_name.localeCompare(b.barangay_name)).map(b => (
                  <SelectItem className="p-2 cursor-pointer text-xs" key={b.barangay_id} value={String(b.barangay_id)}>
                    {b.barangay_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* signatory cards */}
          {!slotsLoading && !slotsError && (
            <div className="grid grid-cols-2 gap-4">
              {slots.map(slot => {
                const meta = POSITION_META[slot.position]
                const Icon = meta?.icon ?? UserRound
                return (
                  <div
                    key={slot.position}
                    onClick={() => handleCardClick(slot)}
                    className={`cursor-pointer rounded-lg border-2 p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-[0_6px_10px_-6px_rgba(0,0,0,0.25)] ${
                      slot.active ? "border-[#C6C6C8] bg-[#FAFCFD]" : "border-dashed border-[#C6C6C8] bg-[#F4F6F7] hover:bg-[#EEF2F3]"
                    }`}
                    style={{ borderLeftColor: meta?.color ?? '#C6C6C8', borderLeftWidth: slot.active ? '4px' : '2px' }}
                  >
                    {/* header */}
                    <div className="flex items-center gap-3 group">
                      <div
                        className="p-2.5 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                        style={{ backgroundColor: slot.active ? `${meta?.color}29` : '#E5E5E6' }}
                      >
                        <Icon size={18} color={slot.active ? meta?.color : "#727272"} />
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[11px] text-[#727272] font-semibold uppercase tracking-wide">{slot.position}</p>
                        {slot.active ? (
                          <p className="font-medium text-[14px] text-[#122A48]">{slot.active.name}</p>
                        ) : (
                          <p className="text-[13px] text-[#727272] italic group-hover:text-[#1565BC] transition-colors">Click to add signatory</p>
                        )}
                      </div>
                    </div>

                    {/* past signatories — always shown, with empty state */}
                    <div className="pt-3 border-t border-[#C6C6C8] flex flex-col gap-2">
                      <p className="text-[10px] text-[#727272] font-semibold uppercase tracking-wide">Past Signatories</p>
                      {slot.history.length > 0 ? (
                        slot.history.map(past => (
                          <div
                            key={past.signatory_id}
                            className="flex items-center justify-between border border-[#C6C6C8] rounded-lg px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="text-[#122A48] text-xs font-medium">{past.name}</span>
                              <span className="text-[#727272] text-[10px]">
                                {new Date(past.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <Button
                              onClick={(e) => handleRestoreClick(e, past)}
                              className="rounded-lg border border-[#C6C6C8] bg-transparent hover:bg-[#edebeb] text-[#122A48] px-3 h-7 text-xs cursor-pointer"
                            >
                              Restore
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[12px] text-[#727272] italic">No past signatories yet</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* slots loading state (on barangay switch) */}
          {slotsLoading && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              <SpinnerIcon size={28} color="#1565BC" />
            </div>
          )}

          {/* slots fetch error state */}
          {slotsError && !slotsLoading && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              <div className="text-[#D81010] text-center">
                <p className="font-semibold">Failed to load signatories</p>
                <p className="text-sm">Please try again later</p>
              </div>
              <Button onClick={() => fetchSlots(selectedBarangayId)} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">
                Retry
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* edit / add signatory dialog */}
      {(() => {
        const meta = editDialog.position ? POSITION_META[editDialog.position] : undefined
        const Icon = meta?.icon ?? UserRound
        const isEdit = !!editDialog.currentName
        return (
          <Dialog open={editDialog.open}>
            <DialogContent className="overflow-y-auto [&>button]:hidden p-0 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] text-[#122A48] sm:max-w-110">
              <DialogHeader>
                <div className="flex items-start justify-between gap-3 p-4 py-3 md:p-5 md:py-4">
                  <div className="flex gap-3 min-w-0">
                    <div
                      className="flex-shrink-0 self-start rounded-lg p-1.5 md:p-2 text-white"
                      style={{ backgroundColor: meta?.color ?? '#1565BC' }}
                    >
                      <Icon className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-base md:text-base">
                        {isEdit ? 'Change' : 'Add'} {editDialog.position}
                      </p>
                      <p className="text-[10px] md:text-xs text-[#727272]">
                        {meta?.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditDialog({ open: false, position: null, currentName: '' })}
                    className="cursor-pointer flex-shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>
              </DialogHeader>

              <DialogTitle className="sr-only">
                {isEdit ? 'Change' : 'Add'} Signatory — {editDialog.position}
              </DialogTitle>

              <div className="border-t border-[#C6C6C8] p-4 md:p-5 -mt-3">
                <label className="text-xs font-semibold text-[#727272] mb-1.5 block">Full Name</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  className="text-sm"
                />
                <div className="flex gap-3 justify-end mt-4">
                  <Button
                    onClick={() => setEditDialog({ open: false, position: null, currentName: '' })}
                    className="rounded-lg border border-[#C6C6C8] px-4 h-9 cursor-pointer text-sm bg-transparent hover:bg-[#edebeb] text-[#727272]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleFormSave}
                    disabled={!formName.trim()}
                    className="rounded-lg px-4 h-9 cursor-pointer text-sm bg-[#1565BC] text-white hover:bg-[#124e91] disabled:opacity-50"
                  >
                    Save
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )
      })()}

      <DialogModal
        open={saveConfirmDialog.open}
        onClose={() => setSaveConfirmDialog({ open: false, position: null, name: '' })}
        onConfirm={handleConfirmSave}
        color={DIALOG_COLOR.lightblue}
        icon={UserRound}
        iconColor={DIALOG_COLOR.blue}
        title="Confirm Signatory Change"
        description={
          <span>
            Set <strong>{saveConfirmDialog.name}</strong> as the <strong>{saveConfirmDialog.position}</strong> for <strong>{selectedBarangayName}</strong>? This will replace the current signatory for this position.
          </span>
        }
        cancelLabel="Cancel"
        confirmLabel="Confirm"
      />

      <DialogModal
        open={loadingDialog}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title="Saving Changes"
        description="Updating signatory, please wait..."
      />

      <DialogModal
        open={successDialog.open}
        onConfirm={() => setSuccessDialog({ open: false, position: null, name: '' })}
        color={DIALOG_COLOR.lightgreen}
        icon={BadgeCheck}
        iconColor={DIALOG_COLOR.green}
        title="Signatory Updated!"
        description={<span><strong>{successDialog.name}</strong> is now the {successDialog.position} for {selectedBarangayName}.</span>}
        confirmLabel="Done"
      />

      <DialogModal
        open={errorDialog.open}
        onConfirm={() => setErrorDialog({ open: false, message: '' })}
        color={DIALOG_COLOR.lightred}
        icon={X}
        iconColor={DIALOG_COLOR.red}
        title="Something Went Wrong"
        description={errorDialog.message}
        confirmLabel="Okay"
      />

      <DialogModal
        open={restoreConfirmDialog.open}
        onClose={() => setRestoreConfirmDialog({ open: false, signatory: null, position: null })}
        onConfirm={handleConfirmRestore}
        color={DIALOG_COLOR.lightblue}
        icon={UserRound}
        iconColor={DIALOG_COLOR.blue}
        title="Restore Signatory"
        description={
          <span>
            Restore <strong>{restoreConfirmDialog.signatory?.name}</strong> as the <strong>{restoreConfirmDialog.position}</strong> for <strong>{selectedBarangayName}</strong>? The current signatory for this position will be moved to history.
          </span>
        }
        cancelLabel="Cancel"
        confirmLabel="Restore"
      />
    </>
  )
}