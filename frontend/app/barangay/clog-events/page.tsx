"use client"

// icons
import { FileDown, Radar, ArchiveRestore, Clock3, ClipboardCheck, FileSearch } from "lucide-react"

// component
import { SearchFilter } from "@/components/SearchFilter"
import { usePolling } from "@/components/hooks/usePolling"
import { useToast } from "@/components/hooks/useToast"
import { Toast } from "@/components/Toast"
import { ClogEventsSkeleton } from "@/components/Skeleton/Admin/HistorySkeleton/ClogEventsSkeleton"
import { useFillRows } from "@/components/hooks/useFillRows"
import { PrintReport } from "@/components/PrintReport/PrintReport"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { DateRangeFilter } from "@/components/DateRangeFilter"

// react
import { useState, useEffect, useCallback } from "react"

// shadcn
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"

// table pagination
import { usePagination } from "@/components/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

// auth
import { fetchWithAuth } from "@/lib/auth"

// lib
import { usePageCache } from "@/components/hooks/usePageCache"
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { exportOrPrint } from "@/lib/exportOrPrint"
import { getUser } from "@/lib/auth"
import { clogSeverityLabel } from '@/lib/clogSeverity'
import { currentMonthRange, rangeQuery } from "@/lib/dateRange"


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
  reading_details: {
    reading_id: number
    water_level: number | null
    water_flow_rate: number | null
    water_flow: string
    reading_status: string
    clog_pct: number | null
    timestamp: string
  } | null
  cleared_by_details : {
    user_id: number
    first_name: string
    last_name: string
    position: string
  } | null
  classification_details: {
    classification_id: number
    dominant_waste_type: string
  } | null
  auto_cleared: boolean
  responded_by_details: {
    user_id: number
    first_name: string
    last_name: string
  } | null
  clear_reason: 'Responded' | 'Manual Clear' | 'Auto-cleared' | 'Clear readings' | null
}

const CLEAR_REASON_LABEL: Record<string, string> = {
  'Responded': 'Cleared by response',
  'Manual Clear': 'Cleared manually',
  'Auto-cleared': 'Auto-cleared after 7 days',
  'Clear readings': 'Clear readings',
}
const CLEAR_REASON_SHORT: Record<string, string> = {
  'Responded': 'Responded',
  'Manual Clear': 'Manual clear',
  'Auto-cleared': 'Auto clear (7 days)',
  'Clear readings': 'Clear readings',
}
const clearReasonLabel = (reason: Clogs['clear_reason']) => (reason ? CLEAR_REASON_LABEL[reason] : '—')

const fmtDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
    : '—'

// Timeline shown in the event details panel (same two-column rows as the other sections)
function ClogTimeline({ clog }: { clog: Clogs }) {
  const reason = clog.clear_reason
  const step =
    reason === 'Responded' || (!reason && clog.status === 'Responded') ? 'responded'
    : reason === 'Auto-cleared' ? 'auto'
    : reason === 'Manual Clear' ? 'manual'
    : reason === 'Clear readings' ? 'readings'
    : 'pending'

  const by =
    step === 'responded' ? clog.responded_by_details
    : step === 'manual' ? clog.cleared_by_details
    : null

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-start gap-4 text-xs">
      <p className="shrink-0">{label}</p>
      <p className="text-right">{value}</p>
    </div>
  )

  return (
    <div className="text-[#122A48] px-4 pb-4 flex flex-col gap-3">
      <p className="font-medium text-sm">Timeline</p>

      <Row label="Detected" value={fmtDateTime(clog.detected_at)} />
      <Row label="Detected By" value="System" />

      {step === 'responded' && (
        <>
          <Row label="Responded" value="Response team deployed" />
          {clog.resolved_at && <Row label="Responded At" value={fmtDateTime(clog.resolved_at)} />}
          {by && <Row label="Responded By" value={`${by.first_name} ${by.last_name}`} />}
        </>
      )}

      {step === 'auto' && (
        <>
          <Row label="Responded" value="No response recorded" />
          <Row label="Auto-cleared" value={fmtDateTime(clog.resolved_at)} />
          <Row label="Reason" value="No resolution after 7 days" />
        </>
      )}

      {(step === 'manual' || step === 'readings') && (
        <>
          <Row label="Cleared" value={clearReasonLabel(reason)} />
          <Row label="Cleared At" value={fmtDateTime(clog.resolved_at)} />
          {by && <Row label="Cleared By" value={`${by.first_name} ${by.last_name}`} />}
        </>
      )}

      {step === 'pending' && <Row label="Responded" value="Awaiting response" />}

      {step === 'auto' && (
        <p className="text-center text-xs text-[#727272] mt-1">
          This event cleared on its own, so no response report is needed.
        </p>
      )}
    </div>
  )
}

