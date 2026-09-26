"use client"

// icons
import { FaPlus } from "react-icons/fa"
import { RadioTower, CheckCircle, SquarePen, MapPinPlus, MapPinPen, MapPin, Check, X, Unplug, History, MoreVertical, CircleOff, KeyRound, Mail, BadgeCheck, FileDown } from "lucide-react"

// react
import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

// shadcn
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogTitle, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

// component
import { SearchFilter } from "@/components/SearchFilter"
import { TablePagination } from "@/components/TablePagination"
import { usePagination } from "@/components/hooks/usePagination"
import { DialogModal } from "@/components/DialogModal"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { NodeSkeleton } from "@/components/Skeleton/Admin/NodeSkeleton"
import { usePageCache } from "@/components/hooks/usePageCache"
import { useFillRows } from "@/components/hooks/useFillRows"
import { PrintReport } from "@/components/PrintReport/PrintReport"
import { useToast } from "@/components/hooks/useToast"
import { Toast } from "@/components/Toast"

// lib
import { DIALOG_COLOR } from "@/lib/constant"
import { fetchWithAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

type SensorNode = {
  node_id: number
  node_name: string
  availability_status: string
  status: string
}

type DialogState = {
  open: boolean
  node?: SensorNode | null
}

type SensorReading = {
  reading_id: number
  timestamp: string
  reading_status: string
  water_level: number | null
  water_flow_rate: number | null
  clog_pct: number | null
  node_details: {
    node_id: number
    hotspot_details: {
      hotspot_id: number
      name: string
    }
  }
}


export default function NodeManagement() {
  const router = useRouter()

  const { toasts, addToast, removeToast } = useToast()

  // fetch raw data
  const fetchNodesRaw = async (): Promise<SensorNode[]> => {
    const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    return data.results ?? data
  }

  const nodesCache = usePageCache('node:sensorNodes', fetchNodesRaw, [] as SensorNode[], { autoFetch: false })

  const refetchAll = useCallback(async () => {
    await nodesCache.refetch()
    setCurrentPage(1)
  }, [])

  useEffect(() => {
    refetchAll()
  }, [])

  const sensorNodes = nodesCache.data
  const [nodeCode, setNodeCode] = useState('')
  const [search, setSearch] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('All Status')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const loading = nodesCache.loading
  const fetchError = nodesCache.error

  // readings state
  const [readingsDialog, setReadingsDialog] = useState<DialogState>({ open: false, node: null })
  const [readingsHotspotFilter, setReadingsHotspotFilter] = useState('All Hotspots')
  const [readingsHotspotOptions, setReadingsHotspotOptions] = useState<string[]>([])
  const [historyTab, setHistoryTab] = useState<'readings' | 'health' | 'hotspot'>('readings')
  const [nodeReadings, setNodeReadings] = useState<SensorReading[]>([])
  const [readingsLoading, setReadingsLoading] = useState(false)
  const [readingsError, setReadingsError] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [readingsStatusFilter, setReadingsStatusFilter] = useState('All Status')
  const [readingsPage, setReadingsPage] = useState(1)
  const [readingsHasNext, setReadingsHasNext] = useState(false)
  const [readingsHasPrev, setReadingsHasPrev] = useState(false)
  const readingsFetchKeyRef = useRef('')

  // health history state
  const [healthLogs, setHealthLogs] = useState<any[]>([])
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthError, setHealthError] = useState(false)
  const [healthStatusFilter, setHealthStatusFilter] = useState<string>('')
  const [healthFrom, setHealthFrom] = useState('')
  const [healthTo, setHealthTo] = useState('')
  const [healthPage, setHealthPage] = useState(1)
  const [healthHasNext, setHealthHasNext] = useState(false)
  const [healthHasPrev, setHealthHasPrev] = useState(false)

  // Hotspot History tab
  const [hotspotHistory, setHotspotHistory] = useState<any[]>([])
  const [hotspotHistoryLoading, setHotspotHistoryLoading] = useState(false)
  const [hotspotHistoryError, setHotspotHistoryError] = useState(false)
  const [hotspotReasonFilter, setHotspotReasonFilter] = useState('All')
  const [hotspotHistoryPage, setHotspotHistoryPage] = useState(1)
  const [hotspotHistoryHasNext, setHotspotHistoryHasNext] = useState(false)
  const [hotspotHistoryHasPrev, setHotspotHistoryHasPrev] = useState(false)
  const hotspotHistoryFetchKeyRef = useRef('')

  const [successDialog, setSuccessDialog] = useState<{ open: boolean }>({ open: false })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })
  const [actionResult, setActionResult] = useState<{ name: string; action: string } | null>(null)
  const [loadingMessage, setLoadingMessage] = useState<{ title: string; description: string }>({
    title: "Saving Changes",
    description: "Processing details. Please wait.",
  })

  // dialog states
  const [nodeFormDialog, setNodeFormDialog] = useState<DialogState>({ open: false, node: null })
  const [loadingDialog, setLoadingDialog] = useState<DialogState>({ open: false })
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({ open: false })
  const [cancelDialog, setCancelDialog] = useState<DialogState>({ open: false })
  const [unassignDialog, setUnassignDialog] = useState<DialogState>({ open: false, node: null })
  const [decommissionDialog, setDecommissionDialog] = useState<DialogState>({ open: false, node: null })
  const [decommissionGuardDialog, setDecommissionGuardDialog] = useState<DialogState>({ open: false, node: null })

  // history print/export states
  const [historyExporting, setHistoryExporting] = useState(false)
  const [historyPrintRows, setHistoryPrintRows] = useState<(string | number)[][]>([])
  const [historyPrintColumns, setHistoryPrintColumns] = useState<string[]>([])
  const [historyPrintTitle, setHistoryPrintTitle] = useState('')
  const [triggerPrint, setTriggerPrint] = useState(false)

  const [keyModal, setKeyModal] = useState<{ open: boolean; email: string; nodeName: string; fromAdd: boolean }>({ open: false, email: '', nodeName: '', fromAdd: false })
  const [regenerateConfirmDialog, setRegenerateConfirmDialog] = useState<DialogState>({ open: false })
  const [generatingKey, setGeneratingKey] = useState(false)

  const isEdit = !!nodeFormDialog.node

  const filtered = sensorNodes
    .filter(n => 
      availabilityFilter === 'All Status' 
        ? n.availability_status !== 'Retired'
        : n.availability_status === availabilityFilter
    )
    .filter(n => n.node_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.node_id - a.node_id)

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 4,
    deps: [loading],
  })

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)

  const total     = sensorNodes.filter(n => n.availability_status !== 'Retired').length
  const available = sensorNodes.filter(n => n.availability_status === 'Available').length
  const occupied  = sensorNodes.filter(n => n.availability_status === 'Occupied').length

  useEffect(() => {
    if (triggerPrint) {
      printReport()
      setTriggerPrint(false)
    }
  }, [triggerPrint])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

  useEffect(() => {
    if (nodeFormDialog.node) {
      setNodeCode(nodeFormDialog.node.node_name?.replace(/^SN-/, '') ?? '')
      setFieldErrors({})
    } else {
      setNodeCode('')
      setFieldErrors({})

      const fetchNextCode = async () => {
        try {
          const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/next-code/`)
          if (!res.ok) return
          const data = await res.json()
          setNodeCode(data.next_code ?? '')
        } catch {
          // silently ignore — field just stays empty, admin types manually
        }
      }
      if (nodeFormDialog.open) fetchNextCode()
    }
  }, [nodeFormDialog.open])

  const healthFetchKeyRef = useRef('')

  useEffect(() => {
    if (!readingsDialog.open || !readingsDialog.node || historyTab !== 'health') return

    const key = `${readingsDialog.node.node_id}|${healthStatusFilter}|${healthFrom}|${healthTo}|${healthPage}`
    if (healthFetchKeyRef.current === key) return
    healthFetchKeyRef.current = key

    const fetchHealth = async () => {
      setHealthLoading(true)
      setHealthError(false)
      try {
        const params = new URLSearchParams({ page: String(healthPage) })
        if (healthStatusFilter) params.set('status', healthStatusFilter)
        if (healthFrom) params.set('from', healthFrom)
        if (healthTo) params.set('to', healthTo)

        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/system-health/node/${readingsDialog.node!.node_id}/?${params.toString()}`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setHealthLogs(data.results ?? data)
        setHealthHasNext(!!data.next)
        setHealthHasPrev(!!data.previous)
      } catch {
        setHealthError(true)
      } finally {
        setHealthLoading(false)
      }
    }
    fetchHealth()
  }, [readingsDialog.open, readingsDialog.node, historyTab, healthStatusFilter, healthFrom, healthTo, healthPage])

  useEffect(() => { setHealthPage(1) }, [healthStatusFilter, healthFrom, healthTo])
  useEffect(() => { setReadingsPage(1) }, [readingsStatusFilter, readingsHotspotFilter])
  useEffect(() => { setHotspotHistoryPage(1) }, [hotspotReasonFilter])

  const resetForm = () => {
    setNodeCode('')
    setFieldErrors({})
  }

  useEffect(() => {
    if (!readingsDialog.open || !readingsDialog.node || historyTab !== 'readings') return

    const key = `${readingsDialog.node.node_id}|${readingsStatusFilter}|${readingsHotspotFilter}|${readingsPage}`
    if (readingsFetchKeyRef.current === key) return
    readingsFetchKeyRef.current = key

    const fetchReadings = async () => {
      setReadingsLoading(true)
      setReadingsError(false)
      try {
        const params = new URLSearchParams({ page: String(readingsPage) })
        if (readingsStatusFilter !== 'All Status') params.set('status', readingsStatusFilter)
        if (readingsHotspotFilter !== 'All Hotspots') params.set('hotspot', readingsHotspotFilter)

        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-readings/node/${readingsDialog.node!.node_id}/?${params.toString()}`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setNodeReadings(data.results ?? data)
        setReadingsHasNext(!!data.next)
        setReadingsHasPrev(!!data.previous)
      } catch {
        setReadingsError(true)
      } finally {
        setReadingsLoading(false)
      }
    }
    fetchReadings()
  }, [readingsDialog.open, readingsDialog.node, historyTab, readingsStatusFilter, readingsHotspotFilter, readingsPage])

  useEffect(() => {
    if (!readingsDialog.open || !readingsDialog.node || historyTab !== 'hotspot') return

    const key = `${readingsDialog.node.node_id}|${hotspotReasonFilter}|${hotspotHistoryPage}`
    if (hotspotHistoryFetchKeyRef.current === key) return
    hotspotHistoryFetchKeyRef.current = key

    const fetchHotspotHistory = async () => {
      setHotspotHistoryLoading(true)
      setHotspotHistoryError(false)
      try {
        const params = new URLSearchParams({ page: String(hotspotHistoryPage) })
        if (hotspotReasonFilter !== 'All') params.set('reason', hotspotReasonFilter)

        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/${readingsDialog.node!.node_id}/assignment-history/?${params.toString()}`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        setHotspotHistory(data.results ?? data)
        setHotspotHistoryHasNext(!!data.next)
        setHotspotHistoryHasPrev(!!data.previous)
      } catch {
        setHotspotHistoryError(true)
      } finally {
        setHotspotHistoryLoading(false)
      }
    }
    fetchHotspotHistory()
  }, [readingsDialog.open, readingsDialog.node, historyTab, hotspotReasonFilter, hotspotHistoryPage])
  
  useEffect(() => {
    function handleClickOutside() {
      setOpenMenuId(null)
    }
    if (openMenuId !== null) {
      document.addEventListener("click", handleClickOutside)
      return () => document.removeEventListener("click", handleClickOutside)
    }
  }, [openMenuId])

  useEffect(() => {
    if (!readingsDialog.open || !readingsDialog.node) { setReadingsHotspotOptions([]); return }
    const fetchOptions = async () => {
      try {
        const res = await fetchWithAuth(
          `${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/${readingsDialog.node!.node_id}/assignment-history/?page_size=200`
        )
        if (!res.ok) throw new Error()
        const data = await res.json()
        const rows = data.results ?? data
        const names = Array.from(new Set(rows.map((r: any) => r.hotspot_name).filter(Boolean))) as string[]
        setReadingsHotspotOptions(names)
      } catch { setReadingsHotspotOptions([]) }
    }
    fetchOptions()
  }, [readingsDialog.open, readingsDialog.node])

  useEffect(() => {
    if (!readingsDialog.open || !readingsDialog.node) {
      setNodeReadings([])
      return
    }
    setHistoryTab('readings')

    setReadingsStatusFilter('All Status')
    setReadingsHotspotFilter('All Hotspots')
    setReadingsPage(1)
    readingsFetchKeyRef.current = ''

    setHealthStatusFilter('')
    setHealthFrom('')
    setHealthTo('')
    setHealthPage(1)
    healthFetchKeyRef.current = ''

    setHotspotReasonFilter('All')
    setHotspotHistoryPage(1)
    hotspotHistoryFetchKeyRef.current = ''
  }, [readingsDialog.open, readingsDialog.node])

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

  // handlers
  const handleConfirmationDialog = () => {
    const errors: Record<string, string> = {}
    if (!nodeCode.trim()) errors.nodeCode = "This field is required."
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return
    setConfirmDialog({ open: true })
  }

  const handleCancel = () => {
    setCancelDialog({ open: false })
    setNodeFormDialog({ open: false, node: null })
    resetForm()
  }

  const generateKeyForNode = async (node: { node_id: number; node_name: string }, fromAdd: boolean = false) => {
    setGeneratingKey(true)
    try {
      const result = await api.post(`/api/sensor-nodes/${node.node_id}/generate-key/`, {})
      setKeyModal({ open: true, email: result.email, nodeName: node.node_name, fromAdd })
    } catch (err: any) {
      setErrorDialog({ open: true, message: err?.detail ?? err?.error ?? 'Failed to generate device key.' })
      if (fromAdd) {
        setNodeFormDialog({ open: false, node: null })
        resetForm()
      }
    } finally {
      setGeneratingKey(false)
    }
  }

  const handleKeyModalDone = () => {
    const wasFromAdd = keyModal.fromAdd
    setKeyModal({ open: false, email: '', nodeName: '', fromAdd: false })
    if (wasFromAdd) {
      setNodeFormDialog({ open: false, node: null })
      resetForm()
      setSuccessDialog({ open: true })
    }
  }

  const handleSubmit = async () => {
    setConfirmDialog({ open: false })
    setLoadingMessage({
      title: isEdit ? "Saving Changes" : "Adding Node",
      description: "Processing details. Please wait.",
    })
    setLoadingDialog({ open: true })

    const payload = { node_code: nodeCode.trim() }

    try {
      if (isEdit) {
        const updated = await api.patch(`/api/sensor-nodes/${nodeFormDialog.node!.node_id}/`, payload)
        nodesCache.setData(prev => prev.map(n =>
          n.node_id === nodeFormDialog.node!.node_id ? { ...n, ...updated } : n
        ))
        setActionResult({ name: updated.node_name, action: 'updated' })
        setNodeFormDialog({ open: false, node: null })
        resetForm()
        setLoadingDialog({ open: false })
        setSuccessDialog({ open: true })
        } else {
          const created = await api.post('/api/sensor-nodes/', payload)
          nodesCache.setData(prev => [created, ...prev])
          setActionResult({ name: created.node_name, action: 'added' })
          setLoadingMessage({
            title: "Generating Device Key",
            description: "Creating a secure key and emailing it to you. Please wait.",
          })
          await generateKeyForNode(created, true)
          setLoadingDialog({ open: false })
          // form closes + success dialog fires inside handleKeyModalDone, once the key's been shown
        }
    } catch (err: any) {
      setLoadingDialog({ open: false })
      if (err?.node_code) {
        setFieldErrors(prev => ({ ...prev, nodeCode: Array.isArray(err.node_code) ? err.node_code[0] : err.node_code }))
      }
      setErrorDialog({ open: true, message: err?.detail ?? err?.node_code?.[0] ?? err?.error ?? 'Something went wrong. Please try again.' })
    }
  }

  const handleUnassign = async (node: SensorNode) => {
    setUnassignDialog({ open: false, node: null })
    setLoadingMessage({ title: "Unassigning Node", description: `Unassigning ${node.node_name}. Please wait.` })
    setLoadingDialog({ open: true })
    try {
      await api.post(`/api/sensor-nodes/${node.node_id}/unassign/`, {})
      nodesCache.setData(prev => prev.map(n =>
        n.node_id === node.node_id
          ? { ...n, availability_status: 'Available', status: 'Active' }
          : n
      ))
      setActionResult({ name: node.node_name, action: 'unassigned and is now available' })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? `Failed to unassign ${node.node_name}. Please try again.` })
    }
  }

  const handleDecommission = async (node: SensorNode) => {
    setDecommissionDialog({ open: false, node: null })
    setLoadingMessage({ title: "Decommissioning Node", description: `Decommissioning ${node.node_name}. Please wait.` })
    setLoadingDialog({ open: true })
    try {
      await api.patch(`/api/sensor-nodes/${node.node_id}/`, { availability_status: 'Retired' })
      nodesCache.setData(prev => prev.map(n =>
        n.node_id === node.node_id
          ? { ...n, availability_status: 'Retired' }
          : n
      ))
      setActionResult({ name: node.node_name, action: 'decommissioned' })
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.detail ?? `Failed to decommission ${node.node_name}. Please try again.` })
    }
  }

  const handleSuccessConfirm = () => {
    const wasAdd = actionResult?.action === 'added'
    setSuccessDialog({ open: false })
    setActionResult(null)
    if (wasAdd) {
      router.push('/admin/assign')
    }
  }

  const handleExportHistory = async () => {
    if (!readingsDialog.node) return
    setHistoryExporting(true)
    try {
      if (historyTab === 'readings') {
        const params = new URLSearchParams()
        if (readingsStatusFilter !== 'All Status') params.set('status', readingsStatusFilter)
        if (readingsHotspotFilter !== 'All Hotspots') params.set('hotspot', readingsHotspotFilter)
        const all = await fetchAllPages(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-readings/node/${readingsDialog.node.node_id}/?${params.toString()}`)
        setHistoryPrintColumns(["Timestamp", "Hotspot Name", "Water Level", "Flow Rate", "Clog %", "Status"])
        setHistoryPrintRows(all.map(r => [
          new Date(r.timestamp).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
          r.node_details.hotspot_details?.name ?? '—',
          r.water_level != null ? `${r.water_level} cm` : '—',
          r.water_flow_rate != null ? `${Number(r.water_flow_rate).toFixed(5)} m/s` : '—',
          r.clog_pct != null ? `${r.clog_pct} %` : '—',
          r.reading_status,
        ]))
        setHistoryPrintTitle(`${readingsDialog.node.node_name} — Readings History`)
      } else if (historyTab === 'health') {
        const params = new URLSearchParams()
        if (healthStatusFilter) params.set('status', healthStatusFilter)
        if (healthFrom) params.set('from', healthFrom)
        if (healthTo) params.set('to', healthTo)
        const all = await fetchAllPages(`${process.env.NEXT_PUBLIC_API_URL}/api/system-health/node/${readingsDialog.node.node_id}/?${params.toString()}`)
        setHistoryPrintColumns(["Checked At", "Status", "Battery", "Signal", "Sensor"])
        setHistoryPrintRows(all.map(h => [
          new Date(h.checked_at).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
          h.status,
          h.battery_voltage != null ? `${h.battery_voltage} V` : '—',
          h.signal_strength != null ? `${h.signal_strength} dBm` : '—',
          h.sensor_continuity == null ? '—' : h.sensor_continuity ? 'OK' : 'Fault',
        ]))
        setHistoryPrintTitle(`${readingsDialog.node.node_name} — Health History`)
      } else {
        const params = new URLSearchParams()
        if (hotspotReasonFilter !== 'All') params.set('reason', hotspotReasonFilter)
        const all = await fetchAllPages(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/${readingsDialog.node.node_id}/assignment-history/?${params.toString()}`)
        setHistoryPrintColumns(["Hotspot", "Barangay", "From", "To", "Reason"])
        setHistoryPrintRows(all.map(h => [
          h.hotspot_name || '—',
          h.barangay_name || '—',
          new Date(h.started_at).toLocaleDateString(),
          h.ended_at ? new Date(h.ended_at).toLocaleDateString() : 'Current',
          h.end_reason || '—',
        ]))
        setHistoryPrintTitle(`${readingsDialog.node.node_name} — Hotspot History`)
      }
      setTriggerPrint(true)
    } catch {
      addToast('Failed to export history.', 'error')
    } finally {
      setHistoryExporting(false)
    }
  }

  if (loading) return <NodeSkeleton/>

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* Header */}
        <div className="flex justify-between w-full">
          <div className="font-bold text-[#122A48] flex justify-center items-center text-[15px]">
            <p>Node Management</p>
          </div>
          <Button
            onClick={() => setNodeFormDialog({ open: true, node: null })}
            className="p-5 py-[16px] rounded-lg cursor-pointer bg-[#1565BC] hover:bg-[#135499] text-white shadow-[0_6px_4px_-4px_rgba(0,0,0,0.2)]"
          >
            <FaPlus color="white" /> Add Node
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 w-full text-[#122A48] mt-2">
          {[
            { icon: <RadioTower size={20} color="#2C7B3C" />,  bg: "bg-[#CDE3DE]", count: total,     label: "Total Nodes" },
            { icon: <CheckCircle size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: available, label: "Available" },
            { icon: <RadioTower size={20} color="#1565BC" />,  bg: "bg-[#DBEAFE]", count: occupied,  label: "Occupied" },
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
        <div className="flex gap-4 mt-2 flex-1 min-h-[528px] overflow-visible">
          <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col">
            <div className="flex justify-between items-center p-2">
              <p className="text-sm font-bold text-[#122A48]">IoT Sensor Nodes</p>

              <div className="flex gap-3 items-center">
                <SearchFilter value={search} onChange={setSearch} placeholder="Search node..." width="w-60" height="h-8" />

                <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                  <SelectTrigger className="text-xs cursor-pointer w-36 px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-36 min-w-0">
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="All Status">All Status</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Available">Available</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Occupied">Occupied</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                  <TableRow>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE ID</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">NODE NAME</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">AVAILABILITY</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!fetchError && filtered.length > 0 && paginated.map(node => (
                      <TableRow key={node.node_id} className="border-b border-[#C6C6C8]">
                        <TableCell className="text-[#122A48] text-left h-14 text-xs">{node.node_id}</TableCell>
                        <TableCell className="text-[#122A48] text-left h-14 text-xs">{node.node_name}</TableCell>
                        <TableCell className="text-left h-14 text-xs">
                          {node.status === 'Maintenance' ? (
                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#EDE4FC] text-[#7C3AED]">
                              <span className="text-xs w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                              <p className="text-xs">Under Maintenance</p>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold ${
                              node.availability_status === 'Available' ? 'bg-[#B2FBC173] text-[#2C7B3C]' :
                              node.availability_status === 'Retired'   ? 'bg-[#E5E5E6] text-[#727272]' :
                              'bg-[#DBEAFE] text-[#1565BC]'
                            }`}>
                              <span className={`text-xs w-1.5 h-1.5 rounded-full ${
                                node.availability_status === 'Available' ? 'bg-[#1D8104]' :
                                node.availability_status === 'Retired'   ? 'bg-[#727272]' :
                                'bg-[#1565BC]'
                              }`} />
                              <p className="text-xs">{node.availability_status}</p>
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-[#122A48] flex gap-2 justify-left items-left h-14 text-xs relative">
                          {/* Available */}
                          {node.availability_status === 'Available' && (
                            <>
                              <Button
                                onClick={() => { if (node.status !== 'Maintenance') setNodeFormDialog({ open: true, node }) }}
                                disabled={node.status === 'Maintenance'}
                                title={node.status === 'Maintenance' ? 'Cannot edit a node while it is under maintenance' : undefined}
                                className={`text-xs flex gap-2 rounded-lg border py-3.5 px-3 ${
                                  node.status === 'Maintenance'
                                    ? 'text-[#A0A0A0] bg-[#F0F0F0] border-[#D0D0D0] cursor-not-allowed'
                                    : 'text-[#122A48] bg-[#CDE3DE45] hover:bg-[#75928a45] cursor-pointer border-[#1565BC80]'
                                }`}
                              >
                                <SquarePen size={16} /> Edit
                              </Button>

                              <div className="relative">
                                <Button
                                  id={`menu-btn-${node.node_id}`}
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === node.node_id ? null : node.node_id) }}
                                  className="text-xs text-[#122A48] rounded-lg bg-[#FAFCFD] hover:bg-[#eef1f3] cursor-pointer border border-[#C6C6C8] py-3.5 px-3"
                                >
                                  <MoreVertical size={16} />
                                </Button>

                                {openMenuId === node.node_id && (
                                  <div className="fixed bg-white border border-[#C6C6C8] rounded-lg shadow-lg z-[9999] w-35 overflow-hidden"
                                    style={{
                                      top: document.getElementById(`menu-btn-${node.node_id}`)?.getBoundingClientRect().bottom ?? 0,
                                      right: window.innerWidth - (document.getElementById(`menu-btn-${node.node_id}`)?.getBoundingClientRect().right ?? 0),
                                    }}
                                  >
                                    <button
                                      onClick={() => { setOpenMenuId(null); setReadingsDialog({ open: true, node }) }}
                                      className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#1565BC] hover:bg-[#DBEAFE] cursor-pointer"
                                    >
                                      <History size={14} /> View History
                                    </button>
                                    <button
                                      onClick={() => { setOpenMenuId(null); setDecommissionDialog({ open: true, node }) }}
                                      className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#D81010] hover:bg-[#FFE5E5] cursor-pointer"
                                    >
                                      <CircleOff size={14} /> Decommission
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* Occupied */}
                          {node.availability_status === 'Occupied' && (
                            <>
                              <Button
                                onClick={() => setNodeFormDialog({ open: true, node })}
                                className="flex gap-2 text-[#122A48] rounded-lg bg-[#CDE3DE45] hover:bg-[#75928a45] cursor-pointer border border-[#1565BC80] py-3.5 px-3 text-xs"
                              >
                                <SquarePen size={16} /> Edit
                              </Button>

                              <div className="relative">
                                <Button
                                  id={`menu-btn-${node.node_id}`}
                                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === node.node_id ? null : node.node_id) }}
                                  className="text-[#122A48] rounded-lg bg-[#FAFCFD] hover:bg-[#eef1f3] cursor-pointer border border-[#C6C6C8] py-3.5 px-3"
                                >
                                  <MoreVertical size={16} />
                                </Button>

                                {openMenuId === node.node_id && (
                                  <div className="fixed bg-white border border-[#C6C6C8] rounded-lg shadow-lg z-[9999] w-35 overflow-hidden"
                                    style={{
                                      top: document.getElementById(`menu-btn-${node.node_id}`)?.getBoundingClientRect().bottom ?? 0,
                                      right: window.innerWidth - (document.getElementById(`menu-btn-${node.node_id}`)?.getBoundingClientRect().right ?? 0),
                                    }}
                                  >
                                    <button
                                      onClick={() => { setOpenMenuId(null); setReadingsDialog({ open: true, node }) }}
                                      className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#1565BC] hover:bg-[#DBEAFE] cursor-pointer"
                                    >
                                      <History size={14} /> View History
                                    </button>
                                    <button
                                      onClick={() => { setOpenMenuId(null); setUnassignDialog({ open: true, node }) }}
                                      className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#FF9705] hover:bg-[#FFF3E0] cursor-pointer"
                                    >
                                      <Unplug size={14} /> Unassign
                                    </button>
                                    <button
                                      onClick={() => { setOpenMenuId(null); setDecommissionGuardDialog({ open: true, node }) }}
                                      className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs text-[#D81010] hover:bg-[#FFE5E5] cursor-pointer"
                                    >
                                      <CircleOff size={14} /> Decommission
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}

                          {/* Retired */}
                          {node.availability_status === 'Retired' && (
                            <>
                              <Button
                                onClick={() => setNodeFormDialog({ open: true, node })}
                                className="flex gap-2 text-[#122A48] rounded-lg bg-[#CDE3DE45] hover:bg-[#75928a45] cursor-pointer border border-[#1565BC80] py-4.5 px-3"
                              >
                                <SquarePen size={16} /> Edit
                              </Button>
                              <Button
                                onClick={() => setReadingsDialog({ open: true, node })}
                                className="flex gap-2 text-[#1565BC] rounded-lg bg-[#DBEAFE] hover:bg-[#bfdcfb] cursor-pointer border border-[#C6C6C8] py-4.5 px-3"
                              >
                                <History size={14} /> View History
                              </Button>
                            </>
                          )}

                        </TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>

            {fetchError && (
              <div className="flex-1 flex flex-col justify-center items-center gap-3">
                {nodesCache.retrying ? (
                  <div className="flex flex-col items-center gap-3">
                    <SpinnerIcon size={32} color="#D81010" />
                    <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[#D81010] text-center">
                      <p className="font-semibold">Failed to load sensor nodes</p>
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
                <p className="text-[#122A48] font-bold">No sensor nodes added</p>
                <p className="text-[#727272] text-xs">Add a node to start monitoring.</p>
                <Button
                  onClick={() => setNodeFormDialog({ open: true, node: null })}
                  className="cursor-pointer bg-transparent rounded-lg border border-[#727272] text-[#122A48] px-3 py-2 hover:bg-gray-100"
                >
                  + Add Node
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

      {/* Node Form Dialog */}
      <Dialog open={nodeFormDialog.open}>
        <DialogContent className="overflow-y-auto [&>button]:hidden p-0 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] text-[#122A48] min-w-80 md:min-w-120 max-h-150">
          <DialogHeader>
            <div className="flex gap-3 p-4 py-3 md:p-5 md:py-5">
              <div className={`flex-shrink-0 self-start rounded-lg p-2 md:p-2.5 text-white ${isEdit ? 'bg-[#FF9705] mt-0.5' : 'bg-[#1565BC] mt-1.5 md:mt-0.5'}`}>
                {isEdit ? <MapPinPen className="md:h-7.5 md:w-7.5" /> : <MapPinPlus className="md:h-7.5 md:w-7.5" />}
              </div>
              <div className="flex flex-col">
                <p className="font-bold text-base md:text-lg">{isEdit ? nodeFormDialog.node?.node_name ?? 'Edit Node' : 'Add Node'}</p>
                <p className="text-[10px] md:text-sm text-[#727272]">
                  {isEdit ? "Update this node's basic information." : 'Add a new IoT sensor node into the system.'}
                </p>
              </div>
            </div>
            
          </DialogHeader>
          <DialogTitle className="sr-only">{isEdit ? 'Edit Node' : 'Add Node'}</DialogTitle>

          <form>
            <div className="border-t border-[#C6C6C8] p-4 md:p-5 -mt-3">
              <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
                <div className="flex gap-2 md:gap-3 p-2.5 md:p-4">
                  <div className="rounded-lg bg-[#CDE3DE] p-1.5 md:p-2">
                    <MapPin className="text-[#1565BC] h-5 w-5 md:h-7 md:w-7" />
                  </div>
                  <div className="flex flex-col">
                    <p className="font-bold text-xs md:text-base">Node Information</p>
                    <p className="text-[10px] md:text-xs text-[#727272]">Basic identity details of the sensor node</p>
                  </div>
                </div>

                <div className="border-t border-[#C6C6C8] p-2.5 md:p-4">
                  <Field className="flex gap-1.5 flex-col">
                    <FieldLabel className="text-[#122A48] text-xs md:text-sm">
                      NODE NAME <span className="text-[#FF0000]">*</span>
                    </FieldLabel>
                    <div className={`flex items-center rounded-lg bg-[#1565BC05] border ${fieldErrors.nodeCode ? 'border-[#FF0000]' : 'border-[#727272]'}`}>
                      <span className="pl-3 pr-1 text-xs md:text-sm text-[#727272] font-medium select-none">SN-</span>
                      <Input
                        type="text"
                        value={nodeCode}
                        onChange={e => {
                          setNodeCode(e.target.value)
                          if (fieldErrors.nodeCode) setFieldErrors(prev => ({ ...prev, nodeCode: '' }))
                        }}
                        placeholder="1"
                        className="text-[#122A48] text-xs !font-normal md:h-10.5 border-0 !bg-transparent focus-visible:ring-0 pl-0"
                      />
                    </div>
                    <FieldError className="text-xs">{fieldErrors.nodeCode}</FieldError>
                    {isEdit && (
                      <Button
                        type="button"
                        onClick={() => setRegenerateConfirmDialog({ open: true })}
                        disabled={generatingKey}
                        className="cursor-pointer hover:bg-[#e3ecf0] bg-[#FAFCFD] border border-[#C6C6C8] text-[11px] md:text-xs rounded-lg px-3 py-2 mt-1 text-[#1565BC] w-fit"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        {generatingKey ? 'Generating...' : 'Generate New Key'}
                      </Button>
                    )}
                  </Field>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end p-4 -mt-2">
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
                {isEdit ? 'Save Changes' : 'Add Node'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Readings History Dialog */}
      <Dialog open={readingsDialog.open}>
        <DialogContent className="[&>button]:hidden p-0 text-[#122A48] rounded-lg border border-[#C6C6C8] min-w-80 md:min-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center p-2 md:p-3 border-b border-[#C6C6C8] -mb-3">
            <div className="flex flex-col">
              <p className="font-bold text-sm md:text-base">{readingsDialog.node?.node_name}</p>
              <p className="text-[11px] text-[#727272]">Node History</p>
            </div>
            <button className="cursor-pointer" onClick={() => setReadingsDialog({ open: false, node: null })}>
              <X size={16} />
            </button>
          </div>
        </DialogHeader>
        <DialogTitle className="sr-only">Node History</DialogTitle>

        <div className="flex gap-1 px-2 md:px-3 border-b border-[#C6C6C8] -mb-4">
          {([
            { key: 'readings', label: 'Readings History' },
            { key: 'health', label: 'Health History' },
            { key: 'hotspot', label: 'Hotspot History' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setHistoryTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-lg cursor-pointer border-b-2 ${
                historyTab === t.key
                  ? 'border-[#1565BC] text-[#1565BC]'
                  : 'border-transparent text-[#727272] hover:text-[#122A48]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

          {historyTab === 'readings' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-wrap gap-2 items-center p-2 md:p-3 border-b border-[#C6C6C8] justify-between">
              <div className="flex gap-3">
                <Select value={readingsStatusFilter} onValueChange={setReadingsStatusFilter}>
                  <SelectTrigger className="text-xs cursor-pointer w-32 px-3 py-2 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-32 min-w-0">
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="All Status">All Status</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Normal">Normal</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Warning">Warning</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={readingsHotspotFilter} onValueChange={setReadingsHotspotFilter}>
                  <SelectTrigger className="text-xs cursor-pointer w-40 px-3 py-2 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                    <SelectValue placeholder="Hotspot" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="w-40 min-w-0">
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="All Hotspots">All Hotspots</SelectItem>
                    {readingsHotspotOptions.map(name => (
                      <SelectItem key={name} className="cursor-pointer p-2 text-xs text-[#122A48]" value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Button onClick={handleExportHistory} disabled={historyExporting} className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-white text-xs">
                  <FileDown size={14} className="mr-1" />
                  {historyExporting ? 'Preparing...' : 'Export'}
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                <TableRow>
                  <TableHead className="font-semibold text-center text-xs text-[#727272]">TIMESTAMP</TableHead>
                  <TableHead className="font-semibold text-center text-xs text-[#727272]">HOTSPOT NAME</TableHead>
                  <TableHead className="font-semibold text-center text-xs text-[#727272]">WATER LEVEL</TableHead>
                  <TableHead className="font-semibold text-center text-xs text-[#727272]">FLOW RATE</TableHead>
                  <TableHead className="font-semibold text-center text-xs text-[#727272]">CLOG %</TableHead>
                  <TableHead className="font-semibold text-center text-xs text-[#727272]">STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {readingsError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-[#D81010] font-semibold text-sm">Failed to load readings.</p>
                    </TableCell>
                  </TableRow>
                ) : readingsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-[#727272] text-sm">Loading readings...</p>
                    </TableCell>
                  </TableRow>
                ) : nodeReadings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <p className="text-[#727272] text-sm">No readings recorded for this node yet.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                nodeReadings.map(r => (
                    <TableRow key={r.reading_id} className="border-b border-[#C6C6C8] text-xs">
                      <TableCell className="text-center h-11">
                        {new Date(r.timestamp).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </TableCell>
                      <TableCell className="text-center h-11">{r.node_details.hotspot_details?.name ?? '—'}</TableCell>
                      <TableCell className="text-center h-11">{r.water_level != null ? `${r.water_level} cm` : '—'}</TableCell>
                      <TableCell className="text-center h-11">{r.water_flow_rate != null ? `${Number(r.water_flow_rate).toFixed(5)} m/s` : '—'}</TableCell>
                      <TableCell className="text-center h-11">{r.clog_pct != null ? `${r.clog_pct} %` : '—'}</TableCell>
                      <TableCell className="text-center h-11">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          r.reading_status === 'Critical' ? 'bg-[#FFE5E5] text-[#D81010]' :
                          r.reading_status === 'Warning'  ? 'bg-[#F4E4A7] text-[#E4B600]' :
                          'bg-[#B2FBC173] text-[#2C7B3C]'
                        }`}>
                          {r.reading_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center px-3 py-2 border-t border-[#C6C6C8] mt-auto">
              <p className="text-xs text-[#727272]">Page {readingsPage}</p>
              <div className="flex gap-2">
                <button disabled={!readingsHasPrev} onClick={() => setReadingsPage(p => Math.max(1, p - 1))}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#C6C6C8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  Previous
                </button>
                <button disabled={!readingsHasNext} onClick={() => setReadingsPage(p => p + 1)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-[#C6C6C8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                  Next
                </button>
              </div>
            </div>
          </div>
          )}

          {historyTab === 'health' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="flex flex-wrap gap-2 items-center p-2 md:p-3 border-b border-[#C6C6C8] justify-between">
                <div className="flex gap-2">
                  <Select value={healthStatusFilter || 'All Status'} onValueChange={v => setHealthStatusFilter(v === 'All Status' ? '' : v)}>
                    <SelectTrigger className="text-xs cursor-pointer w-32 px-3 py-2 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-32 min-w-0">
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="All Status">All Status</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Normal">Normal</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Warning">Warning</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <input
                    type="date"
                    value={healthFrom}
                    onChange={e => setHealthFrom(e.target.value)}
                    className="text-xs border border-[#C6C6C8] rounded-lg px-2 py-1.5"
                  />
                  <span className="text-xs text-[#727272]">to</span>
                  <input
                    type="date"
                    value={healthTo}
                    onChange={e => setHealthTo(e.target.value)}
                    className="text-xs border border-[#C6C6C8] rounded-lg px-2 py-1.5"
                  />
                  {(healthStatusFilter || healthFrom || healthTo) && (
                    <button
                      onClick={() => { setHealthStatusFilter(''); setHealthFrom(''); setHealthTo('') }}
                      className="text-xs text-[#1565BC] hover:underline cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                <div>
                  <Button onClick={handleExportHistory} disabled={historyExporting} className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-white text-xs">
                    <FileDown size={14} className="mr-1" />
                    {historyExporting ? 'Preparing...' : 'Export'}
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                  <TableRow>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">CHECKED AT</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">STATUS</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">BATTERY</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">SIGNAL</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">SENSOR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthError ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><p className="text-[#D81010] font-semibold text-sm">Failed to load health history.</p></TableCell></TableRow>
                  ) : healthLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><p className="text-[#727272] text-sm">Loading...</p></TableCell></TableRow>
                  ) : healthLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><p className="text-[#727272] text-sm">No health checks match these filters.</p></TableCell></TableRow>
                  ) : (
                    healthLogs.map(h => (
                      <TableRow key={h.health_id} className="border-b border-[#C6C6C8] text-xs">
                        <TableCell className="text-center h-11">{new Date(h.checked_at).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })}</TableCell>
                        <TableCell className="text-center h-11">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            h.status === 'Critical' ? 'bg-[#FFE5E5] text-[#D81010]' :
                            h.status === 'Warning'  ? 'bg-[#F4E4A7] text-[#E4B600]' :
                            'bg-[#B2FBC173] text-[#2C7B3C]'
                          }`}>{h.status}</span>
                        </TableCell>
                        <TableCell className="text-center h-11">{h.battery_voltage != null ? `${h.battery_voltage} V` : '—'}</TableCell>
                        <TableCell className="text-center h-11">{h.signal_strength != null ? `${h.signal_strength} dBm` : '—'}</TableCell>
                        <TableCell className="text-center h-11">{h.sensor_continuity == null ? '—' : h.sensor_continuity ? 'OK' : 'Fault'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex justify-between items-center px-3 py-2 border-t border-[#C6C6C8] mt-auto">
                <p className="text-xs text-[#727272]">Page {healthPage}</p>
                <div className="flex gap-2">
                  <button
                    disabled={!healthHasPrev}
                    onClick={() => setHealthPage(p => Math.max(1, p - 1))}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#C6C6C8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={!healthHasNext}
                    onClick={() => setHealthPage(p => p + 1)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[#C6C6C8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {historyTab === 'hotspot' && (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="flex gap-2 items-center p-2 md:p-3 border-b border-[#C6C6C8] justify-between">
                <div>
                  <Select value={hotspotReasonFilter} onValueChange={setHotspotReasonFilter}>
                    <SelectTrigger className="text-xs cursor-pointer w-36 px-3 py-2 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                      <SelectValue placeholder="Reason" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-36 min-w-0">
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="All">All</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="current">Current</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Reassigned">Reassigned</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Maintenance">Maintenance</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Retired">Retired</SelectItem>
                      <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Button onClick={handleExportHistory} disabled={historyExporting} className="cursor-pointer bg-[#2fd45b] hover:bg-[#28b54e] text-white text-xs">
                    <FileDown size={14} className="mr-1" />
                    {historyExporting ? 'Preparing...' : 'Export'}
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                  <TableRow>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">HOTSPOT</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">BARANGAY</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">FROM</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">TO</TableHead>
                    <TableHead className="font-semibold text-center text-xs text-[#727272]">REASON</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hotspotHistoryError ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><p className="text-[#D81010] font-semibold text-sm">Failed to load hotspot history.</p></TableCell></TableRow>
                  ) : hotspotHistoryLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><p className="text-[#727272] text-sm">Loading...</p></TableCell></TableRow>
                  ) : hotspotHistory.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-10"><p className="text-[#727272] text-sm">No assignment history yet.</p></TableCell></TableRow>
                  ) : (
                    hotspotHistory.map(h => (
                      <TableRow key={h.history_id} className="border-b border-[#C6C6C8] text-xs">
                        <TableCell className="text-center h-11">{h.hotspot_name || '—'}</TableCell>
                        <TableCell className="text-center h-11">{h.barangay_name || '—'}</TableCell>
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
            </div>
          )}

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
        title={isEdit ? "Cancel Changes" : "Cancel Adding"}
        description={isEdit ? 'Unsaved changes will be lost.' : 'Are you sure you want to cancel adding this node?'}
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
        title={isEdit ? 'Confirm Changes' : 'Confirm Adding'}
        description={isEdit
          ? <> Are you sure you want to update <strong>SN-{nodeCode.trim()}</strong>? </>
          : <> Are you sure you want to add this new node? </>
        }
        cancelLabel="Keep Editing"
        confirmLabel={isEdit ? 'Confirm Changes' : 'Add Node'}
      />

      {/* Loading dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={isEdit ? "Saving Changes" : "Adding Node"}
        description={<> Processing details. Please wait. </>}
      />

      {/* Regenerate key confirm dialog */}
      <DialogModal
        open={regenerateConfirmDialog.open}
        onClose={() => setRegenerateConfirmDialog({ open: false })}
        onConfirm={() => {
          setRegenerateConfirmDialog({ open: false })
          generateKeyForNode(nodeFormDialog.node!)
        }}
        color={DIALOG_COLOR.lightyellow}
        icon={KeyRound}
        iconColor={DIALOG_COLOR.yellow}
        title="Generate New Key"
        description={<> This will invalidate <strong>{nodeFormDialog.node?.node_name}</strong>'s current device key. The physical device will need to be reflashed before it can connect again. Continue? </>}
        cancelLabel="Cancel"
        confirmLabel="Generate Key"
      />

      {/* Device key generated — sent via email */}
      <DialogModal
        open={keyModal.open}
        color={DIALOG_COLOR.lightgreen}
        icon={Mail}
        iconColor={DIALOG_COLOR.green}
        title="Device Key Generated"
        description={
          <span className="flex flex-col gap-2">
            <span className="block">
              A new device key for <strong>{keyModal.nodeName}</strong> has been sent to{" "}
              <strong>{keyModal.email}</strong>. Check your inbox to copy it into the device firmware.
            </span>
            <span className="block text-[#FF0000] text-[11px] sm:text-xs font-medium">
              If lost, you&apos;ll need to generate a new key and reflash the device.
            </span>
          </span>
        }
        confirmLabel="Done"
        onConfirm={handleKeyModalDone}
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
        description={<> Are you sure you want to unassign <strong>{unassignDialog.node?.node_name}</strong> from its hotspot? It will return to Available. </>}
        cancelLabel="Cancel"
        confirmLabel="Unassign"
      />

      {/* Decommission dialog */}
      <DialogModal
        open={decommissionDialog.open}
        onClose={() => setDecommissionDialog({ open: false, node: null })}
        onConfirm={() => handleDecommission(decommissionDialog.node!)}
        color={DIALOG_COLOR.lightred}
        icon={CircleOff}
        iconColor={DIALOG_COLOR.red}
        title="Decommission Node"
        description={<> Are you sure you want to decommission <strong>{decommissionDialog.node?.node_name}</strong>? This will mark it as retired and remove it from active monitoring. </>}
        cancelLabel="Cancel"
        confirmLabel="Decommission"
      />

      {/* Decommission guard dialog */}
      <DialogModal
        open={decommissionGuardDialog.open}
        onClose={() => setDecommissionGuardDialog({ open: false, node: null })}
        onConfirm={() => setDecommissionGuardDialog({ open: false, node: null })}
        color={DIALOG_COLOR.lightorange}
        icon={CircleOff}
        iconColor={DIALOG_COLOR.orange}
        title="Cannot Decommission Node"
        description={<> <strong>{decommissionGuardDialog.node?.node_name}</strong> is currently occupied. Please unassign it from its hotspot first before decommissioning. </>}
        cancelLabel="Close"
        confirmLabel="Okay"
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
        description={
          <>
            <strong>{actionResult?.name}</strong> has been {actionResult?.action} successfully.
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

      <PrintReport
        reportTitle={historyPrintTitle}
        columns={historyPrintColumns}
        rows={historyPrintRows}
        generatedBy={generatedBy}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  )
}