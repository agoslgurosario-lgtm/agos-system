"use client"

// react
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// icons
import { FileDown, History, RadioTower, Wifi, WifiOff, X } from "lucide-react"

// shadcn
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

// auth / lib
import { api } from "@/lib/api"
import { fetchWithAuth, getUser } from "@/lib/auth"
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { isIOSDevice } from "@/lib/device"
import { openTablePdf, type PdfTable } from "@/lib/openPdf"
import { printReport } from "@/lib/printReport"
import { usePageCache } from "@/components/hooks/usePageCache"
import { usePolling } from "@/components/hooks/usePolling"
import { usePagination } from "@/components/hooks/usePagination"
import { useFillRows } from "@/components/hooks/useFillRows"
import { useToast } from "@/components/hooks/useToast"

// components
import StatCard from "@/components/Analytics/StatCard"
import { SearchFilter } from "@/components/SearchFilter"
import { DateRangeFilter } from "@/components/DateRangeFilter"
import { TablePagination } from "@/components/TablePagination"
import { PrintReport } from "@/components/PrintReport/PrintReport"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { Toast } from "@/components/Toast"

// ---------- types (only what this page reads) ----------
type SensorNode = {
  node_id: number
  node_name: string
  availability_status: string
  status: string
  is_online: boolean
  is_force_sleeping: boolean
  water_level: number | null
  last_reading_at: string | null
  barangay_details?: { barangay_name: string } | null
}

type SensorReading = {
  reading_id: number
  timestamp: string
  reading_status: string
  clog_status: string | null
  overall_status: string | null
  water_level: number | null
  water_flow_rate: number | null
  clog_pct: number | null
  node_details: { hotspot_details?: { name: string } | null } | null
}

const API = process.env.NEXT_PUBLIC_API_URL
const HISTORY_PAGE_SIZE = 10

// ---------- helpers ----------
const isNodeOnline = (n: SensorNode) => n.is_online && !n.is_force_sleeping

const formatWhen = (ts: string) =>
  new Date(ts).toLocaleString("en-PH", {
    month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
  })

const statusBadgeClass = (s?: string | null) =>
  s === "Critical" ? "bg-[#FFE5E5] text-[#D81010]" :
  s === "Warning"  ? "bg-[#F4E4A7] text-[#E4B600]" :
  "bg-[#B2FBC173] text-[#2C7B3C]"

