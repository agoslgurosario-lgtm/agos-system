"use client"

// react
import { useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"

// icons
import { Leaf, Recycle, Trash2, Biohazard, RadioTower, Droplets, TriangleAlert, MapPinned, Siren, Activity, Battery, Signal, ScanSearch, X, MapPin, Waves, Droplet} from "lucide-react"

// shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// components
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import ReportOutcomeBar from "@/components/ReportOutcomeBar"
import FollowUpDialog from "@/components/ReportOutcomeBar/FollowUpDialog"
import { ALERT_STYLE, WASTE_STYLE } from '@/lib/constant'
import { usePolling } from "@/components/hooks/usePolling"
import { useFillRows } from "@/components/hooks/useFillRows"
import { DashboardSkeleton } from "@/components/Skeleton/Admin/DashboardSkeleton"

// auth
import { fetchWithAuth } from "@/lib/auth"
import { monthOf, formatMonthLabel } from "@/lib/reportOptions"
import type { CanalMonitoringReport } from "@/types/report"
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { usePageCache } from "@/components/hooks/usePageCache"


const ALERT_ICONS: Record<string, ReactNode> = {
  Water_Level_Rising: <Activity size={18} />,
  Critical_Clog:      <RadioTower size={18} />,
  Node_Offline:       <TriangleAlert size={18} />,
  Low_Battery:        <TriangleAlert size={18} />,
  Weak_Signal:        <Activity size={18} />,
  Sensor_Failure:     <RadioTower size={18} />,
}

const WASTE_ICONS: Record<string, ReactNode> = {
  Recyclable:      <Recycle size={18} />,
  Biodegradable:   <Leaf size={18} />,
  Residual:        <Trash2 size={18} />,
  'Special Waste': <Biohazard size={18} />,
  None:            <Trash2 size={18} />,
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    Normal:   "bg-[#58D07159] text-[#2C7B3C]",
    Warning:  "bg-[#D8921059] text-[#D48A00]",
    Critical: "bg-[#D8101059] text-[#D81010]",
    Maintenance: "bg-[#7C3AED29] text-[#7C3AED]",
  }
  const style = styles[status] ?? "bg-gray-100 text-gray-500"

  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${style}`}>
      {status}
    </span>
  )
}


type SensorNodes = {
  node_id: number
  barangay_details: { barangay_id: number; barangay_name: string } | null
  hotspot_details: { hotspot_id: number; name: string; latitude: number; longitude: number } | null
  node_name: string
  status: string
  availability_status: string
  installed_at: string
  condition: string | null
  water_level: number | null
  water_flow_rate: number | null
  clog_pct: number | null
  health_status: string
  latitude: number | null
  longitude: number | null
  is_online: boolean
  is_force_sleeping: boolean
  last_reading_at: string | null
}

type ClogEvents = {
  event_id: number
  severity: string
  status: string
  detected_at: string
  resolved_at: string | null
  node_details: { node_id: number; node_name: string } | null
  barangay_details: { barangay_id: number; barangay_name: string } | null
}

type Barangay = {
  barangay_id: number
  barangay_name: string
  latitude: number
  longitude: number
  is_registered: boolean
}

type Alert = {
  alert_id: number
  alert_type: string
  node_name: string | null
  barangay_name: string | null
  timestamp: string
  is_read: boolean
  alert_context?: Record<string, any> 
}

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
  checked_at?: string
}

type WasteClassification = {
  classification_id: number
  node_details: {
    node_id: number
    node_name: string
    barangay_details: {
      barangay_id: number
      barangay_name: string
    }
  }
  dominant_waste_type: string
  timestamp: string
  reading: number
  confidence: number
  estimated_volume: number
  recyclable_pct: number
  biodegradable_pct: number
  residual_pct: number
  special_waste_pct: number
}

// helpers
function getBatteryPct(voltage: number) {
  const min = 3.0, max = 4.2
  return Math.min(100, Math.max(0, Math.round(((voltage - min) / (max - min)) * 100)))
}

function getSignalPct(dbm: number) {
  const min = -110, max = -50
  return Math.min(100, Math.max(0, Math.round(((dbm - min) / (max - min)) * 100)))
}

function getSignalLabel(dbm: number) {
  if (dbm >= -70) return "Good signal"
  if (dbm >= -85) return "Marginal signal"
  if (dbm >= -100) return "Weak signal"
  return "No signal"
}

function getBarColor(pct: number) {
  if (pct >= 60) return "#4ADE80"
  if (pct >= 30) return "#F5C518"
  return "#F87171"
}

function getDotColor(pct: number) {
  if (pct >= 60) return "bg-green-400"
  if (pct >= 30) return "bg-yellow-400"
  return "bg-red-400"
}


export default function Dashboard() {
  const router = useRouter()

  // alert dialog state
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [alertDialog, setAlertDialog] = useState(false)

  // summary cards dialog state
  const [assignedNodesDialog, setAssignedNodesDialog] = useState(false)
  const [criticalClogsDialog, setCriticalClogsDialog] = useState(false)
  const [registeredBarangayDialog, setRegisteredBarangayDialog] = useState(false)
  const [resolvedClogsDialog, setResolvedClogsDialog] = useState(false)

  const [selectedWaste, setSelectedWaste] = useState<WasteClassification | null>(null)
  const [wasteDialog, setWasteDialog] = useState(false)
  const [reportProgressDialog, setReportProgressDialog] = useState(false)

  const [batteryDialog, setBatteryDialog] = useState(false)
  const [signalDialog, setSignalDialog] = useState(false)
  const [continuityDialog, setContinuityDialog] = useState(false)

  const now = new Date()

  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const currentMonthLabel = formatMonthLabel(currentMonthValue)

  const [selectedNode, setSelectedNode] = useState<SensorNodes | null>(null)
  const [nodeDialog, setNodeDialog] = useState({ open: false })

  const handleSelectNode = (nodeId: number) => {
    const node = sensorNodes.data.find(n => n.node_id === nodeId)
    if (!node) return
    setSelectedNode(node)
    setNodeDialog({ open: true })
  }

  // fetchers — each returns its parsed data instead of only calling setState
  const fetchSensorNodesRaw = async (): Promise<SensorNodes[]> => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.results ?? data
    } catch { return [] }
  }

  const fetchReportsRaw = async (): Promise<CanalMonitoringReport[]> => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/canal-reports/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.results ?? data
    } catch { return [] }
  }

  const fetchAlertsRaw = async (): Promise<Alert[]> => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const alerts: Alert[] = data.results ?? data
      return alerts.filter(a => a.alert_type !== "Report_Submitted")
    } catch { return [] }
  }

  const fetchNodeHealthRaw = async (): Promise<NodeHealth[]> => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/system-health/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.results ?? data
    } catch { return [] }
  }

  const fetchClogEventsRaw = async (): Promise<ClogEvents[]> => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/clog-events/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.results ?? data
    } catch { return [] }
  }

  const fetchBarangaysRaw = async (): Promise<Barangay[]> => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/barangays/all/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.results ?? data
    } catch { return [] }
  }

  const fetchWasteClassificationRaw = async (): Promise<WasteClassification[]> => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/waste-classifications/`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      return data.results ?? data
    } catch { return [] }
  }

  // cached data, all fetched together via refetchAll below (autoFetch: false)
  const sensorNodes = usePageCache('dashboard:sensorNodes', fetchSensorNodesRaw, [] as SensorNodes[], { autoFetch: false })
  const barangayReports = usePageCache('dashboard:canalReports', fetchReportsRaw, [] as CanalMonitoringReport[], { autoFetch: false })
  const alerts = usePageCache('dashboard:alerts', fetchAlertsRaw, [] as Alert[], { autoFetch: false })
  const nodeHealth = usePageCache('dashboard:nodeHealth', fetchNodeHealthRaw, [] as NodeHealth[], { autoFetch: false })
  const clogEvents = usePageCache('dashboard:clogEvents', fetchClogEventsRaw, [] as ClogEvents[], { autoFetch: false })
  const barangays = usePageCache('dashboard:barangays', fetchBarangaysRaw, [] as Barangay[], { autoFetch: false })
  const wasteClassification = usePageCache('dashboard:wasteClassification', fetchWasteClassificationRaw, [] as WasteClassification[], { autoFetch: false })

  const loading = sensorNodes.loading || barangayReports.loading || alerts.loading
    || nodeHealth.loading || clogEvents.loading || barangays.loading || wasteClassification.loading

  const { panelRef: wastePanelRef, tableWrapRef: wasteWrapRef, rows: wasteRows } = useFillRows({
    rowHeight: 56,
    itemGap: 8,
    minRows: 3,
    reservePaginationSpace: false,
    deps: [loading],
  })
  const { panelRef: alertsPanelRef, tableWrapRef: alertsWrapRef, rows: alertRows } = useFillRows({
    rowHeight: 56,
    itemGap: 8,
    minRows: 3,
    reservePaginationSpace: false,
    deps: [loading],
  })

  // summary cards
  const assignedNodes = sensorNodes.data.filter(b => b.hotspot_details?.hotspot_id)
  const totalSensorNodes = assignedNodes.length
  const criticalClogs = clogEvents.data.filter(b => b.severity === 'High')
  const criticalAlerts = criticalClogs.length
  const registeredBarangays = barangays.data.filter(b => b.is_registered)
  const registeredBarangay = registeredBarangays.length
  const resolvedClogsThisMonth = clogEvents.data.filter(c => {
    if (c.status !== 'Cleared' || !c.resolved_at) return false
    const resolvedDate = new Date(c.resolved_at)
    return resolvedDate.getFullYear() === now.getFullYear() && resolvedDate.getMonth() === now.getMonth()
  })
  const resolvedClog = resolvedClogsThisMonth.length

  const reportsThisMonth = barangayReports.data.filter(r => monthOf(r) === currentMonthValue)

  // health helpers
  const latestHealthByNode = new Map<number, NodeHealth>()
  for (const log of nodeHealth.data) {
    // nodeHealth.data is ordered -checked_at by the API, so first hit per node is latest
    if (!latestHealthByNode.has(log.node_details.node_id)) {
      latestHealthByNode.set(log.node_details.node_id, log)
    }
  }
  const latestHealthLogs = Array.from(latestHealthByNode.values())

  const activeHealth = latestHealthLogs.filter(n => n.node_details.status === "Active")

  const voltages = activeHealth.map(n => n.battery_voltage).filter((v): v is number => v != null)
  const signals  = activeHealth.map(n => n.signal_strength).filter((v): v is number => v != null)

  const avgVoltage = voltages.length ? voltages.reduce((a, b) => a + b, 0) / voltages.length : null
  const avgSignal  = signals.length  ? signals.reduce((a, b) => a + b, 0) / signals.length   : null

  const batteryPct = avgVoltage != null ? getBatteryPct(avgVoltage) : null
  const signalPct  = avgSignal  != null ? getSignalPct(avgSignal)   : null

  // continuity — denominator is deployed nodes, not just nodes that happened to report
  const assignedNodeIds = new Set(
    sensorNodes.data.filter(n => n.hotspot_details?.hotspot_id).map(n => n.node_id)
  )
  const passingCount = latestHealthLogs.filter(
    n => n.sensor_continuity === true && assignedNodeIds.has(n.node_details.node_id)
  ).length
  const allPassing = totalSensorNodes > 0
    ? (passingCount / totalSensorNodes) >= 0.5
    : null

  const todayWaste = wasteClassification.data.filter(waste => {
    const wasteDate = new Date(waste.timestamp)
    const today = new Date()
    return (
      wasteDate.getFullYear() === today.getFullYear() &&
      wasteDate.getMonth() === today.getMonth() &&
      wasteDate.getDate() === today.getDate()
    )
  })

  const recentWaste = [...todayWaste]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, wasteRows)

  const todayAlerts = alerts.data
    .filter(alert => {
      const alertDate = new Date(alert.timestamp)
      const today = new Date()
      return (
        alertDate.getFullYear() === today.getFullYear() &&
        alertDate.getMonth() === today.getMonth() &&
        alertDate.getDate() === today.getDate()
      )
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const refetchAll = useCallback(() => {
    return Promise.all([
      sensorNodes.refetch(),
      barangayReports.refetch(),
      alerts.refetch(),
      nodeHealth.refetch(),
      clogEvents.refetch(),
      barangays.refetch(),
      wasteClassification.refetch(),
    ]).then(() => {})
  }, [])

  useEffect(() => {
    refetchAll()
  }, [])

  usePolling(refetchAll, 30000)

  useWebSocket({
    path: "/ws/alerts/",
    onMessage: (newAlert) => {
      if (newAlert.alert_type === "Report_Submitted") return
      alerts.setData(prev => [newAlert, ...prev])
    },
  })

  useWebSocket({
    path: "/ws/sensor-readings/",
    onMessage: (reading) => {
      sensorNodes.setData(prev => prev.map(node =>
        node.node_id === reading.node_details.node_id
          ? {
              ...node,
              water_level: reading.water_level,
              water_flow_rate: reading.water_flow_rate,
              clog_pct: reading.clog_pct,
              condition: reading.reading_status,
            }
          : node
      ))
    },
  })

  useWebSocket({
    path: "/ws/waste-classification/",
    onMessage: (newWaste) => {
      wasteClassification.setData(prev => [newWaste, ...prev])
    },
  })

  if (loading) return <DashboardSkeleton />

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">
        
        {/* title */}
        <div className="flex w-full mb-2">
          <p className="text-[#122A48] font-bold text-[15px]">System Summary</p>
        </div>

        {/* total cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48]">
          {[
            { icon: <RadioTower size={20} color="#2C7B3C" />, bg: "bg-[#CDE3DE]", count: totalSensorNodes, label: "Total Assigned Sensor Nodes", onClick: () => setAssignedNodesDialog(true) },
            { icon: <TriangleAlert size={20} color="#D81010" />, bg: "bg-[#FFE5E5]", count: criticalAlerts, label: "Critical Clogs", onClick: () => setCriticalClogsDialog(true) },
            { icon: <MapPinned   size={20} color="#1f518f" />, bg: "bg-[#CDE3DE]", count: registeredBarangay, label: "Registered Barangay", onClick: () => setRegisteredBarangayDialog(true) },
            { icon: <Droplets size={20} color="#1565BC" />, bg: "bg-[#1565BC29]", count: resolvedClog, label: "Resolved this Month", onClick: () => setResolvedClogsDialog(true) },
          ].map(card => (
            <div
              key={card.label}
              onClick={card.onClick}
              className={`rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] cursor-pointer hover:opacity-80`}
            >
              <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-[#122A48] leading-tight">{card.count}</span>
                <p className="text-xs text-[#122A48]">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* map, monthly report, waste, alerts */}
        <div className="text-[#122A48] mt-3 flex gap-2 w-full">
          <div className="flex flex-col gap-2 flex-[3] min-w-0">
            {/* map */}
            <div className="bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg h-[380px] min-[2560px]:h-[460px] min-[3840px]:h-[540px] flex flex-col">
              <div className="px-2 pt-2 pb-1">
                <p className="font-bold text-sm">Canal Network Map - Rosario, La Union</p>
              </div>
              <div className="flex-1 overflow-hidden rounded-b-lg">
                <AgosMapWrapper
                  markers={sensorNodes.data
                    .filter(n => n.latitude != null && n.longitude != null)
                    .filter(n => n.availability_status === 'Occupied' || n.status === 'Maintenance')
                    .map(n => ({
                      latitude:  n.latitude!,
                      longitude: n.longitude!,
                      label:     `${n.node_name} – ${n.barangay_details?.barangay_name ?? ''}`,
                      condition:
                        n.status === 'Maintenance'            ? 'Maintenance' :
                        (n.is_force_sleeping || !n.is_online) ? 'Sleep' :
                        (n.condition ?? 'Normal'),
                      sublabel: `Water: ${n.water_level ?? '—'}cm | Clog: ${n.clog_pct ?? '—'}%`,
                      onMarkerClick: () => handleSelectNode(n.node_id),
                    }))}
                  zoom={13}
                  showMarkerPopups={false}
                />
              </div>
            </div>

            {/* cleanup outcomes this month */}
            <div onClick={() => setReportProgressDialog(true)} className="cursor-pointer hover:opacity-80">
              <ReportOutcomeBar reports={reportsThisMonth} periodLabel={currentMonthLabel} />
            </div>
          </div>
          
          {/* wastes */}
          <div ref={wastePanelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex-1 min-w-[240px] rounded-lg flex flex-col min-h-0'>
            <div className='flex justify-between items-center p-1.5 px-3'>
              <p className='font-semibold text-[#122A48] text-sm'>Live Waste Classification</p>
            </div>
            <hr className='border-[#C6C6C8]' />
            <div ref={wasteWrapRef} className='flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-0'>
              {recentWaste.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full gap-2'>
                  <Siren size={28} color="#C6C6C8" />
                  <p className='text-xs text-[#727272] text-center'>No waste classification today</p>
                </div>
              ) : (
                recentWaste.map(waste => {
                  const style = WASTE_STYLE[waste.dominant_waste_type] ?? WASTE_STYLE.None
                  return (
                    <div
                      key={waste.classification_id}
                      onClick={() => { setSelectedWaste(waste); setWasteDialog(true) }}
                      className={`flex items-center gap-3 p-1 h-14 rounded-lg border cursor-pointer hover:opacity-80 ${style.border} ${style.shadow} bg-white`}
                    >
                      <div className={`p-2 rounded-lg ${style.icon} shrink-0`}>
                        {WASTE_ICONS[waste.dominant_waste_type] ?? <Trash2 size={18} />}
                      </div>
                      <div className='flex flex-col'>
                        <p className='text-xs font-semibold text-[#122A48] leading-tight'>
                          {waste.dominant_waste_type} — {waste.confidence.toFixed(1)}%
                        </p>
                        <p className='text-xs text-[#727272]'>
                          {waste.node_details?.node_name ?? 'Unknown Node'} | {new Date(waste.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* alerts */}
          <div ref={alertsPanelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex-1 min-w-[240px] rounded-lg flex flex-col min-h-0'>
            <div className='flex items-center justify-between p-1.5 px-3'>
              <p className='font-semibold text-[#122A48] text-sm'>Live Alerts</p>
            </div>
            <hr className='border-[#C6C6C8]' />
            <div ref={alertsWrapRef} className='flex flex-col gap-2 p-2 overflow-y-auto flex-1 min-h-0'>
              {todayAlerts.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full gap-2'>
                  <Siren size={28} color="#C6C6C8" />
                  <p className='text-xs text-[#727272] text-center'>No alerts today</p>
                </div>
              ) : (
                todayAlerts.slice(0, alertRows).map(alert => {
                  const style = ALERT_STYLE[alert.alert_type] ?? ALERT_STYLE.default
                  return (
                    <div
                      key={alert.alert_id}
                      onClick={() => {
                        setSelectedAlert(alert)
                        setAlertDialog(true)
                      }}
                      className={`flex items-center gap-3 p-1 h-14 rounded-lg border cursor-pointer hover:opacity-80 ${style.border} ${style.shadow} ${alert.is_read ? 'opacity-60' : 'bg-white'}`}
                    >
                      <div className={`p-2 rounded-lg ${style.icon} shrink-0`}>
                        {ALERT_ICONS[alert.alert_type] ?? <Activity size={18} />}
                      </div>
                      <div className='flex flex-col'>
                        <p className='text-xs font-semibold text-[#122A48] leading-tight'>
                          {alert.alert_type.replace(/_/g, ' ')} — {alert.node_name ?? 'Unknown Node'}
                        </p>
                        <p className='text-xs text-[#727272]'>
                          {new Date(alert.timestamp).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })} | {alert.barangay_name ?? '—'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>

        {/* sensor node health summary */}
        <>
          <div className="bg-[#FAFCFD] rounded-lg border border-[#00000040] text-[#122A48] mt-2 p-3 flex-1 min-h-[200px]">
            <div className="mb-2">
              <p className="font-semibold text-sm">Sensor Node Health Summary</p>
              <p className="text-[12px] text-[#727272]">Average across all active sensor nodes</p>
            </div>

            <div className="flex gap-3">

              {/* Battery Voltage */}
              <div onClick={() => setBatteryDialog(true)} className="border border-[#C6C6C8] rounded-lg p-3 min-[2560px]:p-4 min-[3840px]:p-5 text-[#122A48] flex-1 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] cursor-pointer hover:opacity-80">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex gap-2 items-center">
                    <Battery size={15} />
                    <p className="font-bold text-xs">Avg. Battery Voltage</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${batteryPct != null ? getDotColor(batteryPct) : 'bg-[#C6C6C8]'}`} />
                </div>
                <p className="text-2xl font-bold mt-1">{avgVoltage != null ? avgVoltage.toFixed(1) : '—'}</p>
                <p className="text-xs text-[#727272] mb-2">Volts</p>
                <div className="w-full bg-[#E5E5E6] rounded-full h-1.5">
                  {batteryPct != null && (
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${batteryPct}%`, backgroundColor: getBarColor(batteryPct) }} />
                  )}
                </div>
                <p className="text-[10px] text-[#727272] mt-1">
                  {batteryPct != null ? `${batteryPct}% avg. capacity across sensor nodes` : 'No data'}
                </p>
              </div>

              {/* 4G Signal */}
              <div onClick={() => setSignalDialog(true)} className="cursor-pointer hover:opacity-80 border border-[#C6C6C8] rounded-lg p-3 min-[2560px]:p-4 min-[3840px]:p-5 text-[#122A48] flex-1 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex gap-2 items-center">
                    <Signal size={15} />
                    <p className="font-bold text-xs">Avg. 4G Signal</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${signalPct != null ? getDotColor(signalPct) : 'bg-[#C6C6C8]'}`} />
                </div>
                <p className="text-2xl font-bold mt-1">{avgSignal != null ? avgSignal.toFixed(0) : '—'}</p>
                <p className="text-xs text-[#727272] mb-2">dBm</p>
                <div className="w-full bg-[#E5E5E6] rounded-full h-1.5">
                  {signalPct != null && (
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${signalPct}%`, backgroundColor: getBarColor(signalPct) }} />
                  )}
                </div>
                <p className="text-[10px] text-[#727272] mt-1">
                  {avgSignal != null ? getSignalLabel(avgSignal) : 'No data'}
                </p>
              </div>

              {/* Sensor Continuity */}
              <div onClick={() => setContinuityDialog(true)} className="border border-[#C6C6C8] rounded-lg p-3 min-[2560px]:p-4 min-[3840px]:p-5 text-[#122A48] flex-1 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] cursor-pointer hover:opacity-80">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex gap-2 items-center">
                    <ScanSearch size={15} />
                    <p className="font-bold text-xs">Sensor Continuity</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${allPassing == null ? 'bg-[#C6C6C8]' : allPassing ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
                <p className="text-2xl font-bold mt-1">
                  {allPassing == null ? '—' : allPassing ? 'OK' : 'FAIL'}
                </p>
                <p className="text-xs text-[#727272] mb-2">Continuity</p>
                <div className="w-full bg-[#E5E5E6] rounded-full h-1.5">
                  {totalSensorNodes > 0 && (
                    <div className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${(passingCount / totalSensorNodes) * 100}%`,
                        backgroundColor: allPassing ? '#4ADE80' : '#F87171'
                      }} />
                  )}
                </div>
                <p className="text-[10px] text-[#727272] mt-1">
                  {totalSensorNodes === 0
                    ? 'No data'
                    : `${passingCount} of ${totalSensorNodes} sensors passing continuity`}
                </p>
              </div>

            </div>
          </div>
        </>

        
      </div>

      {/* Alert Detail Dialog */}
      <Dialog open={alertDialog} onOpenChange={setAlertDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[350px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${ALERT_STYLE[selectedAlert?.alert_type ?? '']?.icon ?? ALERT_STYLE.default.icon}`}>
                  {ALERT_ICONS[selectedAlert?.alert_type ?? ''] ?? <Activity size={16} />}
                </div>
                <p className="font-bold text-sm">
                  {selectedAlert?.alert_type.replace(/_/g, ' ')}
                </p>
              </div>
              <button onClick={() => setAlertDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Alert Details</DialogTitle>
          <hr />

          {selectedAlert && (
            <div className="flex flex-col gap-2 text-sm">
              {/* Basic Info */}
              <div className="flex justify-between">
                <p className="text-[#727272]">Node</p>
                <p className="font-medium">{selectedAlert.node_name ?? '—'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Barangay</p>
                <p className="font-medium">{selectedAlert.barangay_name ?? '—'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Detected</p>
                <p className="font-medium">
                  {new Date(selectedAlert.timestamp).toLocaleString('en-PH', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                  })}
                </p>
              </div>

              <hr />

              {/* Context Data */}
              {selectedAlert.alert_context && Object.keys(selectedAlert.alert_context).length > 0 && (
                <>
                  <p className="font-semibold text-xs text-[#727272]">DETAILS</p>
                  {Object.entries(selectedAlert.alert_context).map(([key, value]) => {
                    // Format value based on key
                    let displayValue = value

                    if (typeof value === 'boolean') {
                      displayValue = value ? 'Connected' : 'Disconnected'
                    } else if (key === 'water_level') {
                      displayValue = `${value} cm`
                    } else if (key === 'water_flow_rate') {
                      displayValue = `${Number(value).toFixed(5)} m/s`
                    } else if (key.endsWith('_pct') || key === 'confidence') {
                      displayValue = `${Number(value).toFixed(1)}%`
                    } else if (key === 'estimated_volume') {
                      displayValue = `${value} kg`
                    } else if (key === 'battery_voltage') {
                      displayValue = `${Number(value).toFixed(2)} V`
                    } else if (key === 'signal_strength') {
                      displayValue = `${value} dBm`
                    }

                    return (
                      <div key={key} className="flex justify-between">
                        <p className="text-[#727272] capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="font-medium">{String(displayValue)}</p>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assigned Sensor Nodes Dialog */}
      <Dialog open={assignedNodesDialog} onOpenChange={setAssignedNodesDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[420px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#CDE3DE]">
                  <RadioTower size={16} color="#2C7B3C" />
                </div>
                <p className="font-bold text-sm">Assigned Sensor Nodes ({assignedNodes.length})</p>
              </div>
              <button onClick={() => setAssignedNodesDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Assigned Sensor Nodes</DialogTitle>
          <hr />

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {assignedNodes.length === 0 ? (
              <p className="text-xs text-[#727272] text-center py-6">No assigned sensor nodes.</p>
            ) : (
              assignedNodes.map(node => (
                <div key={node.node_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold">{node.node_name}</p>
                    <p className="text-[11px] text-[#727272]">{node.hotspot_details?.name ?? '—'}</p>
                  </div>
                  <p className="text-[11px] text-[#727272] text-right">{node.barangay_details?.barangay_name ?? '—'}</p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Critical Clogs Dialog */}
      <Dialog open={criticalClogsDialog} onOpenChange={setCriticalClogsDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[420px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#FFE5E5]">
                  <TriangleAlert size={16} color="#D81010" />
                </div>
                <p className="font-bold text-sm">Critical Clogs ({criticalClogs.length})</p>
              </div>
              <button onClick={() => setCriticalClogsDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Critical Clogs</DialogTitle>
          <hr />

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {criticalClogs.length === 0 ? (
              <p className="text-xs text-[#727272] text-center py-6">No critical clogs.</p>
            ) : (
              criticalClogs.map(clog => (
                <div key={clog.event_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold">{clog.node_details?.node_name ?? 'Unknown Node'}</p>
                    <p className="text-[11px] text-[#727272]">{clog.barangay_details?.barangay_name ?? '—'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFE5E5] text-[#D81010]">{clog.status}</span>
                    <p className="text-[10px] text-[#727272] mt-1">
                      {new Date(clog.detected_at).toLocaleString('en-PH', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Registered Barangay Dialog */}
      <Dialog open={registeredBarangayDialog} onOpenChange={setRegisteredBarangayDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[380px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#CDE3DE]">
                  <MapPinned size={16} color="#1f518f" />
                </div>
                <p className="font-bold text-sm">Registered Barangay ({registeredBarangays.length})</p>
              </div>
              <button onClick={() => setRegisteredBarangayDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Registered Barangay</DialogTitle>
          <hr />

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {registeredBarangays.length === 0 ? (
              <p className="text-xs text-[#727272] text-center py-6">No registered barangays.</p>
            ) : (
              registeredBarangays.map(barangay => (
                <div key={barangay.barangay_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                  <p className="text-xs font-semibold">{barangay.barangay_name}</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#CDE3DE] text-[#1f518f]">Registered</span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Resolved Clogs This Month Dialog */}
      <Dialog open={resolvedClogsDialog} onOpenChange={setResolvedClogsDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[420px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#1565BC29]">
                  <Droplets size={16} color="#1565BC" />
                </div>
                <p className="font-bold text-sm">Resolved this Month ({resolvedClogsThisMonth.length})</p>
              </div>
              <button onClick={() => setResolvedClogsDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Resolved Clogs This Month</DialogTitle>
          <hr />

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {resolvedClogsThisMonth.length === 0 ? (
              <p className="text-xs text-[#727272] text-center py-6">No clogs resolved this month.</p>
            ) : (
              resolvedClogsThisMonth.map(clog => (
                <div key={clog.event_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                  <div className="flex flex-col">
                    <p className="text-xs font-semibold">{clog.node_details?.node_name ?? 'Unknown Node'}</p>
                    <p className="text-[11px] text-[#727272]">{clog.barangay_details?.barangay_name ?? '—'}</p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#166534]">Cleared</span>
                    <p className="text-[10px] text-[#727272] mt-1">
                      {clog.resolved_at && new Date(clog.resolved_at).toLocaleString('en-PH', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Node Dialog */}
      <Dialog open={nodeDialog.open} onOpenChange={(open) => setNodeDialog({ open })}>
          <DialogContent className="w-[300px] text-[#122A48]">
          <DialogHeader className="pr-8 -mb-2">
            <DialogTitle className="flex items-center justify-between gap-2 font-bold">
              <div className="flex gap-2">
                <MapPin size={18} />
                <p className="text-sm">{selectedNode?.barangay_details?.barangay_name}</p>
              </div>
              <div>
                <p className="text-sm">{selectedNode?.node_name}</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <hr />
          
          <div className="flex flex-col gap-1 -mt-1">
            <div className="flex justify-between">
              <p>Status:</p>
              {selectedNode?.status === 'Maintenance'
                ? getStatusBadge('Maintenance')
                : getStatusBadge(selectedNode?.condition ?? 'Normal')}
            </div>
            <div className="flex justify-between">
              <p>Clog Detection:</p>
              <p>{selectedNode?.clog_pct != null ? `${selectedNode.clog_pct}%` : '— %'}</p>
            </div>
            <div className="flex justify-between">
              <p>Last Updated:</p>
              <p>
                {selectedNode?.last_reading_at
                  ? new Date(selectedNode.last_reading_at).toLocaleString('en-PH', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })
                  : '—'}
              </p>
            </div>
          </div>

          <hr />

          <div className="flex gap-7 -mt-1">
            {/* water level */}
            <div>
              <div className="flex gap-1 items-center border-r">
                <Droplet size={20} className="text-[#1565BC]"/>
                <p className="text-center">Water Level:</p>
              </div>

              <div className="flex justify-center mt-2">
                <p className="font-medium">
                  {selectedNode?.water_level != null
                    ? `${selectedNode.water_level} cm`
                    : '— cm'}
                </p>
              </div>

            </div>
            
            {/* water flow rate */}
            <div>
              <div className="flex gap-1 items-center border-l">
                <Waves size={20} className="text-[#1565BC]"/>
                <p className="text-center">Water Flow:</p>
              </div>

              <div className="flex justify-center mt-2">
                <p className="font-medium">
                  {selectedNode?.water_flow_rate != null
                    ? `${Number(selectedNode.water_flow_rate).toFixed(5)} m/s`
                    : '— m/s'}
                </p>
              </div>
            </div>
          </div>

        </DialogContent>
      </Dialog>
      
      {/* Waste Classification Detail Dialog */}
      <Dialog open={wasteDialog} onOpenChange={setWasteDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[350px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${WASTE_STYLE[selectedWaste?.dominant_waste_type ?? '']?.icon ?? WASTE_STYLE.None.icon}`}>
                  {WASTE_ICONS[selectedWaste?.dominant_waste_type ?? ''] ?? <Trash2 size={16} />}
                </div>
                <p className="font-bold text-sm">{selectedWaste?.dominant_waste_type}</p>
              </div>
              <button onClick={() => setWasteDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Waste Classification Details</DialogTitle>
          <hr />

          {selectedWaste && (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <p className="text-[#727272]">Node</p>
                <p className="font-medium">{selectedWaste.node_details?.node_name ?? '—'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Barangay</p>
                <p className="font-medium">{selectedWaste.node_details?.barangay_details?.barangay_name ?? '—'}</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Detected</p>
                <p className="font-medium">
                  {new Date(selectedWaste.timestamp).toLocaleString('en-PH', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                  })}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Confidence</p>
                <p className="font-medium">{selectedWaste.confidence.toFixed(1)}%</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Est. Volume</p>
                <p className="font-medium">{selectedWaste.estimated_volume} kg</p>
              </div>

              <hr />

              <p className="font-semibold text-xs text-[#727272]">COMPOSITION</p>
              <div className="flex justify-between">
                <p className="text-[#727272]">Recyclable</p>
                <p className="font-medium">{selectedWaste.recyclable_pct.toFixed(1)}%</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Biodegradable</p>
                <p className="font-medium">{selectedWaste.biodegradable_pct.toFixed(1)}%</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Residual</p>
                <p className="font-medium">{selectedWaste.residual_pct.toFixed(1)}%</p>
              </div>
              <div className="flex justify-between">
                <p className="text-[#727272]">Special Waste</p>
                <p className="font-medium">{selectedWaste.special_waste_pct.toFixed(1)}%</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Needs follow-up dialog */}
      <FollowUpDialog
        open={reportProgressDialog}
        onOpenChange={setReportProgressDialog}
        reports={reportsThisMonth}
        periodLabel={currentMonthLabel}
        onView={(r) => router.push(`/admin/history/barangay-reports/view-barangay-report/?id=${r.report_id}`)}
      />

      {/* Battery Voltage Dialog */}
      <Dialog open={batteryDialog} onOpenChange={setBatteryDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[380px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#E5E5E6]">
                  <Battery size={16} />
                </div>
                <p className="font-bold text-sm">Battery Voltage ({activeHealth.length})</p>
              </div>
              <button onClick={() => setBatteryDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Battery Voltage per Node</DialogTitle>
          <hr />

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {activeHealth.length === 0 ? (
              <p className="text-xs text-[#727272] text-center py-6">No active sensor nodes.</p>
            ) : (
              activeHealth.map(n => {
                const pct = n.battery_voltage != null ? getBatteryPct(n.battery_voltage) : null
                return (
                  <div key={n.node_details.node_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold">{n.node_details.node_name}</p>
                      <p className="text-[11px] text-[#727272]">{n.node_details.barangay_details?.barangay_name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pct != null ? getDotColor(pct) : 'bg-[#C6C6C8]'}`} />
                      <p className="text-xs font-medium">{n.battery_voltage != null ? `${n.battery_voltage.toFixed(1)}V` : '—'}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Signal Strength Dialog */}
      <Dialog open={signalDialog} onOpenChange={setSignalDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[380px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#E5E5E6]">
                  <Signal size={16} />
                </div>
                <p className="font-bold text-sm">4G Signal ({activeHealth.length})</p>
              </div>
              <button onClick={() => setSignalDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Signal Strength per Node</DialogTitle>
          <hr />

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {activeHealth.length === 0 ? (
              <p className="text-xs text-[#727272] text-center py-6">No active sensor nodes.</p>
            ) : (
              activeHealth.map(n => {
                const pct = n.signal_strength != null ? getSignalPct(n.signal_strength) : null
                return (
                  <div key={n.node_details.node_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold">{n.node_details.node_name}</p>
                      <p className="text-[11px] text-[#727272]">{n.node_details.barangay_details?.barangay_name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pct != null ? getDotColor(pct) : 'bg-[#C6C6C8]'}`} />
                      <p className="text-xs font-medium">{n.signal_strength != null ? `${n.signal_strength} dBm` : '—'}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sensor Continuity Dialog */}
      <Dialog open={continuityDialog} onOpenChange={setContinuityDialog}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[380px]">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-[#E5E5E6]">
                  <ScanSearch size={16} />
                </div>
                <p className="font-bold text-sm">Sensor Continuity ({passingCount}/{totalSensorNodes})</p>
              </div>
              <button onClick={() => setContinuityDialog(false)} className="cursor-pointer">
                <X size={16} />
              </button>
            </div>
          </DialogHeader>

          <DialogTitle className="sr-only">Sensor Continuity per Node</DialogTitle>
          <hr />

          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
            {latestHealthLogs.filter(n => assignedNodeIds.has(n.node_details.node_id)).length === 0 ? (
              <p className="text-xs text-[#727272] text-center py-6">No assigned sensor nodes reporting.</p>
            ) : (
              latestHealthLogs
                .filter(n => assignedNodeIds.has(n.node_details.node_id))
                .map(n => (
                  <div key={n.node_details.node_id} className="flex items-center justify-between gap-3 p-2 rounded-lg border border-[#E5E5E6]">
                    <div className="flex flex-col">
                      <p className="text-xs font-semibold">{n.node_details.node_name}</p>
                      <p className="text-[11px] text-[#727272]">{n.node_details.barangay_details?.barangay_name ?? '—'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n.sensor_continuity ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FFE5E5] text-[#D81010]'}`}>
                      {n.sensor_continuity ? 'PASS' : 'FAIL'}
                    </span>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
 }
