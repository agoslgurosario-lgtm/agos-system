"use client"

// react
import { useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"

// components
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import { ALERT_STYLE, WASTE_STYLE } from "@/lib/constant"
import { MapSkeleton } from "@/components/Skeleton/Menro/MapSkeleton"
import { useFillRows } from "@/components/hooks/useFillRows"

// auth
import { fetchWithAuth } from "@/lib/auth"
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { usePolling } from "@/components/hooks/usePolling"
import { usePageCache } from "@/components/hooks/usePageCache"

// shadcn
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// icons
import { Leaf, Recycle, Trash2, Biohazard, Siren, Activity, RadioTower, TriangleAlert, MapPin, Droplet, Waves, BatteryMedium, Signal, Radar, X   } from "lucide-react"


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

function getBatteryPct(voltage: number) {
  const min = 3.0, max = 4.2
  return Math.min(100, Math.max(0, Math.round(((voltage - min) / (max - min)) * 100)))
}

function getBarColor(pct: number) {
  if (pct >= 60) return "bg-[#4ADE80]"
  if (pct >= 30) return "bg-[#F5C518]"
  return "bg-[#F87171]"
}


type SensorNodes = {
  node_id: number
  barangay_details: { barangay_id: number; barangay_name: string } | null
  hotspot_details: {
    hotspot_id: number
    latitude: number
    longitude: number
  } | null
  node_name: string
  status: string
  installed_at: string
  condition: string | null
  water_level: number | null
  water_flow_rate: number | null
  clog_pct: number | null
  health_status: string
  health?: NodeHealth
  availability_status: string
  latitude: number | null
  longitude: number | null
  is_online: boolean
  is_force_sleeping: boolean
  last_reading_at: string | null
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

type Alert = {
  alert_id: number
  alert_type: string
  node_name: string | null
  barangay_name: string | null
  timestamp: string
  is_read: boolean
  alert_context?: Record<string, any>
}

type WasteClassification = {
  classification_id: number
  node_details: {
    node_id: number
    node_name: string
    barangay_details: { barangay_id: number; barangay_name: string }
  }
  dominant_waste_type: string
  timestamp: string
  confidence: number
  estimated_volume: number
  recyclable_pct: number
  biodegradable_pct: number
  residual_pct: number
  special_waste_pct: number
}

type Dialog = {
  open: boolean
}

// fetch raw data
const fetchSensorNodesRaw = async (): Promise<SensorNodes[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchAlertsRaw = async (): Promise<Alert[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  const alerts: Alert[] = data.results ?? data
  return alerts.filter(a => a.alert_type !== "Report_Submitted")
}

const fetchNodeHealthRaw = async (): Promise<NodeHealth[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/system-health/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchWasteClassificationRaw = async (): Promise<WasteClassification[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/waste-classifications/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function Map() {
  const router = useRouter()

  // data state
  const nodesCache = usePageCache('menroMap:sensorNodes', fetchSensorNodesRaw, [] as SensorNodes[], { autoFetch: false })
  const healthCache = usePageCache('menroMap:sensorHealth', fetchNodeHealthRaw, [] as NodeHealth[], { autoFetch: false })
  const wasteCache = usePageCache('menroMap:wasteClassification', fetchWasteClassificationRaw, [] as WasteClassification[], { autoFetch: false })
  const alertsCache = usePageCache('menroMap:alerts', fetchAlertsRaw, [] as Alert[], { autoFetch: false })

  const allSensorNodes = nodesCache.data
  const allSensorHealth = healthCache.data
  const allWasteClassification = wasteCache.data
  const allAlerts = alertsCache.data
  
  // dialog state
  const [selectedNode, setSelectedNode] = useState<SensorNodes | null>(null)
  const [nodeDialog, setNodeDialog] = useState({ open: false })
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [alertDialog, setAlertDialog] = useState(false)

  const [selectedWaste, setSelectedWaste] = useState<WasteClassification | null>(null)
  const [wasteDialog, setWasteDialog] = useState(false)

  const loading = nodesCache.loading || healthCache.loading || wasteCache.loading || alertsCache.loading

  const { panelRef: wastePanelRef, tableWrapRef: wasteWrapRef, rows: wasteRows } = useFillRows({
    rowHeight: 49.3,
    itemGap: 12,
    minRows: 3,
    reservePaginationSpace: false,
    deps: [loading],
  })
  const { panelRef: alertsPanelRef, tableWrapRef: alertsWrapRef, rows: alertRows } = useFillRows({
    rowHeight: 49.3,
    itemGap: 12,
    minRows: 3,
    reservePaginationSpace: false,
    deps: [loading],
  })

  // helpers
  const health = allSensorHealth.find(h => h.node_details.node_id === selectedNode?.node_id)
  const voltage = health?.battery_voltage
  const pct = voltage != null ? getBatteryPct(voltage) : null
  const signal = health?.signal_strength
  const signalPct = signal != null 
    ? Math.min(100, Math.max(0, Math.round(((signal + 100) / 60) * 100)))
    : null
  const sensorOk = health?.sensor_continuity


  const fetchAllMapData = useCallback(async () => {
    await Promise.allSettled([
      nodesCache.refetch(),
      healthCache.refetch(),
      alertsCache.refetch(),
      wasteCache.refetch(),
    ])
  }, [])

  useEffect(() => {
    fetchAllMapData()
  }, [])

  usePolling(fetchAllMapData, 30000)

  // handlers
  const handleSelectNode = (nodeId: number) => {
    const node = allSensorNodes.find(n => n.node_id === nodeId)
    if (!node) return

    const health = allSensorHealth.find(h => h.node_details.node_id === nodeId)

    setSelectedNode({ ...node, health })
    setNodeDialog({ open: true })
  }

  const todayAlerts = allAlerts.filter(alert => {
    const alertDate = new Date(alert.timestamp)
    const today = new Date()
    return (
      alertDate.getFullYear() === today.getFullYear() &&
      alertDate.getMonth() === today.getMonth() &&
      alertDate.getDate() === today.getDate()
    )
  })

  const todayWaste = allWasteClassification
    .filter(waste => {
      const wasteDate = new Date(waste.timestamp)
      const today = new Date()
      return (
        wasteDate.getFullYear() === today.getFullYear() &&
        wasteDate.getMonth() === today.getMonth() &&
        wasteDate.getDate() === today.getDate()
      )
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  useWebSocket({
    path: "/ws/alerts/",
    onMessage: (newAlert) => {
      if (newAlert.alert_type === "Report_Submitted") return
      alertsCache.setData(prev => [newAlert, ...prev])
    },
  })

  useWebSocket({
    path: "/ws/sensor-readings/",
    onMessage: (reading) => {
      nodesCache.setData(prev => prev.map(node =>
        node.node_id === reading.node_details.node_id
          ? { ...node, water_level: reading.water_level, water_flow_rate: reading.water_flow_rate, clog_pct: reading.clog_pct, condition: reading.reading_status }
          : node
      ))
    },
  })

  useWebSocket({
    path: "/ws/waste-classification/",
    onMessage: (newWaste) => {
      wasteCache.setData(prev => [newWaste, ...prev])
    },
  })

  if (loading) return <MapSkeleton/>


  return (
    <>
      <div className="hidden md:flex flex-col">

        {/* root container */}
        <div className="text-[#122A48] flex gap-2 h-[calc(98vh-theme(spacing.16))]">
          {/* map */}
          <div className="bg-[#FAFCFD] rounded-lg border border-[#C6C6C8] flex-1 min-w-0 flex flex-col">
            <div className="w-full p-2 shrink-0">
              <p className="text-sm font-bold">Canal Network Map - Rosario, La Union</p>
            </div>

            <div className="flex-1 overflow-hidden">
              <AgosMapWrapper
                markers={allSensorNodes
                  .filter(n => n.latitude != null && n.longitude != null)
                  .map(n => ({
                    latitude:  n.latitude!,
                    longitude: n.longitude!,
                    label: `${n.node_name} – ${n.barangay_details?.barangay_name ?? ''}`,
                    condition:
                      n.status === 'Maintenance'            ? 'Maintenance' :
                      (n.is_force_sleeping || !n.is_online) ? 'Sleep' :
                      (n.condition ?? 'Normal'),
                    onMarkerClick: () => handleSelectNode(n.node_id),
                  }))}
                zoom={13}
                showMarkerPopups={false}
              />
            </div>

          </div>

          {/* waste */}
          <div ref={wastePanelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-67 rounded-lg flex flex-col min-h-0'>
            <div className='flex justify-between items-center p-2'>
              <p className='font-semibold text-[#122A48] text-xs'>Live Waste Classification</p>
            </div>
            <hr className='border-[#C6C6C8]' />
            <div ref={wasteWrapRef} className='flex flex-col gap-3 p-2 overflow-y-auto flex-1 min-h-0'>
              {todayWaste.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full py-60 gap-2'>
                  <Trash2 size={28} color="#C6C6C8" />
                  <p className='text-xs text-[#727272] text-center'>No waste classification today</p>
                </div>
              ) : (
                todayWaste.slice(0, wasteRows).map(waste => {
                  const style = WASTE_STYLE[waste.dominant_waste_type] ?? WASTE_STYLE.None
                  return (
                    <div
                      key={waste.classification_id}
                      onClick={() => { setSelectedWaste(waste); setWasteDialog(true) }}
                      className={`h-[49.3] flex items-center gap-3 p-1 rounded-lg border cursor-pointer hover:opacity-80 ${style.border} ${style.shadow} bg-white`}
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
          
          {/* alert */}
          <div ref={alertsPanelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-67 rounded-lg flex flex-col'>
            <div className='flex justify-between items-center p-2 text-xs'>
              <p className='font-semibold text-[#122A48]'>Live Alerts</p>
            </div>
            <hr className='border-[#C6C6C8]' />
            <div ref={alertsWrapRef} className='flex flex-col gap-3 p-2 overflow-y-auto flex-1 min-h-0'>
              {todayAlerts.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-full py-60 gap-2'>
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
                      className={`h-[49.3] flex items-center gap-3 p-1 rounded-lg border cursor-pointer hover:opacity-80 ${style.border} ${style.shadow} ${alert.is_read ? 'opacity-60' : 'bg-white'}`}
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

      </div>

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

              {selectedAlert.alert_context && Object.keys(selectedAlert.alert_context).length > 0 && (
                <>
                  <p className="font-semibold text-xs text-[#727272]">DETAILS</p>
                  {Object.entries(selectedAlert.alert_context).map(([key, value]) => {
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
    
    </>
  )
}

