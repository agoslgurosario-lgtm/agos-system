"use client"

// icons
import { BatteryMedium, Signal, ScanSearch, Radar, FileSearch, Battery, FileDown, Wrench, CheckCircle2, X, Moon } from "lucide-react";

// react
import { useEffect, useState } from "react";

// components
import AgosMapWrapper from "@/components/Map/AgosMapWrapper";
import { HealthSkeleton } from "@/components/Skeleton/Admin/HealthSkeleton";
import { useToast } from "@/components/hooks/useToast";
import { Toast } from "@/components/Toast";
import { SpinnerIcon } from "@/components/SpinnerIcon";
import { AssignNodeDialog, AssignNodeDialogPayload } from "@/components/AssignNodeDialog"
import { PrintReport } from "@/components/PrintReport/PrintReport"

// shadcn
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DialogModal } from "@/components/DialogModal"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

// lib
import { api } from "@/lib/api"
import { DIALOG_COLOR } from "@/lib/constant"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

// auth
import { fetchWithAuth } from "@/lib/auth";


type NodeHealth = {
  health_id: number
  node_details: {
    node_id: number
    node_name: string
    status: string
    latitude: number
    longitude: number
    barangay_details: {
      barangay_id: number
      barangay_name: string
    }
  }
  battery_voltage?: number
  signal_strength?: number
  sensor_continuity?: boolean
  status?: string
  firmware_version?: string | null
  checked_at?: string
}

type SensorNode = {
  node_id: number
  node_name: string
  latitude: number
  longitude: number
  status: string
  health_status: string | null
  is_online: boolean
  device_model?: string
  hotspot_details: { hotspot_id: number; name: string; latitude: number; longitude: number } | null
  barangay_details: { barangay_id: number; barangay_name: string } | null
  installed_at: string
  forced_sleep_until: string | null
  is_force_sleeping: boolean
}

type HealthAlerts = {
  alert_id: number
  alert_type: 'Low_Battery' | 'Weak_Signal' | 'Sensor_Failure' | 'Node_Offline'
  timestamp: string
  node: {
    node_id: number
    node_name: string
    barangay_details: {
      barangay_name: string
    }
  } | null
  health_log: {
    health_id: number
    battery_voltage?: number
    signal_strength?: number
    sensor_continuity?: boolean
    status?: string
  } | null
}

type Barangay = { barangay_id: number; barangay_name: string }
type Hotspot = {
  hotspot_id: number
  name: string
  latitude: number
  longitude: number
  barangay_details?: { barangay_id: number; barangay_name: string } | null
}

function getBarColor(pct: number) {
  if (pct >= 60) return '#6AE783D6'
  if (pct >= 30) return '#E9C180' 
  return '#F87171'
}

function getDotColor(pct: number) {
  if (pct >= 60) return 'bg-green-500'
  if (pct >= 30) return 'bg-yellow-400'
  return 'bg-red-500'
}

function getBatteryPct(voltage: number) {
  const pct = ((voltage - 3.0) / (4.2 - 3.0)) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
}

function getSignalPct(dbm: number) {
  const pct = ((dbm + 100) / 50) * 100
  return Math.min(100, Math.max(0, Math.round(pct)))
}

function getSignalLabel(dbm: number) {
  if (dbm > -70) return 'Good signal strength'
  if (dbm > -90) return 'Marginal, check antenna'
  return 'Poor signal, check antenna'
}

function getMicrocontrollerStatus(status?: string) {
  if (status === 'Critical') return 'Critical Fault'
  if (status === 'Warning') return 'Needs Attention'
  if (status === 'Normal') return 'Operating Normally'
  return '—'
}

function getWaterSensorStatus(sensor_continuity?: boolean) {
  if (sensor_continuity == null) return '—'
  return sensor_continuity ? 'Distance Reading OK' : 'No Echo Detected'
}

function getPowerStorageStatus(battery_voltage?: number) {
  if (battery_voltage == null) return '—'
  return `${getBatteryPct(battery_voltage)}% Capacity`
}

function getPMUStatus(battery_voltage?: number) {
  if (battery_voltage == null) return '—'
  const pct = getBatteryPct(battery_voltage)
  if (pct >= 60) return 'Stable'
  if (pct >= 30) return 'Monitor'
  return 'Low Power'
}

function getRelativeTime(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
}