// fetch raw data
const fetchClogsRaw = async (from: string, to: string): Promise<Clogs[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/clog-events/?${rangeQuery(from, to)}`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function BarangayClogEvents() {
  // date range filter: opens on the current month, Clear Filters = all time
  const [startDate, setStartDate] = useState<string>(() => currentMonthRange().from)
  const [endDate, setEndDate] = useState<string>(() => currentMonthRange().to)

  // filter states
  const [search, setSearch] = useState<string>('')
  const [severity, setSeverity] = useState<string>('All Severity')
  const [status, setStatus] = useState<string>('All Status')

  // table state (own cache key so it never mixes with the admin page's cache)
  const clogsCache = usePageCache('barangay-clogs:events', () => fetchClogsRaw(startDate, endDate), [] as Clogs[], { autoFetch: false })

  const clogs = clogsCache.data
  const loading = clogsCache.loading
  const fetchError = clogsCache.error

  // selected clog state
  const [selectedClog, setSelectedClog] = useState<Clogs | null>(null)

  const { toasts, addToast, removeToast } = useToast()

  function getFilteredClogs(clogs: Clogs[], severity: string, status: string, search: string) {
    const q = search.toLowerCase()
    return clogs
      .filter(b => severity === "All Severity" || b.severity === severity)
      .filter(b => status === "All Status" || b.status === status)
      .filter(b =>
        [b.node_details?.node_name, b.barangay_details?.barangay_name, b.severity]
          .some(field => field?.toLowerCase().includes(q))
      )
    .sort((a, b) => b.event_id - a.event_id)
  }

  const filtered = getFilteredClogs(clogs, severity, status, search)

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 52,
    initialRows: 9,
    deps: [loading],
  })
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)

  // summary cards — reflect severity/status filters (clogs is already month-scoped via the backend fetch; text search stays table-only)
  const cardScopedClogs = clogs
    .filter(n => severity === 'All Severity' || n.severity === severity)
    .filter(n => status === 'All Status' || n.status === status)

  const isCleared = (n: Clogs) => n.status === 'Cleared' || n.status === 'Responded'

  const total = cardScopedClogs.length
  const cleared = cardScopedClogs.filter(isCleared).length

  const clearedWithDuration = cardScopedClogs.filter(n => isCleared(n) && n.resolved_at && n.detected_at)
  const avgResolutionMinutes = clearedWithDuration.length > 0
    ? clearedWithDuration.reduce((sum, n) => sum + (new Date(n.resolved_at).getTime() - new Date(n.detected_at).getTime()) / 60000, 0) / clearedWithDuration.length
    : 0

  const formatDuration = (minutes: number) => {
    if (minutes <= 0) return "—"
    const hrs = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    if (hrs === 0) return `${mins}m`
    return `${hrs}h ${mins}m`
  }

  const completedCount = cardScopedClogs.filter(n => isCleared(n) && n.resolved_at).length

  const refetchAll = useCallback(async () => {
    await clogsCache.refetch()
    setCurrentPage(1)
  }, [])

  useEffect(() => { refetchAll() }, [startDate, endDate])

  usePolling(refetchAll, 120000)

  const printRows = filtered.map(c => [
    c.event_id,
    c.severity,
    c.detected_at ? new Date(c.detected_at).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
    c.resolved_at ? new Date(c.resolved_at).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }) : '—',
    c.barangay_details?.barangay_name ? `Brgy. ${c.barangay_details.barangay_name}` : '—',
    c.reading_details?.water_level != null ? `${c.reading_details.water_level} cm` : '—',
    c.reading_details?.water_flow_rate != null ? `${Number(c.reading_details.water_flow_rate).toFixed(5)} m/s` : '—',
    c.status === 'Cleared' && c.auto_cleared ? 'Cleared (Auto)' : c.status,
    clearReasonLabel(c.clear_reason),
  ])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Barangay Personnel'

  const printTitle = "Clog Events"
  const printColumns = ["ID", "Severity", "Detected At", "Resolved At", "Location", "Water Level", "Water Flow", "Status", "Reason"]

  const handlePrint = () => {
    exportOrPrint({
      table: { title: printTitle, columns: printColumns, rows: printRows },
      onError: () => addToast("Failed to export. Please try again.", "error"),
    })
  }

  useWebSocket({
    path: "/ws/clog-events/",
    onMessage: (newClog) => {
      clogsCache.setData(prev => [newClog, ...prev])
    },
  })

  if (loading) return <ClogEventsSkeleton/>


  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">
        {/* filter and export container */}
        <div className="flex justify-between w-full">
          {/* filters */}
          <div className="flex gap-3 w-full">
            <SearchFilter value={search} onChange={setSearch} placeholder='Search clog event...' height="h-9" />

            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent position="popper" className='min-w-0'>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All Severity">All Severity</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Low">Low</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Medium">Moderate</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="High">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="text-xs cursor-pointer px-3 py-[16px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent position="popper" className='min-w-0'>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="All Status">All Status</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Detected">Detected</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Responded">Responded</SelectItem>
                <SelectItem className="text-xs cursor-pointer p-2 text-[#122A48]" value="Cleared">Cleared</SelectItem>
              </SelectContent>
            </Select>

            <DateRangeFilter
              from={startDate}
              to={endDate}
              onChange={(from, to) => { setStartDate(from); setEndDate(to) }}
            />
          </div>

          <div>
            <Button onClick={handlePrint} className="bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer">
              <FileDown size={16} className="mr-1" />
              Export
            </Button>
          </div>

        </div>

        {/* summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48] mt-3">
          {[
            { icon: <Radar size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: total,label: "Total Clog Events" },
            { icon: <ArchiveRestore size={20} color="#FF9705" />, bg: "bg-[#F0FBB2]", count: cleared,  label: "Cleared Events"},
            { icon: <Clock3 size={20} color="#582579" />, bg: "bg-[#E5EAFF]", count: formatDuration(avgResolutionMinutes), label: "Average Resolution Time" },
            { icon: <ClipboardCheck size={20} color="#A21111" />, bg: "bg-[#D8101059]", count: completedCount,  label: "Completed Events" },
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

        {/* table and preview */}
        <div className="flex gap-3 mt-3 flex-1 min-h-[520px]">

          {/* Table */}
          <div ref={panelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] flex-[3] min-w-0 rounded-lg flex flex-col'>

            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC] h-12'>
                  <TableRow>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>EVENT ID</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>SEVERITY</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>DETECTED AT</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>RESOLVED AT</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>LOCATION</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>WATER LEVEL</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>WATER FLOW</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>STATUS</TableHead>
                    <TableHead className='font-semibold text-left text-xs text-[#727272]'>REASON</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!fetchError && filtered.length > 0 && paginated.map(clog => (
                    <TableRow
                      key={clog.event_id}
                      className={`border-b border-[#C6C6C8] cursor-pointer ${
                        selectedClog?.event_id === clog.event_id
                          ? 'bg-[#CDE3DE45]'
                          : 'hover:bg-[#f5f5f5]'
                      }`}
                      onClick={() => setSelectedClog(clog)}
                    >
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">{clog.event_id}</TableCell>
                      <TableCell className="text-left h-13 text-xs">
                        <span className={`inline-flex items-center !text-[11px] px-5 py-1 rounded-full text-[13px] font-semibold ${
                          clog.severity === 'High'   ? 'bg-[#FFE5E5] text-[#D81010]' :
                          clog.severity === 'Medium' ? 'bg-[#F4E4A7] text-[#E4B600]' :
                          'bg-[#B2FBC173] text-[#2C7B3C]'
                        }`}>
                          {clogSeverityLabel(clog.severity)}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">
                        {clog.detected_at
                          ? new Date(clog.detected_at).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">
                        {clog.resolved_at
                          ? new Date(clog.resolved_at).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
                          : '—'}
                      </TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">Brgy. {clog?.barangay_details?.barangay_name}</TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">{clog?.reading_details?.water_level ?? '—'} cm</TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">~ {clog.reading_details?.water_flow_rate != null ? Number(clog.reading_details.water_flow_rate).toFixed(5) : '—'} m/s</TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          {clog.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#122A48] text-left h-13 text-xs">
                        {clog.clear_reason ? CLEAR_REASON_SHORT[clog.clear_reason] : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* fetch error state */}
            {fetchError && (
              <div className="flex-1 flex flex-col justify-center items-center gap-3">
                {clogsCache.retrying ? (
                  <div className="flex flex-col items-center gap-3">
                    <SpinnerIcon size={32} color="#D81010" />
                    <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[#D81010] text-center">
                      <p className="font-semibold">Failed to load clog events</p>
                      <p className="text-sm">Please try again later</p>
                    </div>
                    <Button onClick={refetchAll} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                  </>
                )}
              </div>
            )}

            {/* no event state */}
            {!fetchError && filtered.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
                <div className="rounded-full bg-[#E5E5E6] p-3">
                  <Radar size={30} color="#727272" />
                </div>
                <p className="text-[#122A48] font-bold">No clog events found</p>
                <p className="text-[#727272] text-xs">
                  No clog events match these filters.
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

        {/* preview of selected clog event */}
        <div className="border border-[#C6C6C8] rounded-lg bg-[#F8F9FA] flex-1 min-w-[240px]">
          {!selectedClog ? (
            <div className="flex flex-col gap-3 justify-center items-center h-full">
              <FileSearch size={70} className="text-[#1565BC80]"/>
              <p className="text-[#122A488F] font-bold -my-1">No Event Selected</p>
              <p className="text-[#122A4873] text-xs text-center">Select a record from the table <br />to view details.</p>
            </div>

          ) : (
            <div className="flex flex-col gap-3 text-[#122A48]">

              {/* Event details */}
              <div className="p-2 px-4 ull font-semibold -mb-3 text-sm">
                <p className="text-[#122A48]">Event details</p>
              </div>

              <hr />

              <div className="flex gap-3 px-4 justify-between">
                <div className="flex flex-col gap-3">
                  <p className="text-[#1565BC] text-sm underline">CLG-2026{selectedClog.event_id}</p>
                  <p className="text-xs">Clog event - {clogSeverityLabel(selectedClog.severity)}</p>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-semibold ${
                    selectedClog.severity === 'High'   ? 'bg-[#FFE5E5] text-[#D81010]' :
                    selectedClog.severity === 'Medium' ? 'bg-[#F4E4A7] text-[#d0a806]' :
                    'bg-[#B2FBC173] text-[#2C7B3C]'
                  }`}>
                    {clogSeverityLabel(selectedClog.severity)}
                  </span>
                </div>
              </div>

              <hr />

              {/* Event information */}
              <div className="text-[#122A48] px-4 flex flex-col gap-3">
                <div>
                  <p className="font-medium text-sm">Event Information</p>
                </div>
                <div className="flex justify-between text-xs">
                  <p>Location (Barangay)</p>
                  <p>{selectedClog.barangay_details?.barangay_name}</p>
                </div>
                <div className="flex justify-between text-xs">
                  <p>Detected At</p>
                  <p>
                    {selectedClog.detected_at
                      ? new Date(selectedClog.detected_at).toLocaleString('en-PH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true })
                      : '—'}
                  </p>
                </div>
                <div className="flex justify-between text-xs">
                  <p>Sensor Node</p>
                  <p>{selectedClog.node_details?.node_name}</p>
                </div>
                <div className="flex justify-between text-xs">
                  <p>Waste Classification</p>
                  <p>{selectedClog.classification_details?.dominant_waste_type ?? '—'}</p>
                </div>
                <div className="flex justify-between text-xs">
                  <p>Clog Percentage</p>
                  <p>{selectedClog.reading_details?.clog_pct != null ? `${selectedClog.reading_details.clog_pct}%` : '—'}</p>
                </div>
              </div>

              <hr />

              {/* Incident details */}
              <div className="text-[#122A48] px-4 flex flex-col gap-3">
                <div className="w-full">
                  <p className="font-medium text-sm">Incident Details</p>
                </div>

                <div className="flex justify-between text-xs">
                  <p>Water Level</p>
                  <p>{selectedClog.reading_details?.water_level ?? '—'} cm</p>
                </div>

                <div className="flex justify-between text-xs">
                  <p>Water Flow</p>
                  <p>~ {selectedClog.reading_details?.water_flow_rate ?? '—'} m/s</p>
                </div>

                <div className="flex justify-between text-xs">
                  <p>Severity</p>
                  <p>{clogSeverityLabel(selectedClog.severity)}</p>
                </div>

                <div className="flex justify-between text-xs">
                  <p>Status</p>
                  <p className="flex items-center gap-1.5">
                    {selectedClog.status}
                  </p>
                </div>

                {selectedClog.clear_reason && (() => {
                  const by =
                    selectedClog.clear_reason === 'Responded' ? selectedClog.responded_by_details
                    : selectedClog.clear_reason === 'Manual Clear' ? selectedClog.cleared_by_details
                    : null
                  return (
                    <div className="flex justify-between items-start gap-4 text-xs">
                      <p className="shrink-0">Reason</p>
                      <div className="text-right">
                        <p>{clearReasonLabel(selectedClog.clear_reason)}</p>
                        {by && <p className="text-[#727272]">by {by.first_name} {by.last_name}</p>}
                      </div>
                    </div>
                  )
                })()}

              </div>

              <hr />

              <ClogTimeline clog={selectedClog} />

            </div>
          )}

        </div>

        </div>
        <Toast toasts={toasts} onRemove={removeToast} />

        <PrintReport
          reportTitle={printTitle}
          columns={printColumns}
          rows={printRows}
          generatedBy={generatedBy}
        />

      </div>
    </>
  )
}