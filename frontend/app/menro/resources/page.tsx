"use client"

// icons
import { RadioTower, Trash2, TriangleAlert, BadgeCheck } from "lucide-react";

// react
import { useEffect, useCallback } from "react"

// auth
import { fetchWithAuth } from "@/lib/auth";

// shadcn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

// component
import { TablePagination } from "@/components/TablePagination";
import { usePagination } from "@/components/hooks/usePagination";
import { ResourcesSkeleton } from "@/components/Skeleton/Menro/ResourcesSkeleton";
import { useFillRows } from "@/components/hooks/useFillRows";

// lib
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { usePolling } from "@/components/hooks/usePolling"
import { usePageCache } from "@/components/hooks/usePageCache";
import { SpinnerIcon } from "@/components/SpinnerIcon";
import { formatWeight } from "@/lib/formatWeight";


type SensorNode = {
  node_id: number
  node_name: string
  barangay_details: { barangay_id: number; barangay_name: string }
  hotspot_details: {
    hotspot_id: number
    name: string
    latitude: number
    longitude: number
    canal_width: number | null
    sensor_height: number | null
    max_capacity_kg: number | null
  } | null
  status: string
  condition: string | null
  water_level: number | null
  water_flow_rate: number | null
  clog_pct: number | null
  installed_at: string
  is_online?: boolean
}

type SensorReadings = {
  reading_id: number
  water_level: number | null
  water_flow_rate: number | null
  clog_pct: number | null
  reading_status: string
  overall_status: string | null
  timestamp: string
  node_details: {
    node_id: number
    node_name: string
  }
}

type WasteClassification = {
  classification_id: number
  dominant_waste_type: string
  node_details: {
    node_id: number
    node_name: string
    barangay_details: {
      barangay_id: number
      barangay_name: string
    }
    hotspot_details: {
      hotspot_id: number
      name: string
      max_capacity_kg: number | null
    } | null
  }
  reading_details: {
    reading_id: number
    node_details: {
      node_id: number
    }
    timestamp: string
    water_level: string
    water_flow_rate: number
    water_flow: string
    reading_status: string
  }
  confidence: number
  estimated_volume: number
  timestamp: string
}

type Clogs = {
  event_id: number
  severity: string
  detected_at: string
  resolved_at: string
  status: string
  barangay_details: { barangay_id: number; barangay_name: string } | null
  node_details: {
    node_id: number
    node_name: string
    water_level: number | null
    water_flow_rate: number | null
  } | null
  cleared_by_details : {
    user_id: number
    first_name: string
    last_name: string
    position: string
  } | null
}

const getClogSeverity = (clogPct: number | null) => {
  if (clogPct === null) {
    return { label: "Unknown", barColor: "bg-[#9CA3AF]", textClass: "text-[#727272] font-semibold" }
  }
  if (clogPct >= 80) {
    return { label: "Critical", barColor: "bg-[#D81010]", textClass: "text-[#D81010] font-semibold" }
  }
  if (clogPct >= 30) {
    return { label: "Warning", barColor: "bg-[#FF9705]", textClass: "text-[#FF9705] font-semibold" }
  }
  return { label: "Normal", barColor: "bg-[#1565BC]", textClass: "text-[#1565BC] font-semibold" }
}

const getClogRankLevel = (clogPct: number | null) => {
  if (clogPct === null) {
    return { label: "UNKNOWN", color: "bg-[#9CA3AF]", action: "AWAITING CANAL DATA" }
  }
  if (clogPct >= 80) {
    return { label: "CRITICAL", color: "bg-[#E85656]", action: "IMMEDIATE ACTION" }
  }
  if (clogPct >= 30) {
    return { label: "MEDIUM", color: "bg-[#FFCC00]", action: "WITHIN 24 HOURS" }
  }
  return { label: "LOW", color: "bg-[#2C7B3C]", action: "MONITOR CLOSELY" }
}