export default function Health() {
  const { toasts, addToast, removeToast } = useToast()

  // node data states
  const [allNodes, setAllNodes] = useState<SensorNode[]>([])
  const [allBarangays, setAllBarangays] = useState<Barangay[]>([])
  const [allHotspots, setAllHotspots] = useState<Hotspot[]>([])
  const [healthAlert, setHealthAlert] = useState<HealthAlerts[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)
  const [selectedNode, setSelectedNode] = useState<NodeHealth | null>(null)
  const [healthLogs, setHealthLogs] = useState<NodeHealth[]>([])

  const [maintenanceDialog, setMaintenanceDialog] = useState(false)
  const [maintenanceReason, setMaintenanceReason] = useState("")
  const [maintenanceError, setMaintenanceError] = useState("")
  const [loadingDialog, setLoadingDialog] = useState<{ open: boolean; title?: string; description?: string }>({ open: false })
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; message?: string }>({ open: false })
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' })

  const [fixDialogOpen, setFixDialogOpen] = useState(false)
  const [pendingFix, setPendingFix] = useState<AssignNodeDialogPayload | null>(null)
  const [fixConfirmDialog, setFixConfirmDialog] = useState(false)
  const [skipAssignDialog, setSkipAssignDialog] = useState(false)
  const [availableSubmitting, setAvailableSubmitting] = useState(false)

  const [forceSleepDialogOpen, setForceSleepDialogOpen] = useState(false)
  const [sleepMinutes, setSleepMinutes] = useState<number | null>(null)
  const [customHours, setCustomHours] = useState('')
  const [sleepError, setSleepError] = useState('')
  const [cancelSleepDialogOpen, setCancelSleepDialogOpen] = useState(false)

  const emptyStateText = selectedNodeId === null ? 'No node selected' : 'No health data yet'
  
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)

  const allHotspotMarkers = allHotspots.map(h => {
    const assignedNode = allNodes.find(n => n.hotspot_details?.hotspot_id === h.hotspot_id)
    return {
      latitude: h.latitude,
      longitude: h.longitude,
      label: assignedNode ? `${assignedNode.node_name}` : h.name,
      condition: assignedNode ? 'Occupied' : 'Available',
      sublabel: assignedNode ? `Occupying: ${h.name}` : "Available hotspot",
      usePin: !!assignedNode,
      barangay_id: h.barangay_details?.barangay_id ?? null,
    }
  })

  // summary cards — derived from the latest health log per node (this month)
  const totalOnline = allNodes.filter(n => n.status !== 'Maintenance' && n.is_online).length

  const latestHealthByNode = new Map<number, NodeHealth>()
  for (const log of healthLogs) {
    if (!latestHealthByNode.has(log.node_details.node_id)) {
      latestHealthByNode.set(log.node_details.node_id, log)
    }
  }
  const latestLogs = Array.from(latestHealthByNode.values())

  const batteryReadings = latestLogs.filter(l => l.battery_voltage != null).map(l => l.battery_voltage!)
  const avg_battery = batteryReadings.length
    ? (batteryReadings.reduce((a, b) => a + b, 0) / batteryReadings.length).toFixed(1)
    : '—'

  const signalReadings = latestLogs.filter(l => l.signal_strength != null).map(l => l.signal_strength!)
  const avg_signal = signalReadings.length
    ? Math.round(signalReadings.reduce((a, b) => a + b, 0) / signalReadings.length)
    : '—'

  const sensorFailing = latestLogs.filter(l => l.sensor_continuity === false).length

  const isUnderMaintenance = selectedNode?.node_details.status === 'Maintenance'

  const nodeToFix = selectedNode
    ? allNodes.find(n => n.node_id === selectedNode.node_details.node_id) ?? null
    : null  

  const fetchNodes = async () => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAllNodes(data.results ?? data)
    } catch {}
  }

  useEffect(() => {
    fetchNodes()
  }, [])

  const fetchHealthLogs = async () => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/system-health/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHealthLogs(data.results ?? data)
    } catch {}
  }

  useEffect(() => {
    fetchHealthLogs()
  }, [])  

  const fetchAlerts = async () => {
    setLoading(true)
    setFetchError(false)
    try {
      const res = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_URL}/api/alerts/?alert_type=Low_Battery,Weak_Signal,Sensor_Failure,Node_Offline&page_size=3`
      )
      if (!res.ok) throw new Error()
      const data = await res.json()
    setHealthAlert(data.results ?? data)
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
  }, [])

  useEffect(() => {
    const fetchBarangaysAndHotspots = async () => {
      try {
        const [bRes, hRes] = await Promise.all([
          fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/barangays/`),
          fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/hotspots/`),
        ])
        if (bRes.ok) { const d = await bRes.json(); setAllBarangays(d.results ?? d) }
        if (hRes.ok) { const d = await hRes.json(); setAllHotspots(d.results ?? d) }
      } catch {}
    }
    fetchBarangaysAndHotspots()
  }, [])

  // handlers
  const handleSelectNode = async (nodeId: number) => {
    setSelectedNodeId(nodeId)
    setSelectedNode(null)
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/system-health/node/${nodeId}/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const logs = data.results ?? data
      setSelectedNode(logs[0] ?? null)
    } catch {
      setSelectedNode(null)
    }
  }

  const handleMarkMaintenance = async () => {
    if (!selectedNode) return
    const reason = maintenanceReason.trim()
    if (!reason) {
      setMaintenanceError("Please describe the reason for maintenance.")
      return
    }
    const nodeName = selectedNode.node_details.node_name
    const nodeId = selectedNode.node_details.node_id

    setMaintenanceDialog(false)
    setMaintenanceReason("")
    setMaintenanceError("")
    setLoadingDialog({ open: true, title: "Marking Under Maintenance", description: `Updating ${nodeName}. Please wait.` })

    try {
      await api.post(`/api/sensor-nodes/${nodeId}/mark-maintenance/`, { reason })
      await Promise.all([fetchNodes(), handleSelectNode(nodeId)])
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true, message: `${nodeName} has been marked under maintenance.` })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.error ?? err?.detail ?? `Failed to mark ${nodeName} under maintenance.` })
    }
  }

  const handleFixDialogConfirm = (payload: AssignNodeDialogPayload) => {
    setPendingFix(payload)
    setFixDialogOpen(false)
    setFixConfirmDialog(true)
  }

  const handleConfirmFix = async () => {
    if (!selectedNode || !pendingFix) return
    const nodeName = selectedNode.node_details.node_name
    const nodeId = selectedNode.node_details.node_id

    setFixConfirmDialog(false)
    setLoadingDialog({ open: true, title: "Marking as Fixed", description: `Updating ${nodeName}. Please wait.` })

    try {
      await api.post(`/api/sensor-nodes/${nodeId}/mark-available/`, {
        hotspot: parseInt(pendingFix.hotspot),
        installed_at: pendingFix.installedAt ? new Date(pendingFix.installedAt).toISOString() : undefined,
      })
      setPendingFix(null)
      await Promise.all([fetchNodes(), handleSelectNode(nodeId)])
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true, message: `${nodeName} has been marked as fixed and reassigned.` })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.error ?? err?.detail ?? `Failed to mark ${nodeName} as fixed.` })
    }
  }

  const handleSkipAssign = async () => {
    if (!selectedNode) return
    const nodeName = selectedNode.node_details.node_name
    const nodeId = selectedNode.node_details.node_id

    setSkipAssignDialog(false)
    setLoadingDialog({ open: true, title: "Marking as Fixed", description: `Updating ${nodeName}. Please wait.` })

    try {
      await api.post(`/api/sensor-nodes/${nodeId}/mark-available/`, { skip_assignment: true })
      await Promise.all([fetchNodes(), handleSelectNode(nodeId)])
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true, message: `${nodeName} has been marked as fixed.` })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.error ?? err?.detail ?? `Failed to mark ${nodeName} as fixed.` })
    }
  }

  const SLEEP_PRESETS = [
    { label: '30 min', minutes: 30 },
    { label: '1 hour', minutes: 60 },
    { label: '3 hours', minutes: 180 },
    { label: '6 hours', minutes: 360 },
    { label: '12 hours', minutes: 720 },
    { label: '24 hours', minutes: 1440 },
  ]

  const handleForceSleep = async () => {
    if (!selectedNode) return
    const nodeName = selectedNode.node_details.node_name
    const nodeId = selectedNode.node_details.node_id

    let minutes = sleepMinutes
    if (customHours.trim()) {
      const h = parseFloat(customHours)
      if (isNaN(h) || h <= 0) { setSleepError('Enter a valid number of hours.'); return }
      if (h > 72) { setSleepError('Forced sleep cannot exceed 72 hours.'); return }
      minutes = Math.round(h * 60)
    }
    if (!minutes) { setSleepError('Pick a duration or enter a custom value.'); return }

    setForceSleepDialogOpen(false)
    setSleepMinutes(null)
    setCustomHours('')
    setSleepError('')
    setLoadingDialog({ open: true, title: "Starting Forced Sleep", description: `Updating ${nodeName}. Please wait.` })

    try {
      await api.post(`/api/sensor-nodes/${nodeId}/force-sleep/`, { minutes })
      await Promise.all([fetchNodes(), handleSelectNode(nodeId)])
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true, message: `${nodeName} has been forced to sleep.` })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.error ?? err?.detail ?? `Failed to force sleep on ${nodeName}.` })
    }
  }

  const handleCancelForceSleep = async () => {
    if (!selectedNode) return
    const nodeName = selectedNode.node_details.node_name
    const nodeId = selectedNode.node_details.node_id

    setCancelSleepDialogOpen(false)
    setLoadingDialog({ open: true, title: "Cancelling Forced Sleep", description: `Updating ${nodeName}. Please wait.` })

    try {
      await api.post(`/api/sensor-nodes/${nodeId}/cancel-force-sleep/`, {})
      await Promise.all([fetchNodes(), handleSelectNode(nodeId)])
      setLoadingDialog({ open: false })
      setSuccessDialog({ open: true, message: `Forced sleep cancelled for ${nodeName}.` })
    } catch (err: any) {
      setLoadingDialog({ open: false })
      setErrorDialog({ open: true, message: err?.error ?? err?.detail ?? `Failed to cancel forced sleep for ${nodeName}.` })
    }
  }

  const printRows = allNodes
    .filter(n => n.hotspot_details != null || n.status === 'Maintenance')
    .sort((a, b) => a.node_name.localeCompare(b.node_name))
    .map(n => {
      const latest = latestHealthByNode.get(n.node_id)
      if (!latest) {
        return [n.node_name, n.barangay_details?.barangay_name ?? '—', n.status, '—', '—', '—', '—', 'No data yet']
      }
      return [
        n.node_name,
        n.barangay_details?.barangay_name ?? '—',
        n.status,
        latest.battery_voltage != null ? latest.battery_voltage.toFixed(1) : '—',
        latest.battery_voltage != null ? `${getBatteryPct(latest.battery_voltage)}%` : '—',
        latest.signal_strength != null ? `${latest.signal_strength}` : '—',
        latest.sensor_continuity === true ? 'OK' : latest.sensor_continuity === false ? 'FAIL' : '—',
        latest.checked_at ? new Date(latest.checked_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
      ]
    })

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

  const handlePrint = () => {
    printReport()
  }

  if (loading) return <HealthSkeleton/>

   return (
     <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* title */}
        <div className="flex w-full mb-2 justify-between items-center">
          <p className="text-[#122A48] font-bold text-[15px]">Sensor Nodes Health</p>

          <Button onClick={handlePrint} className="bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer">
            <FileDown size={16} className="mr-1" />
            Export
          </Button>
        </div>
        
        {/* header cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48]">
          {[
            { icon: <Radar size={17} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: totalOnline, label: "Online Nodes" },
            { icon: <BatteryMedium size={17} color="#E4B600" />, bg: "bg-[#F0FBB2]", count: avg_battery === '—' ? '—' : `${avg_battery}V`, label: "Average Battery" },
            { icon: <Signal size={17} color="#582579" />, bg: "bg-[#E5EAFF]", count: avg_signal === '—' ? '—' : `${avg_signal} dBm`, label: "Average Signal" },
            { icon: <ScanSearch size={17} color="#D81010" />, bg: "bg-[#D8101059]", count: sensorFailing, label: "Sensors Failing" },
          ].map(card => (
            <div key={card.label} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-6 gap-3 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold leading-tight">{card.count}</span>
                <p className="text-xs">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* map and preview node */}
        <div className="flex gap-3 mt-2 flex-1 min-h-0">
          {/* map */}
          <div className="rounded-lg bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] p-3 border border-[#C9C9C9] flex-[3] min-w-0 h-full flex flex-col">
              <p className="text-[#122A48] font-bold mb-1">Canal Network Map - Rosario, La Union</p>
            <div className="flex-1 rounded-lg overflow-hidden">
              <AgosMapWrapper
              markers={allNodes
                .filter(n => n.latitude != null && n.longitude != null)
                .map(n => ({
                  latitude:  n.latitude,
                  longitude: n.longitude,
                  label:     `${n.node_name} – ${n.barangay_details?.barangay_name ?? ''}`,
                  condition:
                    n.status === 'Maintenance' ? 'Maintenance' :
                    !n.is_online                ? 'Sleep' :
                    (n.health_status ?? 'Normal'),
                  onMarkerClick: () => handleSelectNode(n.node_id)
                }))}
                zoom={13}
                colorMode="health"
                showMarkerPopups={false}
              />
            </div>
          </div>

          {/* preview node */}
          <div className="rounded-lg bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex-1 min-w-[240px] border border-[#C9C9C9]">
            {selectedNodeId === null ? (
              <div className="flex justify-center items-center h-full flex-col gap-2 border border-[#C9C9C9] w-full rounded-lg">
                <FileSearch size={50} className="text-[#1565BC80]"/>
                <p className="font-semibold text-[#122A488F]">No node selected</p>
                <p className="text-[#122A4873] text-xs text-center">Select a node from the network <br /> map to view its hardware status <br /> and sensor information</p>
              </div>
            ) : !selectedNode ? (
              <div className="flex justify-center items-center h-full flex-col gap-2 border border-[#C9C9C9] w-full rounded-lg">
                <Radar size={50} className="text-[#1565BC80]"/>
                <p className="font-semibold text-[#122A488F]">No health data yet</p>
                <p className="text-[#122A4873] text-xs text-center">
                  {allNodes.find(n => n.node_id === selectedNodeId)?.node_name ?? 'This node'} hasn't reported <br /> any hardware status yet
                </p>
              </div>
            ) : (
             <div className="flex flex-col text-[#122A48] w-full">
                {/* Hardware details */}
                <div className="w-full p-3 -mb-2">
                  <p className="font-semibold">Hardware Details</p>
                </div>
                <div className="flex items-center gap-2 mx-3 mb-2 justify-between">
                  <p className="text-xs">{selectedNode.node_details.node_name} - {selectedNode.node_details.barangay_details?.barangay_name ?? '—'}</p>

                  {(() => {
                    const statusStyle: Record<string, { bg: string; text: string; dot: string }> = {
                      Active:      { bg: '#58D07159', text: '#2C7B3C', dot: 'bg-[#2C7B3C]' },
                      Inactive:    { bg: '#E5E5E6',   text: '#727272', dot: 'bg-[#727272]' },
                      Maintenance: { bg: '#EE9E4342', text: '#D27000', dot: 'bg-[#D27000]' },
                    }
                    const s = statusStyle[selectedNode.node_details.status] ?? statusStyle.Inactive
                    return (
                      <div
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                        style={{ backgroundColor: s.bg, color: s.text }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                        <p className="font-medium">{selectedNode.node_details.status}</p>
                      </div>
                    )
                  })()}
                </div>

                <div className="px-3 mb-3">
                  {selectedNode.node_details.status === 'Maintenance' ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => setFixDialogOpen(true)}
                        className="flex items-center justify-center gap-1.5 w-full rounded-full border border-[#2C7B3C] bg-white hover:bg-[#58D07120] text-[#2C7B3C] px-3 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <CheckCircle2 size={13} /> Mark as Fixed
                      </button>
                      <button
                        onClick={() => setSkipAssignDialog(true)}
                        className="text-[10px] text-[#727272] hover:underline cursor-pointer"
                      >
                        Mark fixed without assigning
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setMaintenanceReason(""); setMaintenanceError(""); setMaintenanceDialog(true) }}
                      className="flex items-center justify-center gap-1.5 w-full rounded-full border border-[#D27000] bg-white hover:bg-[#EE9E4320] text-[#D27000] px-3 py-1.5 text-xs font-medium cursor-pointer"
                    >
                      <Wrench size={13} /> Mark Under Maintenance
                    </button>
                  )}
                </div>

                {selectedNode.node_details.status !== 'Maintenance' && (
                  <div className="px-3 mb-3">
                    {nodeToFix?.is_force_sleeping ? (
                      <div className="flex flex-col gap-1 rounded-lg border border-[#2563EB] bg-[#2563EB0D] px-3 py-2">
                        <p className="text-[11px] text-[#2563EB] font-medium">
                          Forced sleep until {nodeToFix.forced_sleep_until ? new Date(nodeToFix.forced_sleep_until).toLocaleString() : '—'}
                        </p>
                        <button
                          onClick={() => setCancelSleepDialogOpen(true)}
                          className="text-[10px] text-[#D81010] hover:underline cursor-pointer self-start"
                        >
                          Cancel forced sleep
                        </button>
                      </div>
                    ) : nodeToFix?.hotspot_details ? (
                      <button
                        onClick={() => { setSleepMinutes(null); setCustomHours(''); setSleepError(''); setForceSleepDialogOpen(true) }}
                        className="flex items-center justify-center gap-1.5 w-full rounded-full border border-[#2563EB] bg-white hover:bg-[#2563EB20] text-[#2563EB] px-3 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Moon size={13} /> Force Deep Sleep
                      </button>
                    ) : null}
                  </div>
                )}

                {isUnderMaintenance ? (
                  <div className="flex flex-col items-center justify-center gap-2 p-6 text-center flex-1">
                    <div className="rounded-full bg-[#EE9E4342] p-3">
                      <Wrench size={22} className="text-[#D27000]" />
                    </div>
                    <p className="font-semibold text-sm">Under Maintenance</p>
                    <p className="text-xs text-[#727272]">
                      Hardware and sensor readings are paused while this node is being serviced. Mark it available once it's reinstalled.
                    </p>
                  </div>
                ) : (
                  <>
                    <hr />

                    {/* device information */}
                    <div className="flex flex-col gap-1.5 p-3">
                      <div className="w-full mb-1">
                        <p className="font-semibold">Device Information</p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <p>Model</p>
                        <p className="text-[#727272] text-right max-w-[60%] text-[10px]">
                          {allNodes.find(n => n.node_id === selectedNodeId)?.device_model ?? '—'}
                        </p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <p>Firmware</p>
                        <p className="text-[10px]">{selectedNode.firmware_version ?? '—'}</p>
                      </div>
                      <div className="flex justify-between text-xs">
                        <p>Uptime</p>
                        <p className="text-[#727272] text-[10px]">
                          {selectedNode.checked_at ? getRelativeTime(selectedNode.checked_at) : '—'}
                        </p>
                      </div>
                    </div>

                    <hr />

                    {/* Sensor and modules */}
                    <div className="flex flex-col gap-1.5 p-3">
                      <div className="flex justify-between items-center text-xs">
                        <p>Microcontroller</p>
                        <p className="text-[#727272] text-[10px]">{getMicrocontrollerStatus(selectedNode.status)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <p>Water-level sensor</p>
                        <p className="text-[#727272] text-[10px]">{getWaterSensorStatus(selectedNode.sensor_continuity)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <p>Power Storage Reservoir</p>
                        <p className="text-[#727272] text-[10px]">{getPowerStorageStatus(selectedNode.battery_voltage)}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <p>Power Management Unit</p>
                        <p className="text-[#727272] text-[10px]">{getPMUStatus(selectedNode.battery_voltage)}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* node health cards */}
        <div className="grid grid-cols-3 gap-3 mt-2 w-full min-h-[130px]">

          {/* Battery Voltage */}
          <div className="border border-[#C6C6C8] rounded-lg p-3 min-[2560px]:p-4 min-[3840px]:p-5 text-[#122A48] w-full bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            
            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-2 items-center">
                <Battery size={20} />
                <p className="font-bold text-sm">Battery Voltage</p>
              </div>
              {(() => {
                if (selectedNode?.battery_voltage == null) return <span className="w-2 h-2 rounded-full bg-[#C6C6C8]" />
                const pct = getBatteryPct(selectedNode.battery_voltage)
                return <span className={`w-2 h-2 rounded-full ${getDotColor(pct)}`} />
              })()}
            </div>

            {/* empty state vs data */}
            {!selectedNode ? (
              <div className="flex justify-center items-center py-8">
                <p className="text-xs text-[#727272]">{emptyStateText}</p>
              </div>
            ) : isUnderMaintenance ? (
              <div className="flex flex-col items-center justify-center gap-1 py-6">
                <Wrench size={18} className="text-[#D27000]" />
                <p className="text-xs text-[#D27000] font-medium">Under maintenance</p>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold mt-1">
                  {selectedNode.battery_voltage?.toFixed(1) ?? '—'}
                </p>
                <p className="text-xs text-[#727272] mb-2">Volts</p>
                {selectedNode.battery_voltage != null ? (() => {
                  const pct = getBatteryPct(selectedNode.battery_voltage)
                  return (
                    <>
                      <div className="w-full bg-[#E5E5E6] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: getBarColor(pct) }} />
                      </div>
                      <p className="text-[10px] text-[#727272] mt-1">{pct}% Capacity</p>
                    </>
                  )
                })() : (
                  <>
                    <div className="w-full bg-[#E5E5E6] rounded-full h-1.5" />
                    <p className="text-[10px] text-[#727272] mt-1">— % Capacity</p>
                  </>
                )}
              </>
            )}

          </div>

          {/* 4G Signal */}
          <div className="border border-[#C6C6C8] rounded-lg p-3 min-[2560px]:p-4 min-[3840px]:p-5 text-[#122A48] w-full bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">

            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-2 items-center">
                <Signal size={20} />
                <p className="font-bold text-sm">4G Signal</p>
              </div>
              {(() => {
                if (selectedNode?.signal_strength == null) return <span className="w-2 h-2 rounded-full bg-[#C6C6C8]" />
                const pct = getSignalPct(selectedNode.signal_strength)
                return <span className={`w-2 h-2 rounded-full ${getDotColor(pct)}`} />
              })()}
            </div>
            
              {!selectedNode ? (
                <div className="flex justify-center items-center py-8">
                  <p className="text-xs text-[#727272]">{emptyStateText}</p>
                </div>
              ) : isUnderMaintenance ? (
                <div className="flex flex-col items-center justify-center gap-1 py-6">
                  <Wrench size={18} className="text-[#D27000]" />
                  <p className="text-xs text-[#D27000] font-medium">Under maintenance</p>
                </div>
              ) : (
              <>
                <p className="text-2xl font-bold mt-1">
                  {selectedNode?.signal_strength != null ? `${selectedNode.signal_strength}` : '—'}
                </p>
                <p className="text-xs text-[#727272] mb-2">
                  {selectedNode?.signal_strength != null ? 'dBm' : 'dBm'}
                </p>
                {selectedNode?.signal_strength != null ? (() => {
                  const pct = getSignalPct(selectedNode.signal_strength)
                  return (
                    <>
                      <div className="w-full bg-[#E5E5E6] rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: getBarColor(pct) }} />
                      </div>
                      <p className="text-[10px] text-[#727272] mt-1">{getSignalLabel(selectedNode.signal_strength)}</p>
                    </>
                  )
                })() : (
                  <>
                    <div className="w-full bg-[#E5E5E6] rounded-full h-1.5" />
                    <p className="text-[10px] text-[#727272] mt-1">No data</p>
                  </>
                )} 
              </>
            )}
          </div>

          {/* Sensor Continuity */}
          <div className="border border-[#C6C6C8] rounded-lg p-3 min-[2560px]:p-4 min-[3840px]:p-5 text-[#122A48] w-full bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">

            <div className="flex justify-between items-center mb-1">
              <div className="flex gap-2 items-center">
                <ScanSearch size={20} />
                <p className="font-bold text-sm">Sensor</p>
              </div>
              {selectedNode?.sensor_continuity == null
                ? <span className="w-2 h-2 rounded-full bg-[#C6C6C8]" />
                : <span className={`w-2 h-2 rounded-full ${selectedNode.sensor_continuity ? 'bg-green-500' : 'bg-red-500'}`} />
              }
            </div>

              {!selectedNode ? (
                <div className="flex justify-center items-center py-8">
                  <p className="text-xs text-[#727272]">{emptyStateText}</p>
                </div>
              ) : isUnderMaintenance ? (
                <div className="flex flex-col items-center justify-center gap-1 py-6">
                  <Wrench size={18} className="text-[#D27000]" />
                  <p className="text-xs text-[#D27000] font-medium">Under maintenance</p>
                </div>
              ) : (
              <>
                <p className="text-2xl font-bold mt-1">
                  {selectedNode?.sensor_continuity == null ? '—' : selectedNode.sensor_continuity ? 'OK' : 'FAIL'}
                </p>
                <p className="text-xs text-[#727272] mb-2">Continuity</p>
                <>
                  <div className="w-full bg-[#E5E5E6] rounded-full h-1.5">
                    {selectedNode?.sensor_continuity != null && (
                      <div className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: selectedNode.sensor_continuity ? '100%' : '15%',
                          backgroundColor: selectedNode.sensor_continuity ? '#4ADE80' : '#F87171'
                        }} />
                    )}
                  </div>
                  <p className="text-[10px] text-[#727272] mt-1">
                    {selectedNode?.sensor_continuity == null
                      ? 'No data'
                      : selectedNode.sensor_continuity
                        ? 'Node sensor passing'
                        : 'Node sensor failing'}
                  </p>
                </>
              </>
            )}
          </div>

        </div>      
      </div>

      {/* Mark Under Maintenance Dialog */}
      <Dialog open={maintenanceDialog} onOpenChange={setMaintenanceDialog}>
        <DialogContent className="text-[#122A48] w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-bold text-base">Mark Under Maintenance</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#727272]">
              {selectedNode?.node_details.node_name} will be flagged under maintenance and removed from active monitoring until it's marked available again.
            </p>
            <Field className="flex gap-1.5 flex-col">
              <FieldLabel className="text-[#122A48] text-xs">Reason</FieldLabel>
              <textarea
                value={maintenanceReason}
                onChange={(e) => {
                  setMaintenanceReason(e.target.value)
                  if (maintenanceError) setMaintenanceError("")
                }}
                rows={3}
                placeholder="e.g. Weak signal, needs antenna check"
                className={`w-full rounded-lg bg-[#1565BC05] border p-2 text-xs resize-none ${maintenanceError ? 'border-[#FF0000]' : 'border-[#727272]'}`}
              />
              <FieldError className="text-xs">{maintenanceError}</FieldError>
            </Field>
            <div className="flex gap-3 justify-end mt-1">
              <Button
                onClick={() => setMaintenanceDialog(false)}
                className="rounded-lg border border-[#C6C6C8] px-4 h-9 cursor-pointer text-xs bg-transparent hover:bg-[#edebeb] text-[#727272] disabled:opacity-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkMaintenance}
                className="rounded-lg border border-[#C6C6C8] px-4 h-9 cursor-pointer text-xs text-white"
                style={{ backgroundColor: DIALOG_COLOR.yellow }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Force Deep Sleep duration picker */}
      <Dialog open={forceSleepDialogOpen} onOpenChange={setForceSleepDialogOpen}>
        <DialogContent className="text-[#122A48] w-[380px]">
          <DialogHeader>
            <DialogTitle className="font-bold text-base">Force Deep Sleep</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[#727272]">
              {selectedNode?.node_details.node_name} will stop reporting until the sleep period ends or it's cancelled.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SLEEP_PRESETS.map(p => (
                <button
                  key={p.minutes}
                  onClick={() => { setSleepMinutes(p.minutes); setCustomHours(''); setSleepError('') }}
                  className={`text-xs rounded-lg border px-2 py-1.5 cursor-pointer ${
                    sleepMinutes === p.minutes && !customHours
                      ? 'border-[#2563EB] bg-[#2563EB1A] text-[#2563EB] font-medium'
                      : 'border-[#C6C6C8] text-[#727272] hover:bg-[#F0F0F0]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Field className="flex gap-1.5 flex-col">
              <FieldLabel className="text-[#122A48] text-xs">Custom (hours, max 72)</FieldLabel>
              <input
                type="number"
                min={0}
                max={72}
                value={customHours}
                onChange={e => { setCustomHours(e.target.value); setSleepMinutes(null); if (sleepError) setSleepError('') }}
                placeholder="e.g. 48"
                className="w-full rounded-lg bg-[#1565BC05] border border-[#727272] p-2 text-xs"
              />
            </Field>
            <FieldError className="text-xs">{sleepError}</FieldError>
            <div className="flex gap-2 justify-end mt-2">
              <Button onClick={() => setForceSleepDialogOpen(false)} className="cursor-pointer bg-[#FAFCFD] border border-[#C6C6C8] text-[#727272] text-xs px-4 py-2">
                Cancel
              </Button>
              <Button onClick={handleForceSleep} className="cursor-pointer bg-[#2563EB] hover:bg-[#1e50c2] text-xs px-4 py-2">
                Start Sleep
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel forced sleep confirm */}
      <DialogModal
        open={cancelSleepDialogOpen}
        onClose={() => setCancelSleepDialogOpen(false)}
        onConfirm={handleCancelForceSleep}
        color={DIALOG_COLOR.lightred}
        icon={X}
        iconColor={DIALOG_COLOR.red}
        title="Cancel Forced Sleep"
        description={<>Wake <strong>{selectedNode?.node_details.node_name}</strong> up and resume normal reporting?</>}
        cancelLabel="Back"
        confirmLabel="Confirm"
      />

      {/* Mark as Fixed — assign a hotspot */}
      <AssignNodeDialog
        open={fixDialogOpen}
        node={nodeToFix}
        allBarangays={allBarangays}
        allHotspotMarkers={allHotspotMarkers}
        onCancel={() => setFixDialogOpen(false)}
        onConfirm={handleFixDialogConfirm}
      />

      {/* Confirm the picked hotspot */}
      <DialogModal
        open={fixConfirmDialog}
        onClose={() => setFixConfirmDialog(false)}
        onConfirm={handleConfirmFix}
        color={DIALOG_COLOR.lightgreen}
        icon={CheckCircle2}
        iconColor={DIALOG_COLOR.green}
        title="Confirm Assignment"
        description={<>Mark <strong>{selectedNode?.node_details.node_name}</strong> as fixed and assign it to the selected hotspot?</>}
        cancelLabel="Cancel"
        confirmLabel="Confirm"
      />

      {/* Mark fixed without assigning */}
      <DialogModal
        open={skipAssignDialog}
        onClose={() => setSkipAssignDialog(false)}
        onConfirm={handleSkipAssign}
        color={DIALOG_COLOR.lightgreen}
        icon={CheckCircle2}
        iconColor={DIALOG_COLOR.green}
        title="Mark Fixed Without Assigning"
        description={<><strong>{selectedNode?.node_details.node_name}</strong> will be marked fixed and returned to the unassigned pool. You can assign it a hotspot later from Node Assignment.</>}
        cancelLabel="Cancel"
        confirmLabel="Confirm"
      />

      {/* Loading dialog */}
      <DialogModal
        open={loadingDialog.open}
        color={DIALOG_COLOR.lightblue}
        icon={SpinnerIcon}
        iconColor={DIALOG_COLOR.blue}
        title={loadingDialog.title ?? "Processing"}
        description={<>{loadingDialog.description}</>}
      />

      {/* Success dialog */}
      <DialogModal
        open={successDialog.open}
        onConfirm={() => setSuccessDialog({ open: false })}
        color={DIALOG_COLOR.lightgreen}
        icon={CheckCircle2}
        iconColor={DIALOG_COLOR.green}
        title="Success!"
        description={successDialog.message}
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
        reportTitle="System Health Summary"
        columns={["Node", "Barangay", "Status", "Battery (V)", "Battery %", "Signal (dBm)", "Sensor", "Last Checked"]}
        rows={printRows}
        generatedBy={generatedBy}
      />
     </>
   )
 }