"use client"

// components
import { SearchFilter } from "@/components/SearchFilter"
import { usePagination } from "@/components/hooks/usePagination"
import { TablePagination } from "@/components/TablePagination"
import { usePolling } from "@/components/hooks/usePolling"
import { useToast } from "@/components/hooks/useToast"
import { Toast } from "@/components/Toast"
import { WasteSkeleton } from "@/components/Skeleton/Admin/HistorySkeleton/WasteSkeleton"
import { useFillRows } from "@/components/hooks/useFillRows"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { PrintReport } from "@/components/PrintReport/PrintReport"

// lib
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { usePageCache } from "@/components/hooks/usePageCache"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

// react
import { useEffect, useState, useCallback } from "react"

// shadcn
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"

// auth
import { fetchWithAuth } from "@/lib/auth"

// icons
import { FileDown, LayoutGrid, Leaf, Recycle, Trash2, FileSearch } from "lucide-react"


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
const fetchWasteRaw = async (month: string): Promise<WasteClassification[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/waste-classifications/?month=${month}`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchBarangaysRaw = async () => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/barangays/?is_registered=true`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchSensorNodesRaw = async () => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/?availability_status=Occupied`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function Waste() {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  )
  const monthOptions = (() => {
    const year = new Date().getFullYear()
    return Array.from({ length: 12 }, (_, m) => {
      const d = new Date(year, m, 1)
      return {
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
      }
    })
  })()

  // filter states
  const [search, setSearch] = useState<string>('')
  const [barangayFilterOpt, setBarangayFilterOpt] = useState<string>('All Barangay')
  const [dominantWaste, setDominantWaste] = useState<string>('All Waste')
  const [sensorNode, setSensorNode] = useState<string>('All Nodes')

  // waste classification state
  const wasteCache = usePageCache('waste:classifications', () => fetchWasteRaw(selectedMonth), [] as WasteClassification[], { autoFetch: false })
  const barangaysCache = usePageCache('waste:barangays', fetchBarangaysRaw, [] as { barangay_id: number; barangay_name: string }[], { autoFetch: false })
  const sensorNodesCache = usePageCache('waste:sensorNodes', fetchSensorNodesRaw, [] as { node_id: number; node_name: string }[], { autoFetch: false })

  const wasteClassification = wasteCache.data
  const allBarangays = barangaysCache.data
  const allSensorNodes = sensorNodesCache.data
  const loading = wasteCache.loading || barangaysCache.loading || sensorNodesCache.loading
  const fetchError = wasteCache.error

  const [selectedWaste, setSelectedWaste] = useState<WasteClassification | null>(null)
  const [exporting, setExporting] = useState(false)
  const { toasts, addToast, removeToast } = useToast()

  function getFilteredWaste(waste: WasteClassification[], barangay: string, dominant_waste: string, node: string, month: string, search: string) {
    const q = search.toLowerCase()
    return waste
      .filter(b => barangay === "All Barangay" || b.node_details?.barangay_details?.barangay_name === barangay)
      .filter(b => dominant_waste === "All Waste" || b.dominant_waste_type === dominant_waste)
      .filter(b => node === "All Nodes" || b.node_details?.node_name === node)
      .filter(b => month === "All" || b.timestamp?.startsWith(month))
      .filter(b =>
        [b.node_details?.node_name, b.node_details?.barangay_details?.barangay_name, b.dominant_waste_type]
          .some(field => field?.toLowerCase().includes(q))
      )
      .sort((a, b) => b.classification_id - a.classification_id)
    }
  
    const filtered = getFilteredWaste(wasteClassification, barangayFilterOpt, dominantWaste, sensorNode, selectedMonth, search)

    const { panelRef, tableWrapRef, rows } = useFillRows({
      rowHeight: 52,
      initialRows: 8,
      deps: [loading],
    })
    const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)
  
    // summary cards — reflect barangay/waste-type/node filters (wasteClassification is already month-scoped via the backend fetch; text search stays table-only)
    const cardScopedWaste = wasteClassification
      .filter(n => barangayFilterOpt === "All Barangay" || n.node_details?.barangay_details?.barangay_name === barangayFilterOpt)
      .filter(n => dominantWaste === "All Waste" || n.dominant_waste_type === dominantWaste)
      .filter(n => sensorNode === "All Nodes" || n.node_details?.node_name === sensorNode)

    const total = cardScopedWaste.length
    const biodegradable = cardScopedWaste.filter(n => n.dominant_waste_type === 'Biodegradable').length
    const recyclable = cardScopedWaste.filter(n => n.dominant_waste_type === 'Recyclable').length
    const residual_others = cardScopedWaste.filter(n => n.dominant_waste_type === 'Residual' || n.dominant_waste_type === 'Special Waste').length


  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      wasteCache.refetch(),
      barangaysCache.refetch(),
      sensorNodesCache.refetch(),
    ])
  }, [])

  useEffect(() => { refetchAll() }, [selectedMonth])

  usePolling(refetchAll, 30000)

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

  useWebSocket({
    path: "/ws/waste-classification/",
    onMessage: (newWaste) => {
      wasteCache.setData(prev => [newWaste, ...prev])
    },
  })

  if (loading) return <WasteSkeleton/>


  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* filter */}
        <div className="flex w-full justify-between">
          <div className="flex gap-3">
            <SearchFilter value={search} onChange={setSearch} placeholder='Search waste classification...' height="h-9" />

            {/* barangay filter */}
            <Select value={barangayFilterOpt} onValueChange={setBarangayFilterOpt}>
              <SelectTrigger className="text-xs cursor-pointer w-35 px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="All Barangay" />
              </SelectTrigger>
              <SelectContent position="popper" className='w-35 min-w-0'>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All Barangay">All Barangay</SelectItem>
                {[...allBarangays]
                  .sort((a, b) => a.barangay_name.localeCompare(b.barangay_name))
                  .map(b => (
                    <SelectItem key={b.barangay_id} value={b.barangay_name} className="text-xs cursor-pointer p-2 text-[#122A48]">
                      {b.barangay_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            
            {/* dominant waste type filter */}
            <Select value={dominantWaste} onValueChange={setDominantWaste}>
              <SelectTrigger className="text-xs cursor-pointer w-30 px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="All Barangay" />
              </SelectTrigger>
              <SelectContent position="popper" className='w-30 min-w-0'>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All Waste">All Waste</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Recyclable">Recyclable</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Biodegradable">Biodegradable</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Residual">Residual</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Special Waste">Special Waste</SelectItem>
              </SelectContent>
            </Select>

            {/* sensor node filter */}
            <Select value={sensorNode} onValueChange={setSensorNode}>
              <SelectTrigger className="text-xs cursor-pointer w-27 px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="All Nodes" />
              </SelectTrigger>
              <SelectContent position="popper" className='w-27 min-w-0'>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All Nodes">All Nodes</SelectItem>
                {[...allSensorNodes]
                  .sort((a, b) => a.node_name.localeCompare(b.node_name))
                  .map(n => (
                    <SelectItem key={n.node_id} value={n.node_name} className="text-xs cursor-pointer p-2 text-[#122A48]">
                      {n.node_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="text-xs cursor-pointer w-35 px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="text-xs p-2 w-35 min-w-0 !max-h-70 overflow-y-auto">
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All">All Months</SelectItem>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} className="text-xs cursor-pointer p-2 text-[#122A48]" value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button onClick={handlePrint} className="bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer">
              <FileDown size={16} className="mr-1" />
              Export
            </Button>
          </div>

        </div>

        {/* summary header cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48] mt-3">
          {[
            { icon: <LayoutGrid size={20} color="#582579" />, bg: "bg-[#E1CDE3]", count: total,label: "Total Clasifications" },
            { icon: <Leaf size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: biodegradable,  label: "Biodegradable"},
            { icon: <Recycle size={20} color="#1565BC" />, bg: "bg-[#1565BC61]", count: recyclable, label: "Recyclable" },
            { icon: <Trash2 size={20} color="#D48A00" />, bg: "bg-[#EED7AA]", count: residual_others,  label: "Residual/Others" },
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

        {/* table and preview data */}
        <div className="flex gap-2 mt-2 flex-1 min-h-[524px]">
          
          {/* TABLE  */}
          <div ref={panelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex-[3] min-w-0 rounded-lg flex flex-col'>
            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC] h-12'>
                  <TableRow>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>CLASSIFICATION ID</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>DOMINANT WASTE TYPE</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>TIMESTAMP</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>NODE</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>LOCATION  </TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>READING ID</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>CONFIDENCE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!fetchError && filtered.length > 0 && paginated.map(waste => (
                    <TableRow
                      key={waste.classification_id}
                      className={`border-b border-[#C6C6C8] cursor-pointer ${
                        selectedWaste?.classification_id === waste.classification_id
                          ? 'bg-[#CDE3DE45]'
                          : 'hover:bg-[#f5f5f5]'
                      }`}
                      onClick={() => setSelectedWaste(waste)}
                    >
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">WCL-2026-{waste.classification_id}</TableCell>
                      <TableCell className="text-left h-13 text-xs">
                        <span className="inline-flex items-center gap-2">
                          <span className={`rounded-full p-1.5 flex items-center justify-center ${
                            waste.dominant_waste_type === 'Biodegradable' ? 'bg-[#51C96A]' :
                            waste.dominant_waste_type === 'Recyclable'    ? 'bg-[#1565BC]' :
                            waste.dominant_waste_type === 'Residual'      ? 'bg-[#D89210]' :
                            waste.dominant_waste_type === 'Special Waste' ? 'bg-[#D81010]' :
                            'bg-gray-400'
                          }`}>
                            {waste.dominant_waste_type === 'Biodegradable' && <Leaf size={16} color="white" />}
                            {waste.dominant_waste_type === 'Recyclable'    && <Recycle size={16} color="white" />}
                            {waste.dominant_waste_type === 'Residual'      && <Trash2 size={16} color="white" />}
                            {waste.dominant_waste_type === 'Special Waste' && <Trash2 size={16} color="white" />}
                          </span>
                          <span className="text-[#122A48] ">{waste.dominant_waste_type}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">
                        {waste.timestamp
                          ? new Date(waste.timestamp).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">
                        {waste.node_details?.node_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">{waste.node_details?.barangay_details?.barangay_name ?? '—'}</TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">RDG-0{waste.reading ?? '—'}</TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">{waste.confidence ?? '—'}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* fetch error state */}
            {fetchError && (
              <div className="flex-1 flex flex-col justify-center items-center gap-3">
                {wasteCache.retrying ? (
                  <div className="flex flex-col items-center gap-3">
                    <SpinnerIcon size={32} color="#D81010" />
                    <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[#D81010] text-center">
                      <p className="font-semibold">Failed to load waste classifications</p>
                      <p className="text-sm">Please try again later</p>
                    </div>
                    <Button onClick={refetchAll} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                  </>
                )}
              </div>
            )}

            {/* no node state */}
            {!fetchError && filtered.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm">
                <div className="rounded-full bg-[#E5E5E6] p-3">
                  <Trash2 size={30} color="#727272" />
                </div>
                <p className="text-[#122A48] font-bold">No waste classifications in the system</p>
                <p className="text-[#727272] text-xs">
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


          {/* preview waste container */}
          <div className="border border-[#C6C6C8] rounded-lg bg-[#F8F9FA] flex-1 min-w-[240px]">
            {!selectedWaste ? (
              <div className="flex flex-col gap-3 justify-center items-center h-full">
                <FileSearch size={60} className="text-[#1565BC80]"/>
                <p className="text-[#122A488F] font-bold -my-1">No Waste Selected</p>
                <p className="text-[#122A4873] text-xs text-center">Select a record from the table <br />to view details.</p>
              </div>

            ) : (
              <div className="flex flex-col gap-3 text-[#122A48]">
                <div className="w-full -mb-2">
                  <p className="p-2 font-medium text-sm">Classification details</p>
                </div>

                <hr className="-mt-1.5" />

                <div className="w-full">
                  <p className="underline text-[#1565BC] p-3 py-1 text-sm">WCL-2026-{selectedWaste.classification_id}</p>
                </div>

                <hr />

                <div className="flex flex-col p-3 pt-0 -mb-2">
                  <div className="w-full">
                    <p className="font-medium text-sm">Classification Information</p>
                  </div>

                  {/* dominant waste type */}
                  <div className="flex justify-between mt-2 text-xs">
                    <p>Dominant Waste Type</p>
                    <p className="text-left">{selectedWaste.dominant_waste_type}</p>
                  </div>
                  {/* confidence */}
                  <div className="flex justify-between mt-1 text-xs">
                    <p>Confidence</p>
                    <p className="text-left">{selectedWaste.confidence}%</p>
                  </div>
                  {/* timestamp */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Timestamp</p>
                    <p>
                      {selectedWaste.timestamp
                        ? new Date(selectedWaste.timestamp).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
                      : '—'}
                    </p>
                  </div>
                  {/* estimated weight */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Estimated weight (kg)</p>
                    <p className="text-left">{selectedWaste.estimated_volume} kg</p>
                  </div>
                  {/* location */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Location</p>
                    <p className="text-left">{selectedWaste.node_details.barangay_details?.barangay_name ?? '—'}</p>
                  </div>
                  {/* reading id */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Reading ID</p>
                    <p className="flex-left">RDG-0{selectedWaste.reading}</p>
                  </div>
                  {/* sensor node */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Sensor Node</p>
                    <p className="flex-left">{selectedWaste.node_details.node_name}</p>
                  </div>
                </div>

                <hr />

                <div className="flex flex-col p-3 pt-0">
                  <div className="w-full">
                    <p className="font-medium text-sm">Waste</p>
                  </div>
                  
                  {/* biodegradable */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Biodegradable</p>
                    <p>{selectedWaste.biodegradable_pct}%</p>
                  </div>
                  {/* Recyclable */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Recyclable</p>
                    <p>{selectedWaste.recyclable_pct}%</p>
                  </div>
                  {/* Residual */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Residual</p>
                    <p>{selectedWaste.residual_pct}%</p>
                  </div>
                  {/* special waste */}
                  <div className="flex justify-between text-xs mt-1">
                    <p>Special Waste</p>
                    <p>{selectedWaste.special_waste_pct}%</p>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

        <Toast toasts={toasts} onRemove={removeToast} />

        <PrintReport
          reportTitle="Waste Classification"
          columns={["ID", "Node", "Location", "Dominant Type", "Recyclable", "Biodegradable", "Residual", "Special Waste", "Confidence", "Est. Volume", "Timestamp"]}
          rows={printRows}
          generatedBy={generatedBy}
        />

      </div>
    
    </>
  )
}