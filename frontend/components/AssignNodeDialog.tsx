"use client"

import { useState, useEffect, useRef } from "react"
import { MapPinPen, MapPinPlus, MapPin, Navigation, Check, X } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogTitle, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import { fetchWithAuth } from "@/lib/auth"

type DialogHotspot = {
  hotspot_id: number
  name: string
  latitude: number
  longitude: number
}

type DialogBarangay = { barangay_id: number; barangay_name: string }
type DialogAvailableNode = { node_id: number; node_name: string }

type DialogNode = {
  node_id: number
  node_name: string
  barangay_details: { barangay_id: number; barangay_name: string } | null
  hotspot_details: { hotspot_id: number; name: string; latitude: number; longitude: number } | null
  installed_at: string
}

export type HotspotMarker = {
  latitude: number
  longitude: number
  label: string
  condition: string
  sublabel?: string
  usePin?: boolean
  barangay_id: number | null
}

export type AssignNodeDialogPayload = {
  selectedNodeId: string | null // null when node is already fixed (no picker shown)
  barangay: string
  hotspot: string
  installedAt: string
}

type Props = {
  open: boolean
  // Pass null to show the "pick a node" flow (new assignment).
  // Pass a node to hide the picker and assign/reassign that specific node.
  node: DialogNode | null
  allBarangays: DialogBarangay[]
  allHotspotMarkers: HotspotMarker[]
  loadingBarangays?: boolean
  onCancel: () => void
  onConfirm: (payload: AssignNodeDialogPayload) => void
}

