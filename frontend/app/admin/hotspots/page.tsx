"use client"

// icons
import { FaPlus } from "react-icons/fa"
import { Target, Map, SquarePen, Trash2, X, Check, Navigation, MapPin, MapPinPlus, MapPinPen, CircleOff, MapPinCheck, ChevronDown, ChevronUp, MoreVertical, BadgeCheck, History, FileDown } from "lucide-react"

// react
import { useState, useEffect, useCallback, useRef, Fragment } from "react"

// shadcn
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

// components
import { SearchFilter } from "@/components/SearchFilter"
import { TablePagination } from "@/components/TablePagination"
import { usePagination } from "@/components/hooks/usePagination"
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import { DialogModal } from "@/components/DialogModal"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { HotspotsSkeleton } from "@/components/Skeleton/Admin/HotspotsSkeleton"
import { PrintReport } from "@/components/PrintReport/PrintReport"

// lib
import { DIALOG_COLOR } from "@/lib/constant"
import { api } from "@/lib/api"
import { fetchWithAuth } from "@/lib/auth"
import { usePageCache } from "@/components/hooks/usePageCache"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

// turf for point-in-polygon check
import booleanPointInPolygon from "@turf/boolean-point-in-polygon"
import { point, feature } from "@turf/helpers"

// hooks
import { useToast } from "@/components/hooks/useToast"
import { Toast } from "@/components/Toast"
import { useFillRows } from "@/components/hooks/useFillRows"


type Barangay = {
  barangay_id: number
  barangay_name: string
  latitude: number
  longitude: number
}

type Hotspot = {
  hotspot_id: number
  barangay_details: { barangay_id: number; barangay_name: string } | null
  name: string
  code: string
  description: string
  latitude: number
  longitude: number
  canal_width: number | null
  canal_shape: string | null
  sensor_height: number | null 
  is_occupied: boolean
  created_at: string
}

type SensorNode = {
  node_id: number
  node_name: string
  latitude: number | null
  longitude: number | null
  status: string
  condition: string | null
  hotspot_details: {
    hotspot_id: number
    name: string
    latitude: number
    longitude: number
  } | null
}

type DialogState = {
  open: boolean
  hotspot?: Hotspot | null
}


let boundaryDataCache: any = null
let boundaryDataPromise: Promise<any> | null = null

async function loadBoundaryData(): Promise<any | null> {
  if (boundaryDataCache) return boundaryDataCache
  if (boundaryDataPromise) return boundaryDataPromise

  boundaryDataPromise = fetch("/data/rosario-barangays.json")
    .then(res => {
      if (!res.ok) throw new Error()
      return res.json()
    })
    .then(data => {
      boundaryDataCache = data
      return data
    })
    .catch(() => null)

  return boundaryDataPromise
}

async function fetchBarangayBoundary(barangayName: string): Promise<any | null> {
  const data = await loadBoundaryData()
  if (!data) return null

  const feature = data.features.find(
    (f: any) => f.properties.adm4_en === barangayName
  )
  return feature ?? null
}