const fetchNodes = async (): Promise<SensorNode[]> => {
  const res = await fetchWithAuth(`${API}/api/sensor-nodes/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

// The readings list is already limited to this barangay by the backend: it only returns readings
// recorded while the node was assigned here (not what it read in other barangays).
type HistoryFilters = { status: string; from: string; to: string }

const readingsPath = (nodeId: number, f: HistoryFilters, page: number, pageSize: number) => {
  const params = new URLSearchParams({ node: String(nodeId), page: String(page), page_size: String(pageSize) })
  if (f.status !== "All Status") params.set("severity", f.status)
  if (f.from) params.set("from", f.from)
  if (f.to) params.set("to", f.to)
  return `/api/sensor-readings/?${params.toString()}`
}

// every page of the filtered history, for the export
const fetchAllReadings = async (nodeId: number, f: HistoryFilters): Promise<SensorReading[]> => {
  const all: SensorReading[] = []
  let endpoint: string | null = readingsPath(nodeId, f, 1, 100)
  for (let i = 0; endpoint && i < 200; i++) {
    const data = await api.get(endpoint)
    all.push(...(data.results ?? data))
    if (data.next) {
      const next = new URL(data.next, window.location.origin)
      endpoint = next.pathname + next.search
    } else {
      endpoint = null
    }
  }
  return all
}

const HISTORY_COLUMNS = ["Timestamp", "Hotspot Name", "Water Level", "Flow Rate", "Clog %", "Water Status", "Clog Status", "Overall Status"]

const readingRow = (r: SensorReading) => [
  formatWhen(r.timestamp),
  r.node_details?.hotspot_details?.name ?? "—",
  r.water_level != null ? `${r.water_level} cm` : "—",
  r.water_flow_rate != null ? `${Number(r.water_flow_rate).toFixed(5)} m/s` : "—",
  r.clog_pct != null ? `${r.clog_pct} %` : "—",
  r.reading_status,
  r.clog_status ?? "—",
  r.overall_status ?? r.reading_status,
]

export default function BarangayReadingsPage() {
  const { toasts, addToast, removeToast } = useToast()

  // ---------- nodes ----------
  const nodesCache = usePageCache("barangayReadings:nodes", fetchNodes, [] as SensorNode[], { autoFetch: false })
  const nodes = nodesCache.data
  const loading = nodesCache.loading
  const fetchError = nodesCache.error

  useEffect(() => { nodesCache.refetch() }, [])
  usePolling(async () => { await nodesCache.refetch() }, 30000)

  // keep the latest water level / last reading / online state live
  useWebSocket({
    path: "/ws/sensor-readings/",
    onMessage: (reading) => {
      const id = reading?.node_details?.node_id
      if (id == null) return
      nodesCache.setData(prev => prev.map(n =>
        n.node_id === id
          ? { ...n, water_level: reading.water_level, last_reading_at: reading.timestamp ?? n.last_reading_at, is_online: true }
          : n
      ))
    },
  })

  // ---------- summary cards ----------
  const total   = nodes.length
  const online  = nodes.filter(isNodeOnline).length
  const offline = total - online

  // ---------- table ----------
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All Status")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return nodes
      .filter(n => !q || n.node_name.toLowerCase().includes(q))
      .filter(n =>
        statusFilter === "All Status" ? true :
        statusFilter === "Online" ? isNodeOnline(n) : !isNodeOnline(n)
      )
      .sort((a, b) => a.node_id - b.node_id)
  }, [nodes, search, statusFilter])

  const { panelRef, tableWrapRef, rows } = useFillRows({ rowHeight: 56, initialRows: 4, deps: [loading] })
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)
  useEffect(() => { setCurrentPage(1) }, [search, statusFilter])

  // ---------- history dialog ----------
  const [historyNode, setHistoryNode] = useState<SensorNode | null>(null)
  const [hStatus, setHStatus] = useState("All Status")
  const [hFrom, setHFrom] = useState("")
  const [hTo, setHTo] = useState("")
  const [hPage, setHPage] = useState(1)
  const [hRows, setHRows] = useState<SensorReading[]>([])
  const [hCount, setHCount] = useState(0)
  const [hLoading, setHLoading] = useState(false)
  const [hError, setHError] = useState(false)
  const [hTick, setHTick] = useState(0)
  const [exporting, setExporting] = useState(false)
  const reqRef = useRef(0)

  const openHistory = (node: SensorNode) => {
    setHStatus("All Status"); setHFrom(""); setHTo(""); setHPage(1); setHRows([]); setHCount(0)
    setHistoryNode(node)
  }
  const closeHistory = () => setHistoryNode(null)

  useEffect(() => { setHPage(1) }, [hStatus, hFrom, hTo])

  useEffect(() => {
    if (!historyNode) return
    const reqId = ++reqRef.current
    setHLoading(true)
    setHError(false)
    api.get(readingsPath(historyNode.node_id, { status: hStatus, from: hFrom, to: hTo }, hPage, HISTORY_PAGE_SIZE))
      .then(data => {
        if (reqId !== reqRef.current) return
        setHRows(data.results ?? data)
        setHCount(data.count ?? (data.results ?? data).length)
      })
      .catch(() => { if (reqId === reqRef.current) setHError(true) })
      .finally(() => { if (reqId === reqRef.current) setHLoading(false) })
  }, [historyNode, hStatus, hFrom, hTo, hPage, hTick])

  // a new reading for the open node: refresh the first page
  const openIdRef = useRef<number | null>(null)
  openIdRef.current = historyNode?.node_id ?? null
  const pageRef = useRef(1)
  pageRef.current = hPage
  useWebSocket({
    path: "/ws/sensor-readings/",
    enabled: !!historyNode,
    onMessage: (reading) => {
      const id = reading?.node_details?.node_id
      if (id != null && id === openIdRef.current && pageRef.current === 1) setHTick(t => t + 1)
    },
  })

  // ---------- export (desktop = print dialog, iPhone/iPad = PDF in a new tab) ----------
  const [triggerPrint, setTriggerPrint] = useState(false)
  const [printTable, setPrintTable] = useState<PdfTable>({ title: "", columns: [], rows: [] })
  useEffect(() => {
    if (triggerPrint) {
      printReport()
      setTriggerPrint(false)
    }
  }, [triggerPrint])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Barangay Personnel"

  const buildHistoryTable = useCallback(async (): Promise<PdfTable> => {
    if (!historyNode) throw new Error("No node selected")
    const all = await fetchAllReadings(historyNode.node_id, { status: hStatus, from: hFrom, to: hTo })
    return {
      title: `${historyNode.node_name} — Readings History`,
      columns: HISTORY_COLUMNS,
      rows: all.map(readingRow),
      orientation: "landscape",
    }
  }, [historyNode, hStatus, hFrom, hTo])

  const handleExport = async () => {
    if (!historyNode) return
    setExporting(true)

    if (isIOSDevice()) {
      // iPhone/iPad ignore window.print(): open the PDF tab right now (still inside the tap), then fill it
      openTablePdf(buildHistoryTable)
        .catch(() => addToast("Failed to export history.", "error"))
        .finally(() => setExporting(false))
      return
    }

    try {
      setPrintTable(await buildHistoryTable())
      setTriggerPrint(true)
    } catch {
      addToast("Failed to export history.", "error")
    } finally {
      setExporting(false)
    }
  }

  const barangayName =
    historyNode?.barangay_details?.barangay_name ??
    (currentUser as { barangay_details?: { barangay_name?: string } } | null)?.barangay_details?.barangay_name ??
    "this barangay"

  return (
    <>
      <div className="flex h-full flex-col text-[#122A48]">
        {/* Summary cards */}
        <div className="grid w-full grid-cols-3 gap-3">
          <StatCard
            label="Total Nodes"
            value={loading ? "—" : total}
            note="Sensor nodes in your barangay"
            icon={<RadioTower size={20} color="#2C7B3C" />}
            bg="bg-[#CDE3DE]"
          />
          <StatCard
            label="Online"
            value={loading ? "—" : online}
            note="Nodes sending readings right now"
            icon={<Wifi size={20} color="#2C7B3C" />}
            bg="bg-[#B2FBC1]"
          />
          <StatCard
            label="Offline"
            value={loading ? "—" : offline}
            note="Nodes not sending readings, or in sleep mode"
            icon={<WifiOff size={20} color="#727272" />}
            bg="bg-[#E5E5E6]"
          />
        </div>

        {/* Table */}
        <div className="mt-2 flex min-h-[420px] flex-1 overflow-visible">
          <div
            ref={panelRef}
            className="flex w-full flex-col rounded-lg border border-[#00000040] bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]"
          >
            <div className="flex items-center justify-between p-2">
              <p className="text-sm font-bold">IoT Sensor Nodes</p>

              <div className="flex items-center gap-3">
                <SearchFilter value={search} onChange={setSearch} placeholder="Search node..." width="w-60" height="h-8" />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="cursor-pointer rounded-lg border-2 border-[#C6C6C8] bg-white px-3 py-3 text-xs font-medium text-[#122A48]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="min-w-0">
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="All Status">All Status</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Online">Online</SelectItem>
                    <SelectItem className="cursor-pointer p-2 text-xs text-[#122A48]" value="Offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className="border border-[#CFD8DC] bg-[#e8eef1b4]">
                  <TableRow>
                    {["NODE ID", "NODE NAME", "AVAILABILITY", "STATUS", "WATER LEVEL", "LAST READING", "ACTIONS"].map(h => (
                      <TableHead key={h} className="text-left text-xs font-semibold text-[#727272]">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!loading && !fetchError && paginated.map(node => {
                    const onlineNow = isNodeOnline(node)
                    return (
                      <TableRow key={node.node_id} className="border-b border-[#C6C6C8]">
                        <TableCell className="h-14 text-left text-xs text-[#122A48]">{node.node_id}</TableCell>
                        <TableCell className="h-14 text-left text-xs text-[#122A48]">{node.node_name}</TableCell>

                        {/* availability: same badges as Node Management */}
                        <TableCell className="h-14 text-left text-xs">
                          {node.status === "Maintenance" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDE4FC] px-4 py-1.5 text-xs font-semibold text-[#7C3AED]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#7C3AED]" />
                              Under Maintenance
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${
                              node.availability_status === "Available" ? "bg-[#B2FBC173] text-[#2C7B3C]" :
                              node.availability_status === "Retired"   ? "bg-[#E5E5E6] text-[#727272]" :
                              "bg-[#DBEAFE] text-[#1565BC]"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                node.availability_status === "Available" ? "bg-[#1D8104]" :
                                node.availability_status === "Retired"   ? "bg-[#727272]" :
                                "bg-[#1565BC]"
                              }`} />
                              {node.availability_status}
                            </span>
                          )}
                        </TableCell>

                        {/* online / offline */}
                        <TableCell className="h-14 text-left text-xs">
                          <span
                            title={node.is_force_sleeping ? "Sleep mode" : undefined}
                            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${
                              onlineNow ? "bg-[#B2FBC173] text-[#2C7B3C]" : "bg-[#E5E5E6] text-[#727272]"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${onlineNow ? "bg-[#1D8104]" : "bg-[#727272]"}`} />
                            {onlineNow ? "Online" : "Offline"}
                          </span>
                        </TableCell>

                        {/* latest reading */}
                        <TableCell className="h-14 text-left text-xs text-[#122A48]">
                          {node.water_level != null ? `${node.water_level} cm` : "—"}
                        </TableCell>
                        <TableCell className="h-14 text-left text-xs text-[#122A48]">
                          {node.last_reading_at ? formatWhen(node.last_reading_at) : "No readings yet"}
                        </TableCell>

                        <TableCell className="h-14 text-left text-xs">
                          <Button
                            onClick={() => openHistory(node)}
                            className="flex cursor-pointer gap-2 rounded-lg border border-[#1565BC80] bg-[#CDE3DE45] px-3 py-3.5 text-xs text-[#122A48] hover:bg-[#75928a45]"
                          >
                            <History size={16} /> View History
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {loading && !fetchError && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <SpinnerIcon size={32} color="#1565BC" />
                <p className="text-sm text-[#727272]">Loading nodes...</p>
              </div>
            )}

            {fetchError && (
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <div className="text-center text-[#D81010]">
                  <p className="font-semibold">Failed to load sensor nodes</p>
                  <p className="text-sm">Please try again later</p>
                </div>
                <Button
                  onClick={() => nodesCache.refetch()}
                  className="cursor-pointer rounded-lg border border-[#D81010] bg-transparent px-3 py-2 text-sm text-[#D81010] hover:bg-gray-100"
                >
                  Retry
                </Button>
              </div>
            )}

            {!loading && !fetchError && filtered.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-1">
                <div className="my-2 rounded-full bg-[#E5E5E6] p-4">
                  <RadioTower size={30} color="#727272" />
                </div>
                <p className="text-sm font-bold">{nodes.length === 0 ? "No sensor nodes yet" : "No nodes found"}</p>
                <p className="text-xs text-[#727272]">
                  {nodes.length === 0 ? "No sensor nodes are assigned to your barangay." : "No nodes match your search or filter."}
                </p>
              </div>
            )}

            <div className="mt-auto">
              {!loading && !fetchError && filtered.length > 0 && (
                <TablePagination
                  totalItems={totalItems}
                  itemsPerPage={itemsPerPage}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Readings history of one node, same dialog as Node Management (readings only) */}
      <Dialog open={!!historyNode} onOpenChange={(o) => { if (!o) closeHistory() }}>
        <DialogContent className="flex max-h-[80vh] min-w-80 flex-col rounded-lg border border-[#C6C6C8] p-0 text-[#122A48] md:min-w-[min(1100px,95vw)] [&>button]:hidden">
          <DialogHeader>
            <div className="-mb-3 flex items-center justify-between border-b border-[#C6C6C8] p-2 md:p-3">
              <div className="flex flex-col">
                <p className="text-sm font-bold md:text-base">{historyNode?.node_name}</p>
                <p className="text-[11px] text-[#727272]">Readings History · only readings recorded in {barangayName}</p>
              </div>
              <button className="cursor-pointer" onClick={closeHistory}>
                <X size={16} />
              </button>
            </div>
          </DialogHeader>
          <DialogTitle className="sr-only">Readings History</DialogTitle>

          <div className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#C6C6C8] p-2 md:p-3">
              <div className="flex gap-3">
                <Select value={hStatus} onValueChange={setHStatus}>
                  <SelectTrigger className="cursor-pointer rounded-lg border-2 border-[#C6C6C8] bg-white px-3 py-2 text-xs font-medium text-[#122A48]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="min-w-0">
                    {["All Status", "Normal", "Warning", "Critical"].map(s => (
                      <SelectItem key={s} className="cursor-pointer p-2 text-xs text-[#122A48]" value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <DateRangeFilter from={hFrom} to={hTo} onChange={(f, t) => { setHFrom(f); setHTo(t) }} width="w-[210px]" />
              </div>

              <Button
                onClick={handleExport}
                disabled={exporting || hCount === 0}
                className="cursor-pointer bg-[#2fd45b] text-xs text-white hover:bg-[#28b54e]"
              >
                <FileDown size={14} className="mr-1" />
                {exporting ? "Preparing..." : "Export"}
              </Button>
            </div>

            <Table>
              <TableHeader className="border border-[#CFD8DC] bg-[#e8eef1b4]">
                <TableRow>
                  {["TIMESTAMP", "HOTSPOT NAME", "WATER LEVEL", "FLOW RATE", "CLOG %", "WATER STATUS", "CLOG STATUS", "OVERALL STATUS"].map(h => (
                    <TableHead key={h} className="text-center text-xs font-semibold text-[#727272]">{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {hError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <p className="text-sm font-semibold text-[#D81010]">Failed to load readings.</p>
                    </TableCell>
                  </TableRow>
                ) : hLoading && hRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <SpinnerIcon size={24} />
                        <p className="text-sm text-[#727272]">Loading readings...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : hRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center">
                      <p className="text-sm text-[#727272]">No readings recorded for this node in your barangay.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  hRows.map(r => (
                    <TableRow key={r.reading_id} className="border-b border-[#C6C6C8] text-xs">
                      <TableCell className="h-11 text-center">{formatWhen(r.timestamp)}</TableCell>
                      <TableCell className="h-11 text-center">{r.node_details?.hotspot_details?.name ?? "—"}</TableCell>
                      <TableCell className="h-11 text-center">{r.water_level != null ? `${r.water_level} cm` : "—"}</TableCell>
                      <TableCell className="h-11 text-center">{r.water_flow_rate != null ? `${Number(r.water_flow_rate).toFixed(5)} m/s` : "—"}</TableCell>
                      <TableCell className="h-11 text-center">{r.clog_pct != null ? `${r.clog_pct} %` : "—"}</TableCell>
                      <TableCell className="h-11 text-center">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(r.reading_status)}`}>
                          {r.reading_status}
                        </span>
                      </TableCell>
                      <TableCell className="h-11 text-center">
                        {r.clog_status ? (
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(r.clog_status)}`}>
                            {r.clog_status}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="h-11 text-center">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(r.overall_status ?? r.reading_status)}`}>
                          {r.overall_status ?? r.reading_status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-auto">
              {!hError && hCount > 0 && (
                <TablePagination
                  totalItems={hCount}
                  itemsPerPage={HISTORY_PAGE_SIZE}
                  currentPage={hPage}
                  onPageChange={setHPage}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PrintReport
        reportTitle={printTable.title}
        columns={printTable.columns}
        rows={printTable.rows}
        generatedBy={generatedBy}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  )
}