export function AssignNodeDialog({
  open,
  node,
  allBarangays,
  allHotspotMarkers,
  loadingBarangays = false,
  onCancel,
  onConfirm,
}: Props) {
  const isEdit = !!node

  const [availableNodes, setAvailableNodes] = useState<DialogAvailableNode[]>([])
  const [loadingAvailableNodes, setLoadingAvailableNodes] = useState(false)
  const [selectedNode, setSelectedNode] = useState('')

  const [barangay, setBarangay] = useState('')
  const [hotspot, setHotspot] = useState('')
  const [installedAt, setInstalledAt] = useState('')
  const [originalHotspot, setOriginalHotspot] = useState('')
  const [originalInstalledAt, setOriginalInstalledAt] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const [hotspots, setHotspots] = useState<DialogHotspot[]>([])
  const [loadingHotspots, setLoadingHotspots] = useState(false)

  const selectedNodeRef = useRef<HTMLDivElement>(null)
  const barangayRef = useRef<HTMLDivElement>(null)
  const hotspotRef = useRef<HTMLDivElement>(null)
  const installedAtRef = useRef<HTMLDivElement>(null)

  const selectedHotspot = hotspots.find(h => String(h.hotspot_id) === hotspot)

  const formHotspotMarkers = barangay
    ? allHotspotMarkers.filter(m => String(m.barangay_id) === barangay)
    : allHotspotMarkers

  // Fetch available nodes when opening for a brand-new assignment (no fixed node).
  useEffect(() => {
    if (!open || node) return
    const fetchAvailableNodes = async () => {
      setLoadingAvailableNodes(true)
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/?availability_status=Available&node_status=Active`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setAvailableNodes(data.results ?? data)
      } catch {} finally {
        setLoadingAvailableNodes(false)
      }
    }
    fetchAvailableNodes()
  }, [open])

  // Populate the form when reassigning a fixed node, reset otherwise.
  useEffect(() => {
    if (node) {
      setBarangay(String(node.barangay_details?.barangay_id ?? ''))
      const currentHotspot = String(node.hotspot_details?.hotspot_id ?? '')
      setHotspot(currentHotspot)
      const currentInstalledAt = node.installed_at
        ? new Date(node.installed_at).toISOString().split('T')[0]
        : ''
      setInstalledAt(currentInstalledAt)
      setOriginalHotspot(currentHotspot)
      setOriginalInstalledAt(currentInstalledAt)
    } else {
      setSelectedNode('')
      setBarangay('')
      setHotspot('')
      setInstalledAt('')
      setOriginalHotspot('')
      setOriginalInstalledAt('')
      setFieldErrors({})
    }
  }, [open])

  // Fetch available hotspots when the chosen barangay changes.
  useEffect(() => {
    if (!barangay) { setHotspots([]); setHotspot(''); return }

    const fetchHotspots = async () => {
      setLoadingHotspots(true)
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/barangay/${barangay}/available/`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        let spots: DialogHotspot[] = data.results ?? data

        if (node?.hotspot_details) {
          const current = node.hotspot_details
          const alreadyIncluded = spots.some(h => h.hotspot_id === current.hotspot_id)
          if (!alreadyIncluded) {
            spots = [{ hotspot_id: current.hotspot_id, name: current.name, latitude: current.latitude, longitude: current.longitude }, ...spots]
          }
        }

        setHotspots(spots)
      } catch { setHotspots([]) } finally {
        setLoadingHotspots(false)
      }
    }
    fetchHotspots()
  }, [barangay])

  const handleConfirmClick = () => {
    const errors: Record<string, string> = {}
    if (!isEdit && !selectedNode.trim()) errors.selectedNode = "This field is required."
    if (!barangay.trim()) errors.barangay = "This field is required."
    if (!hotspot.trim()) errors.hotspot = "This field is required."
    if (!installedAt.trim()) {
      errors.installedAt = "This field is required."
    } else if (
      isEdit &&
      hotspot !== originalHotspot &&
      installedAt === originalInstalledAt
    ) {
      errors.installedAt = "You're moving this node to a new hotspot — confirm or update the install date."
    }

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      if (errors.selectedNode) {
        selectedNodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.barangay) {
        barangayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.hotspot) {
        hotspotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.installedAt) {
        installedAtRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    onConfirm({
      selectedNodeId: isEdit ? null : selectedNode,
      barangay,
      hotspot,
      installedAt,
    })
  }

  return (
    <Dialog open={open}>
      <DialogContent className="overflow-y-auto [&>button]:hidden p-0 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] text-[#122A48] min-w-80 md:min-w-180 max-h-150">
        <DialogHeader>
          <div className="flex gap-3 p-4 py-3 md:p-5 md:py-5 justify-between">
            <div className="flex gap-3">
              <div className={`flex-shrink-0 self-start rounded-lg p-2 md:p-2.5 text-white ${isEdit ? 'bg-[#FF9705] mt-0.5' : 'bg-[#1565BC] mt-1.5 md:mt-0.5'}`}>
                {isEdit ? <MapPinPen className="md:h-7.5 md:w-7.5" /> : <MapPinPlus className="md:h-7.5 md:w-7.5" />}
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-base md:text-lg">{isEdit ? node?.node_name ?? 'Edit Assignment' : 'Assign Node'}</p>
                <p className="text-[10px] md:text-sm text-[#727272]">
                  {isEdit ? "Update this node's hotspot assignment." : 'Assign an available node to a canal hotspot.'}
                </p>
              </div>
            </div>
            <button type="button" onClick={onCancel} className="cursor-pointer flex-shrink-0">
              <X size={18} />
            </button>
          </div>
        </DialogHeader>
        <DialogTitle className="sr-only">{isEdit ? 'Edit Assignment' : 'Assign Node'}</DialogTitle>

        <form>
          <div className="border-t border-[#C6C6C8] p-4 md:p-5 -mt-3">
            <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className="flex gap-2 md:gap-3 p-2.5 md:p-4">
                <div className="rounded-lg bg-[#CDE3DE] p-1.5 md:p-2">
                  <MapPin className="text-[#1565BC] h-5 w-5 md:h-7.5 md:w-7.5" />
                </div>
                <div className="flex flex-col">
                  <p className="font-bold text-xs md:text-base">Assignment Details</p>
                  <p className="text-[10px] md:text-xs text-[#727272]">Select a node and map it to a canal hotspot</p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-[#C6C6C8] p-2.5 md:p-4">
                {/* Node select — create only */}
                {!isEdit && (
                  <div ref={selectedNodeRef}>
                    <Field className="flex gap-1.5 flex-col w-[274px] md:w-[310px]">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                        NODE <span className="text-[#FF0000]">*</span>
                      </FieldLabel>
                      <Select
                        value={selectedNode}
                        onValueChange={val => {
                          setSelectedNode(val)
                          if (fieldErrors.selectedNode) setFieldErrors(prev => ({ ...prev, selectedNode: '' }))
                        }}
                      >
                        <SelectTrigger disabled={loadingAvailableNodes} className={`!font-normal bg-[#1565BC05] py-0 md:py-[20px] text-xs md:text-sm rounded-lg ${fieldErrors.selectedNode ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                          <SelectValue placeholder={loadingAvailableNodes ? "Loading node..." : "Select available node..."} />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                          {availableNodes.length === 0 ? (
                            <div className="p-2 text-xs text-[#727272] text-center">No available nodes</div>
                          ) : (
                            availableNodes.map(n => (
                              <SelectItem key={n.node_id} value={String(n.node_id)} className="p-1 md:p-2 text-[#122A48]">
                                {n.node_name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FieldError className="text-xs">{fieldErrors.selectedNode}</FieldError>
                    </Field>
                  </div>
                )}

                {/* Barangay select */}
                <div ref={barangayRef}>
                  <Field className="flex gap-1.5 flex-col w-[274px] md:w-[310px]">
                    <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                      BARANGAY <span className="text-[#FF0000]">*</span>
                    </FieldLabel>
                    <Select
                      value={barangay}
                      onValueChange={val => {
                        setBarangay(val)
                        setHotspot('')
                        if (fieldErrors.barangay) setFieldErrors(prev => ({ ...prev, barangay: '' }))
                      }}
                    >
                      <SelectTrigger disabled={loadingBarangays} className={`!font-normal bg-[#1565BC05] py-0 md:py-[20px] text-xs md:text-sm rounded-lg ${fieldErrors.barangay ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                        <SelectValue placeholder={loadingBarangays ? "Loading barangay..." : "Select Barangay..."} />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                        {[...allBarangays]
                          .sort((a, b) => a.barangay_name.localeCompare(b.barangay_name))
                          .map(b => (
                            <SelectItem key={b.barangay_id} value={String(b.barangay_id)} className="p-1 md:p-2 text-[#122A48]">
                              {b.barangay_name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FieldError className="text-xs">{fieldErrors.barangay}</FieldError>
                  </Field>
                </div>
              </div>

              <div className="flex gap-3 -mt-4 p-2.5 md:p-4">
                {/* Hotspot select */}
                <div ref={hotspotRef}>
                  <Field className="flex gap-1.5 flex-col w-[274px] md:w-[310px]">
                    <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                      HOTSPOT <span className="text-[#FF0000]">*</span>
                    </FieldLabel>
                    <Select
                      value={hotspot}
                      onValueChange={val => {
                        setHotspot(val)
                        if (fieldErrors.hotspot) setFieldErrors(prev => ({ ...prev, hotspot: '' }))
                      }}
                      disabled={!barangay}
                    >
                      <SelectTrigger disabled={loadingBarangays || !barangay} className={`!font-normal bg-[#1565BC05] py-0 md:py-[20px] text-xs md:text-sm rounded-lg ${fieldErrors.hotspot ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                        <SelectValue
                          placeholder={
                            loadingHotspots
                              ? "Loading..."
                              : !barangay
                                ? "Select barangay first..."
                                : "Select hotspot..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                        {hotspots.length === 0 ? (
                          <div className="p-2 text-xs text-[#727272] text-center">
                            {barangay ? "No available hotspots" : "Select a barangay first"}
                          </div>
                        ) : (
                          hotspots.map(h => (
                            <SelectItem key={h.hotspot_id} value={String(h.hotspot_id)} className="p-1 md:p-2 text-[#122A48]">
                              {h.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FieldError className="text-xs">{fieldErrors.hotspot}</FieldError>
                  </Field>
                </div>

                {/* Installed At */}
                <div ref={installedAtRef}>
                  <Field className="flex gap-1.5 flex-col w-[274px] md:w-[310px]">
                    <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                      INSTALLED AT <span className="text-[#FF0000]">*</span>
                    </FieldLabel>
                    <Input
                      type="date"
                      value={installedAt}
                      onChange={e => {
                        setInstalledAt(e.target.value)
                        if (fieldErrors.installedAt) setFieldErrors(prev => ({ ...prev, installedAt: '' }))
                      }}
                      className={`text-[#122A48] rounded-lg text-xs bg-[#1565BC05] !font-normal md:h-10.5 ${fieldErrors.installedAt ? 'border-[#FF0000]' : 'border-[#727272]'}`}
                    />
                    <FieldError className="text-xs">{fieldErrors.installedAt}</FieldError>
                  </Field>
                </div>
              </div>
            </div>
          </div>

          {/* Map Preview */}
          <div className="p-4 md:p-5 -mt-5 md:-mt-7">
            <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className="flex gap-2 md:gap-3 p-2.5 md:p-4">
                <div className="rounded-lg bg-[#CDE3DE] p-1.5 md:p-2 flex justify-center items-center mt-1.5 md:mt-0">
                  <Navigation className="text-[#1565BC] h-5 w-5 md:h-7.5 md:w-7.5" />
                </div>
                <div className="flex flex-col">
                  <p className="font-bold text-xs md:text-base">Geographic Location</p>
                  <p className="text-[10px] md:text-xs text-[#727272]">Coordinates are auto-filled from the selected hotspot.</p>
                </div>
              </div>
              <div className="p-2.5 md:p-3 -mt-4">
                <div className="rounded-lg bg-[#726D7814] border border-[#C6C6C8]">
                  <div className="p-2.5 md:p-3">
                    <p className="font-semibold text-xs md:text-sm">Map Preview</p>
                  </div>
                  <div className="h-70 md:h-110 border-t border-[#C6C6C8] rounded-b-lg overflow-hidden">
                    <AgosMapWrapper
                      latitude={selectedHotspot?.latitude}
                      longitude={selectedHotspot?.longitude}
                      label={barangay}
                      showLegend={true}
                      colorMode="availability"
                      markers={formHotspotMarkers}
                    />
                  </div>
                </div>
              </div>
              <div className="border-t border-[#C6C6C8] p-2.5 md:p-4">
                <div className="flex gap-3 w-full -mt-3">
                  <div className="mt-3 flex-1">
                    <Field className="flex gap-1.5 flex-col">
                      <FieldLabel className="text-[#122A48] text-[11px] md:text-xs">LATITUDE</FieldLabel>
                      <Input
                        type="number"
                        value={selectedHotspot?.latitude ?? ''}
                        readOnly
                        placeholder="Auto-filled from hotspot"
                        className="text-[#122A48] rounded-lg text-xs bg-[#F0F0F0] cursor-not-allowed !font-normal md:h-9 border-[#727272]"
                      />
                    </Field>
                  </div>
                  <div className="mt-3 flex-1">
                    <Field className="flex gap-1.5 flex-col">
                      <FieldLabel className="text-[#122A48] text-[11px] md:text-xs">LONGITUDE</FieldLabel>
                      <Input
                        type="number"
                        value={selectedHotspot?.longitude ?? ''}
                        readOnly
                        placeholder="Auto-filled from hotspot"
                        className="text-[#122A48] rounded-lg text-xs bg-[#F0F0F0] cursor-not-allowed !font-normal md:h-9 border-[#727272]"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end p-4 -mt-5">
            <Button
              type="button"
              onClick={onCancel}
              className="cursor-pointer hover:bg-[#e3ecf0] bg-[#FAFCFD] border border-[#C6C6C8] text-xs md:text-sm rounded-lg px-5 py-4 text-[#727272]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmClick}
              className="cursor-pointer hover:bg-[#12569f] rounded-lg text-xs md:text-sm px-4 py-4 bg-[#1565BC]"
            >
              <Check />
              {isEdit ? 'Save Changes' : 'Assign Node'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}