// fetch raw data
const fetchHotspotsRaw = async (): Promise<Hotspot[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/`)
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

const fetchNodesRaw = async (): Promise<SensorNode[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function HotspotManagement() {
  // data
  const hotspotsCache = usePageCache('hotspots:hotspots', fetchHotspotsRaw, [] as Hotspot[], { autoFetch: false })
  const barangaysCache = usePageCache('hotspots:barangays', fetchBarangaysRaw, [] as Barangay[], { autoFetch: false })
  const nodesCache = usePageCache('hotspots:nodes', fetchNodesRaw, [] as SensorNode[], { autoFetch: false })

  const hotspots = hotspotsCache.data
  const allBarangays = barangaysCache.data
  const allNodes = nodesCache.data
  const loading = hotspotsCache.loading || barangaysCache.loading || nodesCache.loading
  const fetchError = hotspotsCache.error || barangaysCache.error || nodesCache.error
  const [hotspotCode, setHotspotCode] = useState("")

  // filters
  const [search, setSearch] = useState("")
  const [filterBarangay, setFilterBarangay] = useState("All")

  const [openBarangayIds, setOpenBarangayIds] = useState<Set<number>>(new Set())
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)

  const toggleBarangayRow = (barangayId: number) => {
    setOpenBarangayIds(prev => {
      const next = new Set(prev)
      next.has(barangayId) ? next.delete(barangayId) : next.add(barangayId)
      return next
    })
  }

  // form state
  const [barangay, setBarangay] = useState("")
  const [description, setDescription] = useState("")
  const [latitude, setLatitude] = useState("")
  const [longitude, setLongitude] = useState("")
  const [canalWidth, setCanalWidth] = useState("")
  const [canalShape, setCanalShape] = useState("rectangular")
  const [sensorHeight, setSensorHeight] = useState("")
  const [canalDepth, setCanalDepth] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // boundary state
  const [boundaryGeoJson, setBoundaryGeoJson] = useState<any>(null)
  const [boundaryLoading, setBoundaryLoading] = useState(false)
  const [boundaryFallback, setBoundaryFallback] = useState(false) 

  // dialogs
  const [formDialog, setFormDialog] = useState<DialogState>({ open: false, hotspot: null })
  const [viewMapDialog, setViewMapDialog] = useState<DialogState>({ open: false, hotspot: null })
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({ open: false })
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean }>({ open: false })
  const [loadingDialog, setLoadingDialog] = useState<{ open: boolean }>({ open: false })
  const [deleteDialog, setDeleteDialog] = useState<DialogState>({ open: false, hotspot: null })
  const [blockedDialog, setBlockedDialog] = useState<{ open: boolean }>({ open: false })
  const [dialogBarangay, setDialogBarangay] = useState<Barangay | null>(null)

  const [successDialog, setSuccessDialog] = useState<{ open: boolean }>({ open: false })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [actionResult, setActionResult] = useState<{ name: string; action: 'Updated' | 'Added' | 'Removed' } | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<{ title: string; description: string }>({
    title: "Saving Changes",
    description: "Processing hotspot details. Please wait.",
  })

  // hotspot history states
  const [hotspotHistoryDialog, setHotspotHistoryDialog] = useState<{ open: boolean; hotspot: Hotspot | null }>({ open: false, hotspot: null })
  const [hotspotHistoryRows, setHotspotHistoryRows] = useState<any[]>([])
  const [hotspotHistoryLoading, setHotspotHistoryLoading] = useState(false)
  const [hotspotHistoryError, setHotspotHistoryError] = useState(false)
  const [hotspotHistoryPage, setHotspotHistoryPage] = useState(1)
  const [hotspotHistoryHasNext, setHotspotHistoryHasNext] = useState(false)
  const [hotspotHistoryHasPrev, setHotspotHistoryHasPrev] = useState(false)

  // history state
  const [historyExporting, setHistoryExporting] = useState(false)
  const [historyPrintRows, setHistoryPrintRows] = useState<(string | number)[][]>([])
  const [triggerPrint, setTriggerPrint] = useState(false)

  useEffect(() => {
    if (triggerPrint) {
      printReport()
      setTriggerPrint(false)
    }
  }, [triggerPrint])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

  const { toasts, addToast, removeToast } = useToast()

  const isEdit = !!formDialog.hotspot

  const filtered = hotspots
    .filter(h => filterBarangay === "All" || String(h.barangay_details?.barangay_id) === filterBarangay)
    .filter(h =>
      [h.name, h.barangay_details?.barangay_name, h.description]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => b.hotspot_id - a.hotspot_id)
  
  // barangay-level rows
  const filteredBarangays = allBarangays
    .filter(b => filterBarangay === "All" || String(b.barangay_id) === filterBarangay)
    .filter(b => b.barangay_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.barangay_name.localeCompare(b.barangay_name))

  const hotspotsByBarangay = (barangayId: number) =>
    hotspots
      .filter(h => h.barangay_details?.barangay_id === barangayId)
      .sort((a, b) => b.hotspot_id - a.hotspot_id)

  const hotspotNameRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const canalWidthRef = useRef<HTMLDivElement>(null)
  const sensorHeightRef = useRef<HTMLDivElement>(null)
  const canalDepthRef = useRef<HTMLDivElement>(null)
  const latitudeRef = useRef<HTMLDivElement>(null)

  const allHotspotMarkers = hotspots.map(h => {
    const assignedNode = allNodes.find(n => n.hotspot_details?.hotspot_id === h.hotspot_id)
    return {
      latitude: h.latitude,
      longitude: h.longitude,
      label: h.name,
      condition: h.is_occupied ? 'Occupied' : 'Available',
      sublabel: assignedNode ? `Assigned: ${assignedNode.node_name}` : 'Available hotspot',
      usePin: h.is_occupied,
    }
  })

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 4,
    deps: [loading],
  })

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filteredBarangays, rows)

  const total = hotspots.length
  const occupied = hotspots.filter(h => h.is_occupied).length
  const available = hotspots.filter(h => !h.is_occupied).length

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      hotspotsCache.refetch(),
      barangaysCache.refetch(),
      nodesCache.refetch(),
    ])
  }, [])

  useEffect(() => {
    refetchAll()
  }, [])

  useEffect(() => {
    if (formDialog.open) {
      if (formDialog.hotspot) {
        // edit
        setBarangay(String(formDialog.hotspot.barangay_details?.barangay_id ?? ""))
        setHotspotCode(formDialog.hotspot.code ?? "")
        setDescription(formDialog.hotspot.description ?? "")
        setLatitude(String(formDialog.hotspot.latitude))
        setLongitude(String(formDialog.hotspot.longitude))
        setCanalWidth(String(formDialog.hotspot.canal_width ?? ""))
        setCanalShape(formDialog.hotspot.canal_shape ?? "rectangular")
        setSensorHeight(String(formDialog.hotspot.sensor_height ?? ""))
        if (formDialog.hotspot.barangay_details?.barangay_name) {
          loadBoundary(formDialog.hotspot.barangay_details.barangay_name)
        }
      } else if (dialogBarangay) {
        // add — prefilled from the barangay row that triggered this
        setBarangay(String(dialogBarangay.barangay_id))
        setDescription("")
        setLatitude("")
        setLongitude("")
        setCanalWidth("")
        setCanalShape("rectangular")
        setSensorHeight("")
        setCanalDepth("")
        setFieldErrors({})
        loadBoundary(dialogBarangay.barangay_name)
        fetchNextHotspotCode(dialogBarangay.barangay_id)
      }
    } else {
      setBarangay("")
      setHotspotCode("")
      setDescription("")
      setLatitude("")
      setLongitude("")
      setCanalWidth("")
      setCanalShape("rectangular")
      setSensorHeight("")
      setFieldErrors({})
      setBoundaryGeoJson(null)
      setBoundaryFallback(false)
      setDialogBarangay(null)
    }
  }, [formDialog.open])

  useEffect(() => {
    if (!hotspotHistoryDialog.open || !hotspotHistoryDialog.hotspot) {
      setHotspotHistoryRows([])
      setHotspotHistoryPage(1)
      return
    }

    const fetchHistory = async () => {
      setHotspotHistoryLoading(true)
      setHotspotHistoryError(false)
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/${hotspotHistoryDialog.hotspot!.hotspot_id}/assignment-history/?page=${hotspotHistoryPage}`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setHotspotHistoryRows(data.results ?? data)
        setHotspotHistoryHasNext(!!data.next)
        setHotspotHistoryHasPrev(!!data.previous)
      } catch {
        setHotspotHistoryError(true)
      } finally {
        setHotspotHistoryLoading(false)
      }
    }
    fetchHistory()
  }, [hotspotHistoryDialog.open, hotspotHistoryDialog.hotspot, hotspotHistoryPage])
  
  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null)
    }
    if (openMenuId !== null) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenuId])


  // Boundary fetch on barangay select
  const loadBoundary = useCallback(async (barangayName: string) => {
    setBoundaryLoading(true)
    setBoundaryGeoJson(null)
    setBoundaryFallback(false)
    const geoJson = await fetchBarangayBoundary(barangayName)
    if (geoJson) {
      setBoundaryGeoJson(geoJson)
      setBoundaryFallback(false)
    } else {
      setBoundaryFallback(true)
    }
    setBoundaryLoading(false)
  }, [])

  const nodeMarkers = allNodes
    .filter(n => n.latitude && n.longitude)
    .map(n => ({
      latitude: n.latitude!,
      longitude: n.longitude!,
      label: n.node_name || `Node ${n.node_id}`,
      condition: n.condition ?? "Normal",
    }))

  const viewMapNodeMarkers = allNodes
    .filter(n => 
      n.latitude && 
      n.longitude && 
      n.hotspot_details?.hotspot_id === viewMapDialog.hotspot?.hotspot_id
    )
    .map(n => ({
      latitude: n.latitude!,
      longitude: n.longitude!,
      label: n.node_name || `Node ${n.node_id}`,
      condition: n.condition ?? "Normal",
    }))


  // handlers
  const fetchNextHotspotCode = async (barangayId: string | number) => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/next-code/?barangay=${barangayId}`)
      if (!res.ok) return
      const data = await res.json()
      setHotspotCode(data.next_code ?? '')
    } catch {
      // silently ignore
    }
  }

  // Map click handler
  const handleMapClick = (lat: number, lng: number) => {
    if (!barangay) {
      addToast("Please select a barangay first.", "error")
      return
    }

    if (boundaryGeoJson && !boundaryFallback) {
      const clickedPoint = point([lng, lat])
      const inside = booleanPointInPolygon(clickedPoint, boundaryGeoJson)
      if (!inside) {
        addToast("That location is outside the selected barangay boundary. Please click inside the highlighted area.", "error")
        return
      }
    }

    setLatitude(String(lat))
    setLongitude(String(lng))
    if (fieldErrors.latitude) setFieldErrors(prev => ({ ...prev, latitude: "", longitude: "" }))
  }

  // validation handlers
  const handleConfirmationDialog = () => {
    const errors: Record<string, string> = {}
    if (!hotspotCode.trim()) errors.hotspotCode = "This field is required."
    if (!description.trim()) errors.description = "This field is required."
    if (!latitude) errors.latitude = "Please click on the map to set the location."
    if (!longitude) errors.longitude = "Please click on the map to set the location."
    if (!canalWidth) errors.canalWidth = "This field is required."
    if (!canalShape) errors.canalShape = "This field is required."
    if (!sensorHeight) errors.sensorHeight = "This field is required."
    if (!canalDepth) errors.canalDepth = "This field is required."

    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      // scroll to first error
      if (errors.hotspotCode) {
        hotspotNameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.description) {
        descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.canalWidth) {
        canalWidthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.sensorHeight) {
        sensorHeightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.canalDepth) {
        canalDepthRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (errors.latitude || errors.longitude) {
        latitudeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    setConfirmDialog({ open: true })
  }

  const handleCancel = () => {
    setCancelDialog({ open: false })
    setFormDialog({ open: false, hotspot: null })
  }

  const handleSubmit = async () => {
    setConfirmDialog({ open: false })
    setLoadingMessage({
      title: isEdit ? "Saving Changes" : "Saving Hotspot",
      description: "Processing hotspot details. Please wait.",
    })
    setLoadingDialog({ open: true })

    const payload = {
      barangay: parseInt(barangay),
      code: hotspotCode.trim(),
      description: description.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      canal_width: canalWidth ? parseFloat(canalWidth) : null,
      canal_shape: canalShape,
      sensor_height: sensorHeight ? parseFloat(sensorHeight) : null,
      canal_depth: canalDepth ? parseFloat(canalDepth) : null,
    }

    try {
      if (isEdit) {
        const updated = await api.patch(`/api/hotspots/${formDialog.hotspot!.hotspot_id}/`, payload)
        hotspotsCache.setData(prev => prev.map(h => h.hotspot_id === formDialog.hotspot!.hotspot_id ? { ...h, ...updated } : h))
        setActionResult({ name: updated.name, action: 'Updated' })
      } else {
        const created = await api.post("/api/hotspots/", payload)
        hotspotsCache.setData(prev => [created, ...prev])
        setActionResult({ name: created.name, action: 'Added' })
      }
      setFormDialog({ open: false, hotspot: null })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      if (err && typeof err === "object") {
        const backendErrors: Record<string, string> = {}
        for (const key in err) {
          const value = Array.isArray(err[key]) ? err[key][0] : err[key]
          backendErrors[key === "code" ? "hotspotCode" : key] = value
        }
        setFieldErrors(prev => ({ ...prev, ...backendErrors }))
      }
      setErrorDialog({ open: true, message: err?.detail ?? err?.code?.[0] ?? err?.name ?? "Something went wrong. Please try again." })
    }
  }

  const handleDeleteClick = (hotspot: Hotspot) => {
    if (hotspot.is_occupied) {
      setBlockedDialog({ open: true })
      return
    }
    setDeleteDialog({ open: true, hotspot })
  }

  const handleDelete = async () => {
    const h = deleteDialog.hotspot
    if (!h) return
    setDeleteDialog({ open: false, hotspot: null })
    setLoadingMessage({
      title: "Removing Hotspot",
      description: `Removing ${h.name}. Please wait.`,
    })
    setLoadingDialog({ open: true })
    try {
      await api.delete(`/api/hotspots/${h.hotspot_id}/`)
      hotspotsCache.setData(prev => prev.filter(x => x.hotspot_id !== h.hotspot_id))
      setActionResult({ name: h.name, action: 'Removed' })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? `Failed to remove ${h.name}. Please try again.` })
    }
  }

  const handleSuccessConfirm = () => {
    setSuccessDialog({ open: false })
    setActionResult(null)
  }

  const fetchAllPages = async (baseUrl: string): Promise<any[]> => {
    let url: string | null = baseUrl
    let all: any[] = []
    while (url) {
      const res = await fetchWithAuth(url)
      if (!res.ok) throw new Error()
      const data = await res.json()
      all = all.concat(data.results ?? data)
      if (!data.next) { url = null; continue }
      const nextUrl = new URL(data.next)
      url = `${process.env.NEXT_PUBLIC_API_URL}${nextUrl.pathname}${nextUrl.search}`
    }
    return all
  }

  const handleExportHistory = async () => {
    if (!hotspotHistoryDialog.hotspot) return
    setHistoryExporting(true)
    try {
      const all = await fetchAllPages(`${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/${hotspotHistoryDialog.hotspot.hotspot_id}/assignment-history/`)
      setHistoryPrintRows(all.map(h => [
        h.node_name || '—',
        new Date(h.started_at).toLocaleDateString(),
        h.ended_at ? new Date(h.ended_at).toLocaleDateString() : 'Current',
        h.end_reason || '—',
      ]))
      setTriggerPrint(true)
    } catch {
      addToast('Failed to export history.', 'error')
    } finally {
      setHistoryExporting(false)
    }
  }

  // selected barangay object for map center fallback
  const selectedBarangay = allBarangays.find(b => String(b.barangay_id) === barangay)
  const selectedBarangayName = selectedBarangay?.barangay_name

  if (loading) return <HotspotsSkeleton/>

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* Header */}
        <div className="flex justify-between w-full mb-2">
          <div className="font-bold text-[#122A48] flex justify-center items-center ">
            <p className="text-[15px]">Canal Hotspots</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 w-full text-[#122A48]">
          {[
            { icon: <Target size={20} color="#1565BC" />, bg: "bg-[#CDE3DE]", count: total, label: "Total Hotspots" },
            { icon: <MapPinCheck size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: available, label: "Available" },
            { icon: <MapPin size={20} color="#1565BC" />, bg: "bg-[#DBEAFE]", count: occupied, label: "Occupied" },
          ].map(card => (
            <div key={card.label} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold leading-tight">{card.count}</span>
                <p className="text-xs  text-[#122A48]">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="flex gap-4 mt-2 flex-1 min-h-[528px]">
          <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full min-w-0 rounded-lg flex flex-col">
            <div className="flex justify-between items-center p-2 px-3">
              <p className="text-sm font-bold text-[#122A48]">Hotspot List</p>

              <div className="flex gap-3 items-center">
                <SearchFilter value={search} onChange={setSearch} placeholder="Search hotspot..." width="w-60" height="h-8" />

                <Select value={filterBarangay} onValueChange={setFilterBarangay}>
                  <SelectTrigger className="cursor-pointer text-xs w-40 px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                    <SelectValue placeholder="All Barangays" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                    <SelectItem value="All" className="cursor-pointer text-xs p-2">All Barangays</SelectItem>
                    {[...allBarangays].sort((a, b) => a.barangay_name.localeCompare(b.barangay_name)).map(b => (
                      <SelectItem className="p-2 cursor-pointer text-xs" key={b.barangay_id} value={String(b.barangay_id)}>{b.barangay_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div ref={tableWrapRef} className="w-full overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                  <TableRow>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">ID</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">BARANGAY</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">HOTSPOTS</TableHead>
                    <TableHead className="font-semibold text-left text-[#727272] text-xs">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                    {!fetchError && filteredBarangays.length > 0 && paginated.map(barangay => {
                      const barangayHotspots = hotspotsByBarangay(barangay.barangay_id)
                      const isOpen = openBarangayIds.has(barangay.barangay_id)

                      return (
                        <Fragment key={barangay.barangay_id}>
                          <TableRow className="border-b border-[#C6C6C8] text-xs">
                            <TableCell className="text-[#122A48] text-left h-14">{barangay.barangay_id}</TableCell>
                            <TableCell className="text-[#122A48] text-left h-14 font-medium">{barangay.barangay_name}</TableCell>
                            <TableCell className="text-[#122A48] text-left h-14">
                              {barangayHotspots.length} Hotspot{barangayHotspots.length !== 1 ? "s" : ""}
                            </TableCell>
                            <TableCell className="text-[#122A48] flex gap-3 justify-left items-left h-14">
                              <Button
                                onClick={() => toggleBarangayRow(barangay.barangay_id)}
                                className="flex gap-2 text-[#122A48] rounded-lg bg-[#FAFCFD] hover:bg-[#eef1f3] cursor-pointer border border-[#C6C6C8] py-3 text-xs px-3"
                              >
                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                View ({barangayHotspots.length})
                              </Button>
                              <Button
                                onClick={() => { setDialogBarangay(barangay); setFormDialog({ open: true, hotspot: null }) }}
                                className="p-3 py-3 rounded-lg cursor-pointer bg-[#1565BC] hover:bg-[#135499] text-white text-xs"
                              >
                                <FaPlus color="white" size={12} /> Add Hotspot
                              </Button>
                            </TableCell>
                          </TableRow>

                          {isOpen && (
                            <TableRow className="border-b border-[#C6C6C8] hover:bg-transparent">
                              <TableCell colSpan={4} className="bg-[#F7F9FA] p-3 pl-10">
                                <div className="flex flex-col gap-2">
                                  {barangayHotspots.length === 0 ? (
                                    <p className="text-[#727272] text-xs py-2 ml-12.5">No hotspots registered for this barangay yet.</p>
                                  ) : (
                                    barangayHotspots.map(hotspot => (
                                      <div
                                        key={hotspot.hotspot_id}
                                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-3 bg-white border border-[#C6C6C8] rounded-lg shadow-[0_2px_4px_-2px_rgba(0,0,0,0.1)] px-4 py-3 w-full"
                                      >
                                        <div className="min-w-0">
                                          <p className="font-bold text-xs text-[#122A48] truncate">{hotspot.name}</p>
                                          <p className="text-[#727272] text-xs capitalize truncate">{hotspot.canal_shape}</p>
                                        </div>
                                        <div className="min-w-0 text-[#727272] text-xs truncate">
                                          {hotspot.description || "—"}
                                        </div>
                                        <div className="flex-shrink-0">
                                          <div className="flex-shrink-0">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                                              hotspot.is_occupied
                                                ? "bg-[#DBEAFE] text-[#1565BC]"
                                                : "bg-[#B2FBC173] text-[#2C7B3C]"
                                            }`}>
                                              <span className={`w-1.5 h-1.5 rounded-full ${hotspot.is_occupied ? "bg-[#1565BC]" : "bg-[#2C7B3C]"}`} />
                                              {hotspot.is_occupied ? "Occupied" : "Available"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex-shrink-0 flex gap-2">
                                          <div className="flex-shrink-0 flex gap-2 relative">
                                            <Button
                                              onClick={() => setViewMapDialog({ open: true, hotspot })}
                                              className="rounded-lg text-xs text-[#2C7B3C] border border-[#C6C6C8] bg-[#B2FBC173] cursor-pointer hover:bg-[#78ee9073] py-3 px-3"
                                            >
                                              <Map size={16} /> View on map
                                            </Button>

                                            <div className="relative">
                                              <Button
                                                id={`menu-btn-${hotspot.hotspot_id}`}
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === hotspot.hotspot_id ? null : hotspot.hotspot_id) }}
                                                className="text-xs text-[#122A48] rounded-lg bg-[#FAFCFD] hover:bg-[#eef1f3] cursor-pointer border border-[#C6C6C8] py-3 px-3"
                                              >
                                                <MoreVertical size={16} />
                                              </Button>

                                              {openMenuId === hotspot.hotspot_id && (
                                                <div className="fixed bg-white border border-[#C6C6C8] rounded-lg shadow-lg z-[9999] w-32 overflow-hidden"
                                                  style={{
                                                    top: document.getElementById(`menu-btn-${hotspot.hotspot_id}`)?.getBoundingClientRect().bottom ?? 0,
                                                    right: window.innerWidth - (document.getElementById(`menu-btn-${hotspot.hotspot_id}`)?.getBoundingClientRect().right ?? 0),
                                                  }}
                                                >
                                                  <button
                                                    onClick={() => { setOpenMenuId(null); setHotspotHistoryDialog({ open: true, hotspot }) }}
                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#1565BC] hover:bg-[#DBEAFE] cursor-pointer"
                                                  >
                                                    <History size={14} /> View History
                                                  </button>
                                                  <button
                                                    onClick={() => { setOpenMenuId(null); setFormDialog({ open: true, hotspot }) }}
                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#1565BC] hover:bg-[#DBEAFE] cursor-pointer"
                                                  >
                                                    <SquarePen size={14} /> Edit
                                                  </button>
                                                  <button
                                                    onClick={() => { setOpenMenuId(null); handleDeleteClick(hotspot) }}
                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#D81010] hover:bg-[#FFE5E5] cursor-pointer"
                                                  >
                                                    <Trash2 size={14} /> Remove
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      )
                    })
                  }
                </TableBody>
              </Table>
            </div>

            {fetchError && (
              <div className="flex-1 flex flex-col justify-center items-center gap-3">
                {(hotspotsCache.retrying || barangaysCache.retrying || nodesCache.retrying) ? (
                  <div className="flex flex-col items-center gap-3">
                    <SpinnerIcon size={32} color="#D81010" />
                    <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[#D81010] text-center">
                      <p className="font-semibold">Failed to load canal hotspots</p>
                      <p className="text-sm">Please try again later</p>
                    </div>
                    <Button onClick={refetchAll} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                  </>
                )}
              </div>
            )}

            {!fetchError && filteredBarangays.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
                <div className="rounded-full bg-[#E5E5E6] p-4">
                  <Target size={36} color="#727272" />
                </div>
                <p className="text-[#122A48] font-bold">No barangays found</p>
                <p className="text-[#727272] text-xs">No registered barangays match your search.</p>
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

      {/* crud dialog */}
      <Dialog open={formDialog.open}>
        <DialogContent className="overflow-y-auto [&>button]:hidden p-0 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] text-[#122A48] min-w-80 md:min-w-180 max-h-150">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3 p-4 py-3 md:p-5 md:py-5">
              <div className="flex gap-3 min-w-0">
                <div className={`flex-shrink-0 self-start rounded-lg p-2 md:p-2.5 text-white ${isEdit ? "bg-[#FF9705] mt-0.5" : "bg-[#1565BC] mt-1.5 md:mt-0.5"}`}>
                  {isEdit ? <MapPinPen className="md:h-7.5 md:w-7.5" /> : <MapPinPlus className="md:h-7.5 md:w-7.5" />}
                </div>
                <div className="flex flex-col min-w-0">
                  <p className="font-bold text-base md:text-lg">{isEdit ? formDialog.hotspot?.name ?? "Edit Hotspot" : "Add Hotspot"}</p>
                  <p className="text-[10px] md:text-sm">
                    {isEdit ? "Rosario, La Union" : "Register a new canal hotspot under AGOS monitoring coverage"}
                  </p>
                </div>
              </div>

              <button type="button" onClick={() => setCancelDialog({ open: true })} className="cursor-pointer flex-shrink-0">
                <X size={18} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">{isEdit ? "Edit Hotspot" : "Add Hotspot"}</DialogTitle>

          <form>
            {/* Hotspot Information */}
            <div className="border-t border-[#C6C6C8] p-4 md:p-5 -mt-3">
              <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
                <div className="flex gap-2 md:gap-3 p-2.5 md:p-4">
                  <div className="rounded-lg bg-[#CDE3DE] p-1.5 md:p-2">
                    <MapPin className="text-[#1565BC] h-5 w-5 md:h-7.5 md:w-7.5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-bold text-xs md:text-base">Hotspot Information</p>
                    <p className="text-[10px] md:text-xs text-[#727272]">Basic identity details of the canal hotspot</p>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-[#C6C6C8] p-2.5 md:p-4">
                  {/* Barangay (read-only context) */}
                  <div className="flex-1">
                    <Field className="flex gap-1.5 flex-col flex-1">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">BARANGAY</FieldLabel>
                      <div className="flex items-center rounded-lg bg-[#F0F0F0] border border-[#C6C6C8] px-3 h-9 md:h-10.5 text-xs md:text-sm text-[#122A48] font-medium">
                        {selectedBarangayName ?? "—"}
                      </div>
                    </Field>
                  </div>

                  {/* Hotspot name */}
                  <div ref={hotspotNameRef} className="flex-1">
                    <Field className="flex gap-1.5 flex-col">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                        HOTSPOT NAME <span className="text-[#FF0000]">*</span>
                      </FieldLabel>
                      <div className={`flex items-center rounded-lg bg-[#1565BC05] border ${fieldErrors.hotspotCode ? "border-[#FF0000]" : "border-[#727272]"}`}>
                        <span className="pl-3 pr-1 text-xs md:text-sm text-[#727272] font-medium select-none whitespace-nowrap">
                          CH-{selectedBarangayName ?? "…"}-
                        </span>
                        <Input
                          type="text"
                          value={hotspotCode}
                          onChange={e => {
                            setHotspotCode(e.target.value)
                            if (fieldErrors.hotspotCode) setFieldErrors(prev => ({ ...prev, hotspotCode: "" }))
                          }}
                          placeholder="2"
                          className="text-[#122A48] rounded-lg text-xs !font-normal md:h-10.5 border-0 !bg-transparent focus-visible:ring-0 pl-0"
                        />
                      </div>
                      <FieldError className="text-xs">{fieldErrors.hotspotCode}</FieldError>
                    </Field>
                  </div>
                </div>

                {/* Description */}
                <div className="p-2.5 md:p-4 -mt-3">
                  <div ref={descriptionRef}>
                    <Field className="flex gap-1.5 flex-col">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">DESCRIPTION <span className="text-[#FF0000]">*</span></FieldLabel>
                      <textarea
                        value={description}
                        onChange={e => {
                          setDescription(e.target.value)
                          if (fieldErrors.description) setFieldErrors(prev => ({ ...prev, description: "" }))
                        }}
                        rows={1}
                        placeholder="Brief description or landmark of this hotspot location e.g. (Near Tsongsan)..."
                        className={`w-full text-[#122A48] rounded-lg text-sm border bg-[#1565BC05] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#1565BC40] ${
                          fieldErrors.description ? "border-[#FF0000]" : "border-[#727272]"
                        }`}
                      />
                      <FieldError className="text-xs">{fieldErrors.description}</FieldError>
                    </Field>
                  </div>
                </div>
              </div>
            </div>

            {/* Canal Properties */}
            <div className="p-4 md:p-5 -mt-7">
              <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
                <div className="flex gap-2 md:gap-3 p-2.5 md:p-4">
                  <div className="rounded-lg bg-[#CDE3DE] p-1.5 md:p-2">
                    <Navigation className="text-[#1565BC] h-5 w-5 md:h-7.5 md:w-7.5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-bold text-xs md:text-base">Canal Properties</p>
                    <p className="text-[10px] md:text-xs text-[#727272]">
                      Physical dimensions of the canal at this hotspot. Measured once at installation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-[#C6C6C8] p-2.5 md:p-4">
                  {/* Canal Width */}
                  <div ref={canalWidthRef} className="flex-1">
                    <Field className="flex gap-1.5 flex-col flex-1">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                        CANAL WIDTH (meters)
                      </FieldLabel>
                      <Input
                        type="number"
                        value={canalWidth}
                        onChange={e => {
                          setCanalWidth(e.target.value)
                          if (fieldErrors.canalWidth) setFieldErrors(prev => ({ ...prev, canalWidth: "" }))
                        }}
                        placeholder="e.g. 1.2"
                        className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal md:h-10.5 bg-[#1565BC05] ${fieldErrors.canalWidth ? "border-[#FF0000]" : "border-[#727272]"}`}
                      />
                      <FieldError className="text-xs">{fieldErrors.canalWidth}</FieldError>
                    </Field>
                  </div>

                  {/* Canal Shape */}
                  <div className="flex-1">
                    <Field className="flex gap-1.5 flex-col flex-1">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                        CANAL SHAPE
                      </FieldLabel>
                      <Select value={canalShape} 
                      onValueChange={value => {
                        setCanalShape(value)
                          if (fieldErrors.canalShape) setFieldErrors(prev => ({ ...prev, canalShape: "" }))
                        }}
                      >
                        <SelectTrigger className={`!font-normal bg-[#1565BC05] py-0 md:py-[20px] text-xs md:text-sm rounded-lg ${fieldErrors.canalShape ? "border-[#FF0000]" : "border-[#727272]"}`}>
                          <SelectValue placeholder="Select shape..." />
                        </SelectTrigger>
                        <FieldError className="text-xs">{fieldErrors.canalShape}</FieldError>
                        <SelectContent position="popper">
                          <SelectItem value="rectangular">Rectangular</SelectItem>
                          <SelectItem value="trapezoidal">Trapezoidal</SelectItem>
                          <SelectItem value="circular">Circular</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                </div>

                <div className="flex gap-3 -mt-5 p-2.5 md:p-4">   
                  {/* Canal Depth */}
                  <div ref={canalDepthRef} className="flex-1">
                    <Field className="flex gap-1.5 flex-col flex-1">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                        CANAL DEPTH (cm)
                      </FieldLabel>
                      <Input
                        type="number"
                        value={canalDepth}
                        onChange={e => {
                          setCanalDepth(e.target.value)
                          if (fieldErrors.canalDepth) setFieldErrors(prev => ({ ...prev, canalDepth: "" }))
                        }}
                        placeholder="e.g. 150"
                        className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal md:h-10.5 bg-[#1565BC05] ${fieldErrors.canalDepth ? "border-[#FF0000]" : "border-[#727272]"}`}
                      />
                      <FieldError className="text-xs">{fieldErrors.canalDepth}</FieldError>
                    </Field>
                  </div>

                  {/* Sensor Height */}
                  <div ref={sensorHeightRef} className="flex-1">
                    <Field className="flex gap-1.5 flex-col flex-1">
                      <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                        SENSOR HEIGHT (cm)
                      </FieldLabel>
                      <Input
                        type="number"
                        value={sensorHeight}
                        onChange={e => {
                          setSensorHeight(e.target.value)
                          if (fieldErrors.sensorHeight) setFieldErrors(prev => ({ ...prev, sensorHeight: "" }))
                        }}
                        placeholder="e.g. 150"
                        className={`text-[#122A48] rounded-lg text-xs bg-white !font-normal md:h-10.5 bg-[#1565BC05] ${fieldErrors.sensorHeight ? "border-[#FF0000]" : "border-[#727272]"}`}
                      />
                      <FieldError className="text-xs">{fieldErrors.sensorHeight}</FieldError>
                    </Field>
                  </div>

                </div>
              </div>
            </div>

            {/* Geographic Location */}
            <div className="p-4 md:p-5 -mt-5 md:-mt-7">
              <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
                <div className="flex gap-2 md:gap-3 p-2.5 md:p-4">
                  <div className="rounded-lg bg-[#CDE3DE] p-1.5 md:p-2 flex justify-center items-center mt-1 md:mt-0">
                    <Navigation className="text-[#1565BC] h-5 w-5 md:h-7.5 md:w-7.5" />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-bold text-xs md:text-base">Geographic Location</p>
                    <p className="text-[10px] md:text-xs text-[#727272]">
                      Select a barangay first. The map will zoom to the barangay and show its boundary.
                      Click <strong>inside the highlighted area</strong> to pin the hotspot location.
                      {boundaryFallback && (
                        <span className="text-[#FF9705]"> (No boundary data found for this barangay — click anywhere near the center.)</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Map */}
                <div className="p-2.5 md:p-3 -mt-4">
                  <div className="rounded-lg bg-[#726D7814] border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
                    <div className="p-2.5 md:p-3">
                      <p className="font-semibold text-xs md:text-sm">Map Preview</p>
                      <p className="text-[10px] text-[#727272] mt-0.5">
                        {boundaryLoading
                          ? "Loading barangay boundary..."
                          : barangay
                            ? "Click inside the boundary to pin the hotspot."
                            : "Select a barangay to see its boundary on the map."}
                      </p>
                    </div>
                    <div className="h-70 md:h-110 border-t border-[#C6C6C8] rounded-b-lg overflow-hidden">
                      <AgosMapWrapper
                        latitude={latitude ? parseFloat(latitude) : selectedBarangay?.latitude}
                        longitude={longitude ? parseFloat(longitude) : selectedBarangay?.longitude}
                        label={latitude ? "Hotspot" : undefined}
                        zoom={latitude ? 16 : 15}
                        onMapClick={handleMapClick}
                        boundaryGeoJson={boundaryGeoJson}
                        showLegend={true}
                        colorMode="availability"
                        markers={[
                          ...allHotspotMarkers,
                          ...(latitude && longitude ? [{
                            latitude: parseFloat(latitude),
                            longitude: parseFloat(longitude),
                            label: selectedBarangayName ? `CH-${selectedBarangayName}-${hotspotCode || '…'}` : "New Hotspot",
                            condition: "Normal",
                            sublabel: "Selected location",
                          }] : []),
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* Lat / Lng */}
                <div className="border-t border-[#C6C6C8] p-2.5 md:p-4">
                  <div className="flex gap-3 w-full -mt-3">
                    <div className="mt-3 flex-1">
                      <Field className="flex gap-1.5 flex-col">
                        <FieldLabel className="text-[#122A48] text-[11px] md:text-xs">LATITUDE <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Input
                          type="text"
                          value={latitude}
                          readOnly
                          placeholder="Auto-filled on map click"
                          className={`text-[#122A48] rounded-lg text-xs bg-[#F0F0F0] cursor-not-allowed !font-normal md:h-9 ${fieldErrors.latitude ? "border-[#FF0000]" : "border-[#727272]"}`}
                        />
                        <FieldError className="text-xs">{fieldErrors.latitude}</FieldError>
                      </Field>
                    </div>
                    <div className="mt-3 flex-1">
                      <Field className="flex gap-1.5 flex-col">
                        <FieldLabel className="text-[#122A48] text-[11px] md:text-xs">LONGITUDE <span className="text-[#FF0000]">*</span></FieldLabel>
                        <Input
                          type="text"
                          value={longitude}
                          readOnly
                          placeholder="Auto-filled on map click"
                          className={`text-[#122A48] rounded-lg text-xs bg-[#F0F0F0] cursor-not-allowed !font-normal md:h-9 ${fieldErrors.longitude ? "border-[#FF0000]" : "border-[#727272]"}`}
                        />
                        <FieldError className="text-xs">{fieldErrors.longitude}</FieldError>
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
                onClick={() => setCancelDialog({ open: true })}
                className="cursor-pointer hover:bg-[#e3ecf0] bg-[#FAFCFD] border border-[#C6C6C8] text-xs md:text-sm rounded-lg px-5 py-4 text-[#727272]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmationDialog}
                className="cursor-pointer hover:bg-[#12569f] rounded-lg text-xs md:text-sm px-4 py-4 bg-[#1565BC]"
              >
                <Check />
                {isEdit ? "Save Changes" : "Add Hotspot"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Map Dialog */}
      <Dialog open={viewMapDialog.open}>
        <DialogContent className="[&>button]:hidden p-4 md:p-6 text-[#122A48] rounded-lg border border-[#C6C6C8] min-w-80 md:min-w-150">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <p className="font-bold text-base md:text-lg">{viewMapDialog.hotspot?.name}</p>
                <p className="text-xs text-[#727272]">{viewMapDialog.hotspot?.barangay_details?.barangay_name}</p>
              </div>
              <button className="cursor-pointer" onClick={() => setViewMapDialog({ open: false, hotspot: null })}>
                <X size={18} />
              </button>
            </div>
          </DialogHeader>
          <div className="h-100 md:h-[380px] rounded-b-lg w-70 md:w-140 overflow-hidden">
            <AgosMapWrapper
              latitude={viewMapDialog.hotspot?.latitude}
              longitude={viewMapDialog.hotspot?.longitude}
              label={viewMapDialog.hotspot?.name}
              zoom={16}
              showLegend={true}
              colorMode="availability"
              markers={allHotspotMarkers}
            />
          </div>
          <div className="border-t border-[#C6C6C8] flex justify-between py-3 -mb-4">
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <p className="text-xs md:text-sm">{viewMapDialog.hotspot?.latitude}</p>
              <p className="text-xs md:text-sm">{viewMapDialog.hotspot?.longitude}</p>
            </div>
            <Button
              onClick={() => {
                const h = viewMapDialog.hotspot
                if (!h) return
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${h.latitude},${h.longitude}`, "_blank")
              }}
              className="cursor-pointer rounded-lg border border-[#C6C6C8] bg-[#FAFCFD] hover:bg-[#d6e4eb] px-3 py-2 md:px-4 md:py-3 text-[#727272]"
            >
              <Map /> Open in Maps
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={hotspotHistoryDialog.open}>
        <DialogContent className="[&>button]:hidden p-0 text-[#122A48] rounded-lg border border-[#C6C6C8] min-w-80 md:min-w-[700px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex justify-between items-center p-2 md:p-3 -mb-4">
              <div className="flex flex-col">
                <p className="font-bold text-sm md:text-base">{hotspotHistoryDialog.hotspot?.name}</p>
                <p className="text-[11px] text-[#727272]">Node Assignment History</p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleExportHistory} disabled={historyExporting} className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-white text-xs">
                  <FileDown size={14} className="mr-1" />
                  {historyExporting ? 'Preparing...' : 'Export'}
                </Button>
                <button className="cursor-pointer" onClick={() => setHotspotHistoryDialog({ open: false, hotspot: null })}>
                  <X size={16} />
                </button>
              </div>
            </div>
          </DialogHeader>
          <DialogTitle className="sr-only">Node Assignment History</DialogTitle>

          <Table>
            <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
              <TableRow>
                <TableHead className="font-semibold text-center text-xs text-[#727272]">NODE</TableHead>
                <TableHead className="font-semibold text-center text-xs text-[#727272]">FROM</TableHead>
                <TableHead className="font-semibold text-center text-xs text-[#727272]">TO</TableHead>
                <TableHead className="font-semibold text-center text-xs text-[#727272]">REASON</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hotspotHistoryError ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10"><p className="text-[#D81010] font-semibold text-sm">Failed to load assignment history.</p></TableCell></TableRow>
              ) : hotspotHistoryLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10"><p className="text-[#727272] text-sm">Loading...</p></TableCell></TableRow>
              ) : hotspotHistoryRows.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-10"><p className="text-[#727272] text-sm">No nodes have been assigned to this hotspot yet.</p></TableCell></TableRow>
              ) : (
                hotspotHistoryRows.map(h => (
                  <TableRow key={h.history_id} className="border-b border-[#C6C6C8] text-xs">
                    <TableCell className="text-center h-11">{h.node_name || '—'}</TableCell>
                    <TableCell className="text-center h-11">{new Date(h.started_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-center h-11">
                      {h.ended_at ? new Date(h.ended_at).toLocaleDateString() : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-[#B2FBC173] text-[#2C7B3C] text-[11px] font-medium">Current</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center h-11">{h.end_reason || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex justify-between items-center px-3 py-2 border-t border-[#C6C6C8] mt-auto">
            <p className="text-xs text-[#727272]">Page {hotspotHistoryPage}</p>
            <div className="flex gap-2">
              <button disabled={!hotspotHistoryHasPrev} onClick={() => setHotspotHistoryPage(p => Math.max(1, p - 1))}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#C6C6C8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                Previous
              </button>
              <button disabled={!hotspotHistoryHasNext} onClick={() => setHotspotHistoryPage(p => p + 1)}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#C6C6C8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                Next
              </button>
            </div>
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
        title={isEdit ? "Cancel Changes" : "Cancel Adding Hotspot"}
        description={isEdit ? "You have unsaved changes that will be lost if you cancel." : "Are you sure you want to cancel adding this hotspot?"}
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
        title={isEdit ? "Confirm Changes" : "Confirm Adding Hotspot"}
        description={isEdit
          ? <> Are you sure you want to update <strong>CH-{selectedBarangayName}-{hotspotCode.trim()}</strong>?</>
          : <> Are you sure you want to add this new hotspot?</>
        }
        cancelLabel="Keep Editing"
        confirmLabel={isEdit ? "Confirm Changes" : "Add Hotspot"}
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

      {/* Remove dialog */}
      <DialogModal
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, hotspot: null })}
        onConfirm={handleDelete}
        color={DIALOG_COLOR.lightred}
        icon={Trash2}
        iconColor={DIALOG_COLOR.red}
        title="Remove Hotspot"
        description={<>Are you sure you want to remove <strong>{deleteDialog.hotspot?.name}</strong>? This cannot be undone.</>}
        cancelLabel="Cancel"
        confirmLabel="Remove"
      />

      {/* Blocked dialog */}
      <DialogModal
        open={blockedDialog.open}
        onClose={() => setBlockedDialog({ open: false })}
        onConfirm={() => setBlockedDialog({ open: false })}
        color={DIALOG_COLOR.lightorange}
        icon={CircleOff}
        iconColor={DIALOG_COLOR.orange}
        title="Cannot Remove Hotspot"
        description="This hotspot is currently occupied by an active sensor node. Unassign the node first before removing this hotspot."
        cancelLabel="Close"
        confirmLabel="Okay"
      />

      {/* Success dialog */}
      <DialogModal
        open={successDialog.open}
        onConfirm={handleSuccessConfirm}
        color={DIALOG_COLOR.lightgreen}
        icon={BadgeCheck}
        iconColor={DIALOG_COLOR.green}
        title="Success!"
        description={
          <>
            <strong>{actionResult?.name}</strong> has been {actionResult?.action.toLowerCase()} successfully.
          </>
        }
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

      <Toast toasts={toasts} onRemove={removeToast} />

      <PrintReport
        reportTitle={`${hotspotHistoryDialog.hotspot?.name ?? 'Hotspot'} — Assignment History`}
        columns={["Node", "From", "To", "Reason"]}
        rows={historyPrintRows}
        generatedBy={generatedBy}
      />
    </>
  )
}