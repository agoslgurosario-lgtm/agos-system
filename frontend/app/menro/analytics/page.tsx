"use client"

// react
import { useEffect, useState, useCallback } from "react"

// auth
import { fetchWithAuth } from "@/lib/auth";

// charts
import { PieChart, Pie, Cell } from "recharts"

// icons
import { FileDown, Trash, Trash2, Recycle, Leaf, Biohazard, } from "lucide-react";

// shadcn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

// components
import { usePagination } from "@/components/hooks/usePagination"
import { TablePagination } from "@/components/TablePagination"
import { useToast } from "@/components/hooks/useToast"
import { Toast } from "@/components/Toast"
import { AnalyticsSkeleton } from "@/components/Skeleton/Menro/AnalyticsSkeleton";
import { useFillRows } from "@/components/hooks/useFillRows";
import { PrintReport } from "@/components/PrintReport/PrintReport"

// lib
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { usePolling } from "@/components/hooks/usePolling"
import { usePageCache } from "@/components/hooks/usePageCache";
import { SpinnerIcon } from "@/components/SpinnerIcon";
import { printReport } from "@/lib/printReport";
import { getUser } from "@/lib/auth";


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

// fetch raw data
const fetchBarangaysRaw = async (): Promise<{ barangay_id: number; barangay_name: string }[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/barangays/?is_registered=true`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchSensorNodesRaw = async () => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function Analytics() {
  // waste classification state
  const fetchWasteRaw = async (): Promise<WasteClassification[]> => {
    let url: string | null =
      `${process.env.NEXT_PUBLIC_API_URL}/api/waste-classifications/?month=${selectedMonth}&page_size=100`
    let all: WasteClassification[] = []

    while (url) {
      const res = await fetchWithAuth(url)
      if (!res.ok) throw new Error()
      const data = await res.json()

      if (Array.isArray(data)) {
        all = data
        url = null
      } else {
        all = all.concat(data.results ?? [])
        url = data.next
      }
    }

    return all
  }

  const barangaysCache = usePageCache('menroAnalytics:barangays', fetchBarangaysRaw, [] as { barangay_id: number; barangay_name: string }[], { autoFetch: false })
  const sensorNodesCache = usePageCache('menroAnalytics:sensorNodes', fetchSensorNodesRaw, [] as { node_id: number; node_name: string }[], { autoFetch: false })
  const wasteCache = usePageCache('menroAnalytics:waste', fetchWasteRaw, [] as WasteClassification[], { autoFetch: false })

  const wasteClassification = wasteCache.data
  const allBarangays = barangaysCache.data
  const allSensorNodes = sensorNodesCache.data
  const loading = wasteCache.loading || barangaysCache.loading || sensorNodesCache.loading
  const fetchError = wasteCache.error

  const [exporting, setExporting] = useState(false)
  const { toasts, addToast, removeToast } = useToast()

  const getMonthOptions = () => {
    const months = []
    const year = new Date().getFullYear()
    for (let m = 0; m < 12; m++) {
      const d = new Date(year, m, 1)
      months.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      })
    }
    return months
  }

  const monthOptions = getMonthOptions()
  const currentMonthValue = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthValue)

  // summary cards
  const totalWaste = wasteClassification.reduce((sum, w) => sum + (w.estimated_volume || 0), 0)
  const totalRecyclable = wasteClassification.reduce(
    (sum, w) => sum + (w.estimated_volume || 0) * (w.recyclable_pct || 0) / 100,
    0
  )
  const totalBiodegradable = wasteClassification.reduce(
    (sum, w) => sum + (w.estimated_volume || 0) * (w.biodegradable_pct || 0) / 100,
    0
  )
  const totalResidual = wasteClassification.reduce(
    (sum, w) => sum + (w.estimated_volume || 0) * (w.residual_pct || 0) / 100,
    0
  )
  const totalSpecialWaste = wasteClassification.reduce(
    (sum, w) => sum + (w.estimated_volume || 0) * (w.special_waste_pct || 0) / 100,
    0
  )

  const filtered = wasteClassification

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 35,
    initialRows: 5,
    deps: [loading],
  })
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)

  const wasteByBarangay = allBarangays
    .map(b => {
      const total = wasteClassification
        .filter(w => w.node_details.barangay_details?.barangay_id === b.barangay_id)
        .reduce((sum, w) => sum + (w.estimated_volume || 0), 0)
      return { barangay_id: b.barangay_id, barangay_name: b.barangay_name, total }
    })
    .sort((a, b) => b.total - a.total)

  const maxBarangayWaste = Math.max(...wasteByBarangay.map(b => b.total), 0)

  // waste composition percentages
  const compositionData = [
    { name: "Recyclable Waste", value: totalRecyclable, color: "#7ED99B" },
    { name: "Biodegradable Waste", value: totalBiodegradable, color: "#7CB3E8" },
    { name: "Residual Waste", value: totalResidual, color: "#E8B27C" },
    { name: "Special Waste", value: totalSpecialWaste, color: "#E87C7C" },
  ]

  const printRows = filtered.map(c => [
    c.classification_id,
    c.node_details?.node_name ?? '—',
    c.node_details?.barangay_details?.barangay_name ?? '—',
    c.dominant_waste_type,
    `${Number(c.recyclable_pct).toFixed(2)}%`,
    `${Number(c.biodegradable_pct).toFixed(2)}%`,
    `${Number(c.residual_pct).toFixed(2)}%`,
    `${Number(c.special_waste_pct).toFixed(2)}%`,
    `${Number(c.confidence).toFixed(2)}%`,
    `${Number(c.estimated_volume).toFixed(2)} kg`,
    c.timestamp ? new Date(c.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
  ])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

  const handlePrint = () => {
    printReport()
  }

  useEffect(() => {
    wasteCache.refetch()
  }, [selectedMonth])

  useEffect(() => {
    barangaysCache.refetch()
    sensorNodesCache.refetch()
  }, [])

  usePolling(async () => { await wasteCache.refetch() }, 30000) 

useWebSocket({
    path: "/ws/waste-classification/",
    onMessage: (newWaste) => {
      const wasteMonth = newWaste.timestamp.slice(0, 7) // "YYYY-MM"
      if (wasteMonth === selectedMonth) {
        wasteCache.setData(prev => [newWaste, ...prev])
      }
    },
  })

  if (loading) return <AnalyticsSkeleton/>

  return (
    <>
        <div className="hidden md:flex md:flex-col md:h-full text-[#122A48]">

        <div className='w-full mb-2 flex justify-between'>
          <div>
            <p className='font-bold text-base'>Overview</p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className='min-w-0 !max-h-70 overflow-y-auto'>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} className="p-2 py-1 cursor-pointer text-[#122A48]" value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handlePrint} className="bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer">
              <FileDown size={16} className="mr-1" />
              Export
            </Button>
          </div>
        </div>

        {/* total cards */}
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-3 w-full text-[#122A48] mt-1">
          {[
            { icon: <Trash size={20} color="#122A48" />, bg: "bg-[#CDE3DE]", count: totalWaste, label: "Total Waste Detected" },
            { icon: <Recycle size={20} color="#1565BC" />, bg: "bg-[#1565BC61]", count: totalRecyclable, label: "Recyclable" },
            { icon: <Leaf size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: totalBiodegradable, label: "Biodegradable" },
            { icon: <Trash2 size={20} color="#122A48CC" />, bg: "bg-[#D9D9D9]", count: totalResidual, label: "Residual" },
            { icon: <Biohazard size={20} color="#D48A00" />, bg: "bg-[#F4E4A6]", count: totalSpecialWaste, label: "Special" },
          ].map(card => (
            <div key={card.label} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-[#122A48] leading-tight">
                  {card.count.toFixed(1)} <span className="text-xs font-normal">kg</span>
                </span>
                <p className="text-xs text-[#122A48]">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-3">
          {/* collected by barangay */}
          <div className="bg-[#FAFCFD] rounded-lg border border-[#C6C6C8] flex-1 min-w-0">
            <div className="w-full p-2">
              <p className="font-bold text-sm">Collection by Barangay</p>
            </div>

            <hr/>

            <div className="flex flex-col gap-3 px-3 py-4">
              {wasteByBarangay.map(b => {
                const widthPct = maxBarangayWaste > 0 ? (b.total / maxBarangayWaste) * 100 : 0
                const displayWidthPct = b.total > 0 ? Math.max(widthPct, 4) : 30
                return (
                  <div key={b.barangay_id} className="flex items-center gap-8">
                    <span className="text-xs font-medium text-[#122A48] w-28 text-right shrink-0">
                      {b.barangay_name}
                    </span>
                    <div className="flex-1 flex items-center gap-5">
                      <div
                        className={`h-2 rounded-full ${b.total > 0 ? "bg-[#CDE3DE]" : "bg-[#E5E5E5]"}`}
                        style={{ width: `${displayWidthPct}%` }}
                      />
                      <span className="text-xs text-[#122A48] whitespace-nowrap">
                        {b.total.toFixed(1)}kg
                      </span>
                    </div>
                  </div>
                )
              })}
              {wasteByBarangay.length === 0 && (
                <div className="flex justify-center items-center h-45">
                  <p className="text-xs text-[#122A48]/60">No data yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* waste composition */}
          <div className="bg-[#FAFCFD] rounded-lg border border-[#C6C6C8] flex-1 min-w-[380px]">
            <div className="w-full p-2">
              <p className="font-bold text-sm">Waste Composition</p>
            </div>

            <hr />

            <div className="flex items-center gap-15 p-4 ml-15">
              <div className="relative w-40 h-40 shrink-0">
                <PieChart width={160} height={160}>
                  <Pie
                    data={compositionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {compositionData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-[#122A48]">{totalWaste.toFixed(0)}</span>
                  <span className="text-xs text-[#122A48]/70">KG</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {compositionData.map(entry => {
                  const pct = totalWaste > 0 ? (entry.value / totalWaste) * 100 : 0
                  return (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-xs text-[#122A48]">
                        {entry.name} <span className="font-semibold">{pct.toFixed(1)}%</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
        
        {/* table classification waste rtecords */}
        <div ref={panelRef} className="bg-[#FAFCFD] rounded-lg border border-[#C6C6C8] mt-2 flex-1 min-h-0 flex flex-col">
          <div className="w-full p-2">
            <p className="font-bold text-sm">Waste Classication Readings</p>
          </div>

          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC] h-12'>
                <TableRow>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>CLASSIFICATION ID</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>NODE</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>DOMINANT WASTE TYPE</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>RECYCLABLE</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>BIODEGRADABLE</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>RESIDUAL</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>SPECIAL WASTE</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>CONFIDENCE</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>ESTIMATED VOLUME</TableHead>
                  <TableHead className='font-semibold text-left text-[#727272] text-xs'>TIMESTAMP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!fetchError && filtered.length > 0 && paginated.map(w => (
                  <TableRow key={w.classification_id}>
                    <TableCell className="text-left text-xs h-[35px]">{w.classification_id}</TableCell>
                    <TableCell className="text-left text-xs">{w.node_details?.node_name ?? "—"}</TableCell>
                    <TableCell className="text-left text-xs">{w.dominant_waste_type}</TableCell>
                    <TableCell className="text-left text-xs">{w.recyclable_pct?.toFixed(2)}%</TableCell>
                    <TableCell className="text-left text-xs">{w.biodegradable_pct?.toFixed(2)}%</TableCell>
                    <TableCell className="text-left text-xs">{w.residual_pct?.toFixed(2)}%</TableCell>
                    <TableCell className="text-left text-xs">{w.special_waste_pct?.toFixed(2)}%</TableCell>
                    <TableCell className="text-left text-xs">{(w.confidence).toFixed(2)}%</TableCell>
                    <TableCell className="text-left text-xs">{w.estimated_volume.toFixed(2)} kg</TableCell>
                    <TableCell className="text-left text-xs">
                      {new Date(w.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {fetchError && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              {wasteCache.retrying ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-[#D81010] font-semibold">Retrying...</p>
                </div>
              ) : (
                <>
                  <div className="text-[#D81010] text-center">
                    <p className="font-semibold">Failed to load waste classifications</p>
                    <p className="text-sm">Please try again later</p>
                  </div>

                  <Button
                    onClick={() => wasteCache.refetch()}
                    className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100"
                  >
                    Retry
                  </Button>
                </>
              )}
            </div>
          )}

          {!fetchError && filtered.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs">
              <div className="rounded-full bg-[#E5E5E6] p-3">
                <Trash2 size={30} color="#727272" />
              </div>

              <p className="text-[#122A48] font-bold">
                No waste classifications in the system
              </p>

              <p className="text-[#727272] text-sm text-center">
                No waste classifications have been added yet.
              </p>
            </div>
          )}

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

      <Toast toasts={toasts} onRemove={removeToast} />

      <PrintReport
        reportTitle="Waste Classification Analytics"
        columns={["ID", "Node", "Location", "Dominant Type", "Recyclable", "Biodegradable", "Residual", "Special Waste", "Confidence", "Est. Volume", "Timestamp"]}
        rows={printRows}
        generatedBy={generatedBy}
      />
    </>
  )
}