// fetch raw data
const fetchSensorNodeRaw = async (): Promise<SensorNode[]> => {
  const res = await fetchWithAuth(`/api/sensor-nodes/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchReadingsRaw = async (): Promise<SensorReadings[]> => {
  const res = await fetchWithAuth(`/api/sensor-readings/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchWasteRaw = async (): Promise<WasteClassification[]> => {
  const res = await fetchWithAuth(`/api/waste-classifications/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchClogsRaw = async (): Promise<Clogs[]> => {
  const res = await fetchWithAuth(`/api/clog-events/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function Resources() {
  // fetch data states
  const sensorNodesCache = usePageCache('menroResources:sensorNodes', fetchSensorNodeRaw, [] as SensorNode[], { autoFetch: false })
  const readingsCache = usePageCache('menroResources:readings', fetchReadingsRaw, [] as SensorReadings[], { autoFetch: false })
  const wasteCache = usePageCache('menroResources:waste', fetchWasteRaw, [] as WasteClassification[], { autoFetch: false })
  const clogsCache = usePageCache('menroResources:clogs', fetchClogsRaw, [] as Clogs[], { autoFetch: false })

  const allSensorNodes = sensorNodesCache.data
  const allReadings = readingsCache.data
  const allWasteClassification = wasteCache.data
  const allClogs = clogsCache.data

  const loading = sensorNodesCache.loading || readingsCache.loading || wasteCache.loading || clogsCache.loading
  const fetchError = sensorNodesCache.error || readingsCache.error || wasteCache.error || clogsCache.error
  const retrying = sensorNodesCache.retrying || readingsCache.retrying || wasteCache.retrying || clogsCache.retrying
  
  const nodesWithHotspot = allSensorNodes.filter(n => n.hotspot_details != null)

  const latestReadingMap = allReadings.reduce((acc, reading) => {
    const nodeId = reading.node_details.node_id

    if (
      !acc[nodeId] ||
      new Date(reading.timestamp) > new Date(acc[nodeId].timestamp)
    ) {
      acc[nodeId] = reading
    }

    return acc
  }, {} as Record<number, SensorReadings>)

  const getLatestClogPct = (nodeId: number) => {
    const latestReading = latestReadingMap[nodeId] ?? null
    const fallbackNode = allSensorNodes.find(n => n.node_id === nodeId)

    // No recent reading turn to offline
    if (fallbackNode && fallbackNode.is_online === false) {
      return { clogPct: null, latestReading }
    }

    return {
      clogPct: latestReading?.clog_pct ?? fallbackNode?.clog_pct ?? null,
      latestReading,
    }
  }

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 3,
    deps: [loading],
  })
  
  const latestWasteByNode = allWasteClassification.reduce((acc, waste) => {
    const nodeId = waste.node_details.node_id
    if (
      !acc[nodeId] ||
      new Date(waste.timestamp).getTime() > new Date(acc[nodeId].timestamp).getTime()
    ) {
      acc[nodeId] = waste
    }
    return acc
  }, {} as Record<number, WasteClassification>)

  const openEventByNode = allClogs.reduce((acc, c) => {
    if ((c.status === 'Detected' || c.status === 'Responded') && c.node_details) {
      const id = c.node_details.node_id
      if (!acc[id] || new Date(c.detected_at) < new Date(acc[id].detected_at)) acc[id] = c
    }
    return acc
  }, {} as Record<number, Clogs>)

  const getHoursOpen = (nodeId: number) => {
    const e = openEventByNode[nodeId]
    return e ? Math.max(0, Math.round((Date.now() - new Date(e.detected_at).getTime()) / 3600000)) : null
  }

  const rankedNodes = [...nodesWithHotspot].sort((a, b) => {
    const clogA = getLatestClogPct(a.node_id).clogPct ?? -1
    const clogB = getLatestClogPct(b.node_id).clogPct ?? -1
    return clogB - clogA
  })

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(rankedNodes, 5)

  const priorityQueue = rankedNodes.map((node, index) => {
    const pct = getLatestClogPct(node.node_id).clogPct
    const rankInfo = getClogRankLevel(pct)
    const waste = latestWasteByNode[node.node_id]
    const openEvent = openEventByNode[node.node_id]
    const isUnknown = rankInfo.label === 'UNKNOWN'

    return {
      rank: index + 1,
      barangay: node.barangay_details?.barangay_name ?? "—",
      node_name: node.node_name,
      pct,
      label: rankInfo.label,
      action: rankInfo.action,
      wasteType: !isUnknown && waste && waste.dominant_waste_type !== 'None' ? waste.dominant_waste_type : '—',
      kg: !isUnknown && waste ? waste.estimated_volume : null,
      hoursOpen: openEvent
        ? Math.max(0, Math.round((Date.now() - new Date(openEvent.detected_at).getTime()) / 3600000))
        : null,
    }
  })

  // summary cards
  const totalSensorNodes = nodesWithHotspot.length

  const criticalAreas = nodesWithHotspot.filter(node => {
    if (node.is_online === false) return false
    const latest = latestReadingMap[node.node_id]
    return (latest?.overall_status ?? latest?.reading_status) === 'Critical'
  }).length

  const totalWaste = Object.values(latestWasteByNode).reduce(
    (sum, w) => sum + (w.estimated_volume ?? 0),
    0
  )

  const clearedAreas = allClogs.filter(c => c.status === 'Cleared' || c.status === 'Verified').length

  const fetchAllResourceData = useCallback(async () => {
    await Promise.allSettled([
      sensorNodesCache.refetch(),
      readingsCache.refetch(),
      wasteCache.refetch(),
      clogsCache.refetch(),
    ])
  }, [])

  useEffect(() => {
    fetchAllResourceData()
  }, [])

  usePolling(fetchAllResourceData, 30000)

  useWebSocket({
    path: "/ws/waste-classification/",
    onMessage: (newWaste) => {
      wasteCache.setData(prev => [newWaste, ...prev])
    },
  })

  useWebSocket({
    path: "/ws/sensor-readings/",
    onMessage: (reading) => {
      sensorNodesCache.setData(prev =>
        prev.map(n => n.node_id === reading.node_details?.node_id ? { ...n, is_online: true } : n)
      )
      readingsCache.setData(prev =>
        prev.some(r => r.reading_id === reading.reading_id)
          ? prev.map(r => r.reading_id === reading.reading_id ? reading : r)
          : [reading, ...prev]
      )
    },
  })

  useWebSocket({
    path: "/ws/clog-events/",
    onMessage: (newClog) => {
      clogsCache.setData(prev => [newClog, ...prev])
    },
  })

  if (loading) return <ResourcesSkeleton/>

  if (fetchError) {
    return (
      <div className="hidden md:flex md:flex-col md:h-full items-center justify-center gap-3">
        {retrying ? (
          <>
            <SpinnerIcon size={32} color="#D81010" />
            <p className="text-[#D81010] font-semibold">Retrying...</p>
          </>
        ) : (
          <>
            <p className="text-[#D81010] font-semibold">Failed to load resource optimization data. Please try again later.</p>
            <Button
              onClick={fetchAllResourceData}
              className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100"
            >
              Retry
            </Button>
          </>
        )}
      </div>
    )
  }


  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* total cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48]">
          {[
          { icon: <RadioTower size={20} color="#2C7B3C" />, bg: "bg-[#CDE3DE]", count: totalSensorNodes, label: "Total Assigned Sensor Nodes" },
          { icon: <Trash2 size={20} color="#122A48" />, bg: "bg-[#CDE3DE]", count: formatWeight(totalWaste), label: "Total Waste" },
          { icon: <TriangleAlert size={20} color="#D81010" />, bg: "bg-[#FFE5E5]", count: criticalAreas, label: "Critical Areas" },
          { icon: <BadgeCheck size={20} color="#1565BC" />, bg: "bg-[#1565BC29]", count: clearedAreas, label: "Cleared Clogs" },
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

        {/* waste hotspot, trash accumulated, priority */}
          <div className="flex gap-2 text-[#122A48] mt-2 h-70">
          {/* waste hotspot */}
          <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] bg-[#FAFCFD] flex-1 min-w-[320px] flex flex-col overflow-hidden">
            <div className="w-full">
              <p className="font-bold p-2 text-sm">WASTE HOTSPOT STATUS</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Table>
                <TableHeader className="bg-[#F5F6F9]">
                  <TableRow>
                    <TableHead className="text-[#727272] text-left text-xs">NODE</TableHead>
                    <TableHead className="text-[#727272] text-left text-xs">NAME</TableHead>
                    <TableHead className="text-[#727272] text-left text-xs">LOCATION</TableHead>
                    <TableHead className="text-[#727272] text-left text-xs">STATUS</TableHead>
                    <TableHead className="text-[#727272] text-left text-xs">LAST UPDATED</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {fetchError ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-15">
                        ...
                      </TableCell>
                    </TableRow>
                  ) : (
                    nodesWithHotspot.map((node) => {
                      const latestReading = latestReadingMap[node.node_id]
                      const clogPct = getLatestClogPct(node.node_id).clogPct
                      const clogSeverity = getClogSeverity(clogPct)

                      return (
                        <TableRow key={node.node_id}>
                          <TableCell className="text-left text-xs">
                            {node.node_id}
                          </TableCell>

                          <TableCell className="text-left text-xs">
                            {node.node_name}
                          </TableCell>

                          <TableCell className="text-left text-xs">
                            {node.barangay_details?.barangay_name ?? "—"}
                          </TableCell>

                          <TableCell className="text-left text-xs">
                            <span
                              className={`text-xs inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold ${clogSeverity.textClass}`}
                            >
                              {clogSeverity.label}
                            </span>
                          </TableCell>

                          <TableCell className="text-left text-xs">
                            {latestReading
                              ? new Date(latestReading.timestamp).toLocaleString("en-PH", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: true,
                                })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

          </div>



          {/* priority */}
          <div className="rounded-lg border border-[#C6C6C8] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] bg-[#FAFCFD] flex flex-col flex-1 min-w-[300px]">
  
            <div className="p-2 border-b">
              <p className="font-bold text-sm">PRIORITY DEPLOYMENT QUEUE</p>
              <p className="text-xs text-[#727272]">
                Based on clog severity.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {priorityQueue.map(item => (
                <div key={item.rank} className="flex items-center justify-between border rounded-lg p-3 bg-white">
                  
                  <div className="flex items-center gap-3">
                    
                    {/* rank badge */}
                    <div className="w-6 h-6 flex items-center justify-center rounded-md bg-[#E5E7EB] text-[10px] font-bold">
                      {item.rank}
                    </div>

                    {/* info */}
                    <div>
                      <p className="text-xs font-semibold">
                        {item.node_name}
                      </p>
                      <p className="text-[11px] text-[#727272]">
                        {item.barangay}
                      </p>
                      <p className="text-[11px]">
                        Clog: {item.pct === null ? "—" : `${Math.round(item.pct)}%`}
                      </p>
                      <p className="text-[11px] text-[#727272]">
                        {item.wasteType} · {item.kg === null ? "—" : `${formatWeight(item.kg)} (est.)`}
                      </p>
                      <p className="text-[11px] text-[#727272]">
                        {item.hoursOpen === null ? "No open clog" : `Open for ${item.hoursOpen} h`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      item.label === "CRITICAL"
                        ? "bg-[#FFE5E5] text-[#D81010]"
                        : item.label === "HIGH"
                        ? "bg-[#FFF3D6] text-[#F59E0B]"
                        : item.label === "MEDIUM"
                        ? "bg-[#FEF9C3] text-[#A16207]"
                        : item.label === "UNKNOWN"
                        ? "bg-[#E5E7EB] text-[#6B7280]"
                        : "bg-[#DCFCE7] text-[#166534]"
                    }`}>
                      {item.label}
                    </span>

                    <p className={`text-[10px] font-semibold ${
                      item.label === "CRITICAL"
                        ? "text-[#D81010]"
                        : item.label === "HIGH"
                        ? "text-[#F59E0B]"
                        : item.label === "MEDIUM"
                        ? "text-[#A16207]"
                        : item.label === "UNKNOWN"
                        ? "text-[#6B7280]"
                        : "text-[#16A34A]"
                    }`}>
                      {item.action}
                    </p>
                  </div>

                </div>
              ))}
            </div>

                          <div className="border-t px-4 py-2 mt-auto">
                <div className="flex flex-wrap justify-center gap-3 text-[10px] text-[#122A48]">
                  <div className="flex flex-col items-center">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#E85656]" />
                      <span>80% - 100%</span>
                    </div>
                    <div>
                      <p>Critical</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FFCC00]" />
                      <span>30% - 79%</span>
                    </div>
                    <div>
                      <p>Medium</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#2C7B3C]" />
                      <span>0% - 29%</span>
                    </div>
                    <div>
                      <p>Low</p>
                    </div>
                  </div>
                </div>
              </div>

          </div>
        </div>

        {/* all waste hotspots */}
        <div className="mt-2 bg-[#FAFCFD] border border-[#C6C6C8] rounded-lg flex-1 min-h-[284px] flex flex-col">
          <div className="flex gap-2 w-full p-3 items-center">
            <p className="font-bold text-sm">WASTE HOTSPOTS</p> <p className="text-[11px]">&#40;DETAILED LIST&#41;</p>
          </div>
          <Table>
              <TableHeader className="bg-[#CFD8D] border">
              <TableRow>
                  <TableHead className="text-left text-xs text-[#727272]">NODE</TableHead>
                  <TableHead className="text-left text-xs text-[#727272]">LOCATION</TableHead>
                  <TableHead className="text-left text-xs text-[#727272]" title="Based on water flow rate (60%) and rising water level (40%)">CLOG SEVERITY INDEX</TableHead>
                  <TableHead className="text-left text-xs text-[#727272]">DOMINANT WASTE TYPE</TableHead>
                  <TableHead className="text-left text-xs text-[#727272]">ESTIMATED WASTE</TableHead>
                  <TableHead className="text-left text-xs text-[#727272]">OPEN FOR</TableHead>
                  <TableHead className="text-left text-xs text-[#727272]">STATUS</TableHead>
                  <TableHead className="text-left text-xs text-[#727272]">LAST UPDATED</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rankedNodes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-sm text-[#727272] py-20"
                  >
                    No waste hotspots data available.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((node) => {
                  const { clogPct, latestReading } = getLatestClogPct(node.node_id)
                  const clogSeverity = getClogSeverity(clogPct)
                  const latestWaste = latestWasteByNode[node.node_id]
                  const hoursOpen = getHoursOpen(node.node_id)
                  const isUnknown = clogSeverity.label === 'Unknown'

                  return (
                    <TableRow
                      key={node.node_id}
                      className="border-b-0"
                    >

                      {/* Node */}
                      <TableCell className="text-left text-xs">
                        {node.node_id}
                      </TableCell>

                      {/* Location */}
                      <TableCell className="text-left text-xs">
                        {node.barangay_details?.barangay_name ?? "—"}
                      </TableCell>

                      {/* Severity Index (clog_pct based) */}
                      <TableCell className="flex justify-left">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-3 rounded-full border border-[#64748B] overflow-hidden bg-[#E5E7EB]">
                            <div
                              className={`${clogSeverity.barColor} h-full rounded-full`}
                              style={{
                                width: `${clogPct ?? 0}%`
                              }}
                            />
                          </div>

                          <span className="text-xs min-w-[40px]">
                            {clogPct === null ? "—" : `${Math.round(clogPct)}%`}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-left text-xs">
                        {!isUnknown && latestWaste && latestWaste.dominant_waste_type !== 'None' ? latestWaste.dominant_waste_type : "—"}
                      </TableCell>

                      <TableCell className="text-left text-xs">
                        {!isUnknown && latestWaste ? `${formatWeight(latestWaste.estimated_volume)} (est.)` : "—"}
                      </TableCell>

                      <TableCell className="text-left text-xs">
                        {hoursOpen === null ? "No open clog" : `${hoursOpen} h`}
                      </TableCell>

                      {/* Status — derived from the same clog_pct as the Severity Index above,
                          so the two columns can never disagree in the same row. */}
                      <TableCell className="text-left text-xs">
                        <span className={`text-xs inline-flex items-center gap-1.5 py-1 rounded-full font-semibold ${clogSeverity.textClass}`}>
                          {clogSeverity.label}
                        </span> 
                      </TableCell>

                      <TableCell className="text-left text-xs">
                        {latestReading
                          ? new Date(latestReading.timestamp).toLocaleString("en-PH", {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
            <div className='mt-auto'>
              <TablePagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
        </div>
      </div>
    
    </>
  )
}