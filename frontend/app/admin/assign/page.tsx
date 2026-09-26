"use client"

// icons
import { RadioTower, BadgeCheck, CircleOff, Map, SquarePen, MapPinPlus, MapPinPen, X, Unplug } from "lucide-react"

// react
import { useState, useEffect, useCallback } from "react"

// shadcn
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogTitle, DialogContent, DialogHeader } from "@/components/ui/dialog"

// component
import { SearchFilter } from "@/components/SearchFilter"
import { TablePagination } from "@/components/TablePagination"
import { usePagination } from "@/components/hooks/usePagination"
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import { DialogModal } from "@/components/DialogModal"
import { AssignNodeDialog, AssignNodeDialogPayload } from "@/components/AssignNodeDialog"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { AssignSkeleton } from "@/components/Skeleton/Admin/AssignSkeleton"
import { useFillRows } from "@/components/hooks/useFillRows"

// lib
import { DIALOG_COLOR } from "@/lib/constant"
import { fetchWithAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { usePageCache } from "@/components/hooks/usePageCache"


type SensorNode = {
  node_id: number
  barangay_details: { barangay_id: number; barangay_name: string } | null
  hotspot_details: { hotspot_id: number; name: string; latitude: number; longitude: number } | null
  node_name: string
  availability_status: string
  status: string
  installed_at: string
  condition: string | null
  water_level: number | null
  clog_pct: number | null
}

type Barangay = {
  barangay_id: number
  barangay_name: string
}

type Hotspot = {
  hotspot_id: number
  name: string
  latitude: number
  longitude: number
  barangay_details?: { barangay_id: number; barangay_name: string } | null
}

type DialogState = {
  open: boolean
  node?: SensorNode | null
}

// fetch raw data
const fetchAssignedNodesRaw = async (): Promise<SensorNode[]> => {
  const res = await fetchWithAuth(
    `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/?availability_status=Occupied`
  )
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchBarangaysRaw = async (): Promise<Barangay[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/barangays/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchAllHotspotsRaw = async (): Promise<Hotspot[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function NodeAssignment() {
  const assignedNodesCache = usePageCache('assign:assignedNodes', fetchAssignedNodesRaw, [] as SensorNode[], { autoFetch: false })
  const assignedNodes = assignedNodesCache.data

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')

  const barangaysCache = usePageCache('assign:barangays', fetchBarangaysRaw, [] as Barangay[], { autoFetch: false })
  const allBarangays = barangaysCache.data
  const allHotspotsCache = usePageCache('assign:allHotspots', fetchAllHotspotsRaw, [] as Hotspot[], { autoFetch: false })
  const allHotspots = allHotspotsCache.data

  const [pendingAssignment, setPendingAssignment] = useState<AssignNodeDialogPayload | null>(null)

  const fetchError = assignedNodesCache.error || barangaysCache.error || allHotspotsCache.error
  const loading = assignedNodesCache.loading || barangaysCache.loading || allHotspotsCache.loading

  const [successDialog, setSuccessDialog] = useState<{ open: boolean }>({ open: false })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [actionResult, setActionResult] = useState<{ message: string } | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<{ title: string; description: string }>({
    title: "Assigning Node",
    description: "Processing. Please wait.",
  })

  const [assignFormDialog, setAssignFormDialog] = useState<DialogState>({ open: false, node: null })
  const [viewMapDialog, setViewMapDialog] = useState<DialogState>({ open: false, node: null })
  const [loadingDialog, setLoadingDialog] = useState<DialogState>({ open: false })
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({ open: false })
  const [cancelDialog, setCancelDialog] = useState<DialogState>({ open: false })
  const [unassignDialog, setUnassignDialog] = useState<DialogState>({ open: false, node: null })

  const isEdit = !!assignFormDialog.node

  const filtered = assignedNodes
    .filter(n => statusFilter === 'All Status' || n.status === statusFilter)
    .filter(n =>
      [n.node_name, n.barangay_details?.barangay_name, n.hotspot_details?.name]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b.node_id - a.node_id)

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 5,
    deps: [loading],
  })

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)

  const total    = assignedNodes.length
  const active   = assignedNodes.filter(n => n.status === 'Active').length
  const inactive = assignedNodes.filter(n => n.status === 'Inactive').length

  const allHotspotMarkers = allHotspots.map(h => {
    const assignedNode = assignedNodes.find(n => n.hotspot_details?.hotspot_id === h.hotspot_id)
    return {
      latitude: h.latitude,
      longitude: h.longitude,
      label: assignedNode
        ? `${assignedNode.node_name} – ${assignedNode.barangay_details?.barangay_name ?? ''}`
        : h.name,
      condition: assignedNode ? 'Occupied' : 'Available',
      sublabel: assignedNode 
        ? `Occupying: ${h.name}`
        : "Available hotspot",
      usePin: !!assignedNode,
      barangay_id: h.barangay_details?.barangay_id ?? null,
    }
  })

  // Occupied-only, for the node "view on map" dialog — unoccupied hotspots aren't relevant there.
  const occupiedHotspotMarkers = allHotspotMarkers.filter(m => m.condition === 'Occupied')

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      assignedNodesCache.refetch(),
      barangaysCache.refetch(),
      allHotspotsCache.refetch(),
    ])
    setCurrentPage(1)
  }, [])

  useEffect(() => {
    refetchAll()
  }, [])

  const handleDialogConfirm = (payload: AssignNodeDialogPayload) => {
    setPendingAssignment(payload)
    setConfirmDialog({ open: true })
  }

  const handleCancel = () => {
    setCancelDialog({ open: false })
    setAssignFormDialog({ open: false, node: null })
  }

  const handleSubmit = async () => {
    setConfirmDialog({ open: false })
    setLoadingMessage({
      title: isEdit ? "Saving Changes" : "Assigning Node",
      description: "Processing. Please wait.",
    })
    setLoadingDialog({ open: true })

    if (!pendingAssignment) { setLoadingDialog({ open: false }); return }
    const { selectedNodeId, barangay, hotspot, installedAt } = pendingAssignment

    const payload = {
      barangay: parseInt(barangay),
      hotspot: parseInt(hotspot),
      installed_at: installedAt ? new Date(installedAt).toISOString() : undefined,
    }

    try {
      if (isEdit) {
        const updated = await api.patch(`/api/sensor-nodes/${assignFormDialog.node!.node_id}/`, payload)
        assignedNodesCache.setData(prev => prev.map(n =>
          n.node_id === assignFormDialog.node!.node_id ? { ...n, ...updated } : n
        ))
        setActionResult({ message: `${assignFormDialog.node!.node_name}'s assignment has been updated successfully.` })
      } else {
        const updated = await api.patch(`/api/sensor-nodes/${selectedNodeId}/`, payload)
        assignedNodesCache.setData(prev => [updated, ...prev])
        setActionResult({ message: 'Node has been assigned successfully.' })
      }
      setAssignFormDialog({ open: false, node: null })
      setPendingAssignment(null)
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? err?.error ?? 'Something went wrong. Please try again.' })
    }
  }

  const handleUnassign = async (node: SensorNode) => {
    setUnassignDialog({ open: false, node: null })
    setLoadingMessage({ title: "Unassigning Node", description: `Unassigning ${node.node_name}. Please wait.` })
    setLoadingDialog({ open: true })
    try {
      await api.post(`/api/sensor-nodes/${node.node_id}/unassign/`, {})
      assignedNodesCache.setData(prev => prev.filter(n => n.node_id !== node.node_id))
      setActionResult({ message: `${node.node_name} has been unassigned successfully.` })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? `Failed to unassign ${node.node_name}. Please try again.` })
    }
  }

  const handleSuccessConfirm = () => {
    setSuccessDialog({ open: false })
    setActionResult(null)
  }

  if (loading) return <AssignSkeleton/>

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* Header */}
        <div className="flex justify-between w-full">
          <div className="font-bold text-[#122A48] flex justify-center items-center text-[15px]">
            <p>Node Assignment</p>
          </div>
          <Button
            onClick={() => setAssignFormDialog({ open: true, node: null })}
            className="p-5 py-[16px] rounded-lg cursor-pointer bg-[#1565BC] hover:bg-[#135499] text-white shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]"
          >
            <MapPinPlus size={16} /> Assign Node
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 w-full text-[#122A48] mt-2">
          {[
            { icon: <RadioTower size={20} color="#2C7B3C" />, bg: "bg-[#CDE3DE]", count: total,    label: "Total Assigned" },
            { icon: <BadgeCheck size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: active,   label: "Active" },
            { icon: <CircleOff size={20} color="#D81010" />,  bg: "bg-[#FFE5E5]", count: inactive, label: "Inactive" },
          ].map(card => (
            <div key={card.label} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-[#122A48] leading-tight">{card.count}</span>
                <p className="text-xs text-[#122A48]">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex gap-4 mt-3 flex-1 min-h-[528px]">
          <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col">
            <div className="flex justify-between items-center p-2">
              <p className="font-bold text-[#122A48] text-sm">Assigned Canal Nodes</p>

              <div className="flex gap-3 items-center">
                <SearchFilter value={search} onChange={setSearch} placeholder="Search assigned node..." width="w-60" height="h-8" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="cursor-pointer text-xs w-36 px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-36 min-w-0">
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="All Status">All Status</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Active">Active</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                  <TableRow>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">BARANGAY</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE NAME</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">HOTSPOT</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">LOCATION</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">STATUS</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">INSTALLED</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {!fetchError && filtered.length > 0 && paginated.map(node => (
                      <TableRow key={node.node_id} className="border-b border-[#C6C6C8]">
                        <TableCell className="text-[#122A48] text-left h-14 text-xs">{node.node_id}</TableCell>
                        <TableCell className="text-[#122A48] text-left h-14 text-xs">{node.barangay_details?.barangay_name ?? '—'}</TableCell>
                        <TableCell className="text-[#122A48] text-left h-14 text-xs">{node.node_name}</TableCell>
                        <TableCell className="text-[#122A48] text-left h-14 text-xs">{node.hotspot_details?.name ?? '—'}</TableCell>
                        <TableCell className="text-left h-14 text-xs">
                          <Button
                            className="text-xs text-[#2C7B3C] bg-[#B2FBC173] hover:bg-[#9ae2a873] cursor-pointer"
                            onClick={() => setViewMapDialog({ open: true, node })}
                          >
                            <Map size={16} /> View on map
                          </Button>
                        </TableCell>
                        <TableCell className="text-left h-18">
                          <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ${
                            node.status === 'Active' ? 'bg-[#B2FBC173] text-[#2C7B3C]' : 'bg-[#FFE5E5] text-[#D81010]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              node.status === 'Active' ? 'bg-[#1D8104]' : 'bg-[#BB2325]'
                            }`} />
                            {node.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#122A48] text-left h-14 text-xs">
                          {node.installed_at
                            ? new Date(node.installed_at.replace(' ', 'T')).toLocaleDateString('en-PH', {
                                year: 'numeric', month: 'short', day: 'numeric'
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="text-[#122A48] flex gap-2 justify-left items-center h-14 text-xs">
                          <Button
                            onClick={() => setAssignFormDialog({ open: true, node })}
                            className="flex gap-2 text-[#122A48] rounded-lg bg-[#CDE3DE45] hover:bg-[#75928a45] cursor-pointer border border-[#1565BC80] py-3.5 text-xs px-3"
                          >
                            <SquarePen size={16} /> Edit
                          </Button>
                          <Button
                            onClick={() => setUnassignDialog({ open: true, node })}
                            className="flex gap-2 text-[#FF9705] rounded-lg bg-[#FFF3E0] hover:bg-[#ffe0b2] cursor-pointer border border-[#C6C6C8] py-3.5 text-xs px-3"
                          >
                            <Unplug size={16} /> Unassign
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>

            {fetchError && (
              <div className="flex-1 flex flex-col justify-center items-center gap-3">
                {(assignedNodesCache.retrying || barangaysCache.retrying || allHotspotsCache.retrying) ? (
                  <div className="flex flex-col items-center gap-3">
                    <SpinnerIcon size={32} color="#D81010" />
                    <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[#D81010] text-center">
                      <p className="font-semibold">Failed to load assigned nodes</p>
                      <p className="text-sm">Please try again later</p>
                    </div>
                    <Button onClick={refetchAll} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                  </>
                )}
              </div>
            )}

            {!fetchError && filtered.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
                <div className="rounded-full bg-[#E5E5E6] p-3">
                  <RadioTower size={30} color="#727272" />
                </div>
                <p className="text-[#122A48] font-bold">No nodes assigned yet</p>
                <p className="text-[#727272] text-xs">Assign an available node to a canal hotspot.</p>
                <Button
                  onClick={() => setAssignFormDialog({ open: true, node: null })}
                  className="cursor-pointer bg-transparent rounded-lg border border-[#727272] text-[#122A48] px-3 py-2 hover:bg-gray-100"
                >
                  + Assign Node
                </Button>
              </div>
            )}
            
            <div className="mt-auto">
              <TablePagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Assign Form Dialog */}
      <AssignNodeDialog
        open={assignFormDialog.open}
        node={assignFormDialog.node ?? null}
        allBarangays={allBarangays}
        allHotspotMarkers={allHotspotMarkers}
        loadingBarangays={loading}
        onCancel={() => setCancelDialog({ open: true })}
        onConfirm={handleDialogConfirm}
      />

      {/* View Map Dialog */}
      <Dialog open={viewMapDialog.open}>
        <DialogContent className="[&>button]:hidden p-4 md:p-6 text-[#122A48] rounded-lg border border-[#C6C6C8] min-w-80 md:min-w-150">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <p className="font-bold text-base md:text-lg">{viewMapDialog.node?.node_name}</p>
              <button className="cursor-pointer" onClick={() => setViewMapDialog({ open: false, node: null })}>
                <X size={18} />
              </button>
            </div>
          </DialogHeader>
          <div className="h-100 md:h-[380px] rounded-b-lg w-70 md:w-140 overflow-hidden">
            <AgosMapWrapper
              latitude={viewMapDialog.node?.hotspot_details?.latitude}
              longitude={viewMapDialog.node?.hotspot_details?.longitude}
              markers={occupiedHotspotMarkers}
              zoom={13}
              showLegend={false}
              colorMode="availability"
            />
          </div>
          <div className="border-t border-[#C6C6C8] flex justify-between py-3 -mb-4">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <p className="text-xs md:text-sm">{viewMapDialog.node?.hotspot_details?.latitude}</p>
              <p className="text-xs md:text-sm">{viewMapDialog.node?.hotspot_details?.longitude}</p>
            </div>
            <Button
              disabled={!viewMapDialog.node?.hotspot_details?.latitude}
              onClick={() => {
                const n = viewMapDialog.node
                if (!n) return
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${n.hotspot_details?.latitude},${n.hotspot_details?.longitude}`,
                  '_blank'
                )
              }}
              className="cursor-pointer rounded-lg border border-[#C6C6C8] bg-[#FAFCFD] hover:bg-[#d6e4eb] px-3 py-2 md:px-4 md:py-3 text-[#727272]"
            >
              <Map /> Open in Maps
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <DialogModal
        open={cancelDialog.open}
        onClose={() => setCancelDialog({ open: false })}
        onConfirm={handleCancel}
        color={isEdit ? DIALOG_COLOR.lightyellow : DIALOG_COLOR.lightred}
        icon={isEdit ? SquarePen : X}
        iconColor={isEdit ? DIALOG_COLOR.yellow : DIALOG_COLOR.red}
        title={isEdit ? "Cancel Changes" : "Cancel Assignment"}
        description={isEdit ? 'Unsaved changes will be lost.' : 'Are you sure you want to cancel?'}
        cancelLabel="Keep Editing"
        confirmLabel="Yes, Cancel"
      />

      {/* Confirm dialog */}
      <DialogModal
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false })}
        onConfirm={handleSubmit}
        color={DIALOG_COLOR.lightgreen}
        icon={isEdit ? MapPinPen : MapPinPlus}
        iconColor={DIALOG_COLOR.green}
        title={isEdit ? 'Confirm Changes' : 'Confirm Assignment'}
        description={isEdit
          ? <> Are you sure you want to update this node's assignment? </>
          : <> Are you sure you want to assign this node? </>
        }
        cancelLabel="Keep Editing"
        confirmLabel={isEdit ? 'Confirm Changes' : 'Assign Node'}
      />

      {/* Loading dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={isEdit ? "Saving Changes" : "Assigning Node"}
        description={<> Processing. Please wait. </>}
      />

      {/* Unassign dialog */}
      <DialogModal
        open={unassignDialog.open}
        onClose={() => setUnassignDialog({ open: false, node: null })}
        onConfirm={() => handleUnassign(unassignDialog.node!)}
        color={DIALOG_COLOR.lightyellow}
        icon={Unplug}
        iconColor={DIALOG_COLOR.yellow}
        title="Unassign Node"
        description={<> Are you sure you want to unassign <strong>{unassignDialog.node?.node_name}</strong>? It will return to Available in Node Management. </>}
        cancelLabel="Cancel"
        confirmLabel="Unassign"
      />

      {/* Loading dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={loadingMessage.title}
        description={<>{loadingMessage.description}</>}
      />

      {/* Success dialog */}
      <DialogModal
        open={successDialog.open}
        onConfirm={handleSuccessConfirm}
        color={DIALOG_COLOR.lightgreen}
        icon={BadgeCheck}
        iconColor={DIALOG_COLOR.green}
        title="Success!"
        description={actionResult?.message}
        confirmLabel="Done"
      />

      {/* Error dialog */}
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
    </>
  )
}