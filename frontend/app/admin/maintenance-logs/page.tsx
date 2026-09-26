"use client"

// icons
import { useState, useEffect, useMemo } from "react"
import { Wrench, ChevronDown, FileDown } from "lucide-react"

// shadcn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/TablePagination"
import { Button } from "@/components/ui/button"

// lib
import { api } from "@/lib/api"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

// hooks
import { usePageCache } from "@/components/hooks/usePageCache"
import { useFillRows } from "@/components/hooks/useFillRows"
import { useToast } from "@/components/hooks/useToast"
import { usePolling } from "@/components/hooks/usePolling"
import { usePagination } from "@/components/hooks/usePagination"

// components
import { PrintReport } from "@/components/PrintReport/PrintReport"
import { SearchFilter } from "@/components/SearchFilter"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { Toast } from "@/components/Toast"
import { MaintenanceLogsSkeleton } from "@/components/Skeleton/Admin/MaintenanceLogsSkeleton"


type MaintenanceLog = {
  maintenance_id: number
  node: number
  node_details: {
    node_id: number
    node_name: string
    status: string
    barangay_details: { barangay_id: number; barangay_name: string } | null
  } | null
  reason: string
  marked_by: number | null
  marked_by_details: {
    user_id: number
    first_name: string
    last_name: string
  } | null
  started_at: string
  resolved_at: string | null
  closed_reason: 'Fixed' | 'Retired' | null
}

function getMonthOptions() {
  const months = []
  const now = new Date()
  const year = now.getFullYear()
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1)
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    })
  }
  return months
}

// fetch raw data
const fetchMaintenanceLogsRaw = async (): Promise<MaintenanceLog[]> => {
  const res = await api.get('/api/maintenance-logs/')
  const data = res.results ?? res
  return Array.isArray(data) ? data : []
}

export default function MaintenanceLogs() {
  const logsCache = usePageCache('maintenance:logs', fetchMaintenanceLogsRaw, [] as MaintenanceLog[], { autoFetch: false })

  useEffect(() => {
    logsCache.refetch()
  }, [])

  const logs = logsCache.data
  const [search, setSearch] = useState<string>('')

  const monthOptions = useMemo(() => getMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState<string>('') // '' = all months
  const [isOpen, setIsOpen] = useState<boolean>(false)

  const loading = logsCache.loading
  const fetchError = logsCache.error

  const [exporting, setExporting] = useState(false)

  const { toasts, addToast, removeToast } = useToast()

  const handlePrint = () => {
    printReport()
  }

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase()

    return logs.filter((l) => {
      if (q) {
        const matchesSearch = [
          l.node_details?.node_name ?? '',
          l.node_details?.barangay_details?.barangay_name ?? '',
          l.reason,
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))

        if (!matchesSearch) return false
      }

      if (selectedMonth) {
        const logMonth = l.started_at.slice(0, 7) // 'YYYY-MM'
        if (logMonth !== selectedMonth) return false
      }

      return true
    })
  }, [logs, search, selectedMonth])

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 33,
    initialRows: 14,
    deps: [loading],
  })

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filteredLogs, rows)

  const printRows = filteredLogs.map(l => [
    l.node_details?.node_name ?? 'Unknown Node',
    l.reason,
    new Date(l.started_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    l.resolved_at
      ? new Date(l.resolved_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'Ongoing',
  ])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

  useEffect(() => {
    setCurrentPage(1)
  }, [search, selectedMonth, setCurrentPage])

  usePolling(async () => { await logsCache.refetch() }, 30000)

  if (loading) return <MaintenanceLogsSkeleton />

  return (
    <div className="w-full h-full flex flex-col gap-2 max-w-full box-border">

      {/* Toolbar */}
      <div className="w-full flex gap-2 items-center justify-between ">
        <SearchFilter value={search} onChange={setSearch} placeholder='Search maintenance logs...' width="w-150" height="h-9" />

        <div className="relative flex gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`cursor-pointer flex items-center justify-between w-[200px] h-9 px-3 border border-[#D0D0D0] rounded-lg bg-white text-[12px] font-normal transition-colors outline-none text-left ${
              selectedMonth ? "text-[#122A48]" : "text-[#999999]"
            }`}
          >
            <span>{selectedMonth ? monthOptions.find(m => m.value === selectedMonth)?.label : "All Months"}</span>
            <ChevronDown size={14} className="text-[#999999]" />
          </button>

          <Button onClick={handlePrint} className="bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer py-[17px]">
            <FileDown size={16}/>
            Export
          </Button>

          {isOpen && (
            <div className="absolute right-20 top-9 mt-1.5 p-2 bg-white border border-[#D0D0D0] rounded-lg shadow-xl z-50 flex flex-col w-[200px] max-h-[260px] overflow-y-auto">
              <button
                type="button"
                onClick={() => { setSelectedMonth(''); setIsOpen(false) }}
                className={`text-left px-2 py-1.5 rounded text-[12px] hover:bg-[#F0F4F7] ${!selectedMonth ? 'text-[#1565BC] font-semibold' : 'text-[#122A48]'}`}
              >
                All Months
              </button>
              {monthOptions.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => { setSelectedMonth(m.value); setIsOpen(false) }}
                  className={`text-left px-2 py-1.5 rounded text-[12px] hover:bg-[#F0F4F7] ${selectedMonth === m.value ? 'text-[#1565BC] font-semibold' : 'text-[#122A48]'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Maintenance Logs Table Card */}
      <div ref={panelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col overflow-hidden min-w-0 mt-2 flex-1 min-h-[596px]'>
        <p className='p-2 font-bold text-[#122A48] text-sm'>Maintenance Logs</p>

        <div ref={tableWrapRef} className="w-full overflow-x-auto">
          <Table className="w-full min-w-[500px]">
            <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC]'>
              <TableRow>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>NODE</TableHead>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>REASON</TableHead>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>DATE MARKED</TableHead>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>DATE FIXED</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!fetchError && filteredLogs.length > 0 && paginated.map((l) => (
                <TableRow key={l.maintenance_id} className="border-b border-[#C6C6C8]">
                  <TableCell className="text-[#122A48] text-left text-[12px] px-2 h-7 whitespace-nowrap">
                    {l.node_details?.node_name ?? 'Unknown Node'}
                  </TableCell>
                  <TableCell className="text-[#122A48] text-left text-[12px] max-w-md px-2 h-7 truncate">{l.reason}</TableCell>
                  <TableCell className="text-[#122A48] text-left text-[12px] px-2 h-7 whitespace-nowrap">{new Date(l.started_at).toLocaleString()}</TableCell>
                  <TableCell className="text-[#122A48] text-left text-[12px] px-2 h-7 whitespace-nowrap">
                    {l.resolved_at ? (
                      new Date(l.resolved_at).toLocaleString()
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-[#FFF3CD] text-[#8A6D00] text-[11px] font-medium">Ongoing</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {fetchError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {logsCache.retrying ? (
              <div className="flex flex-col items-center gap-3">
                <SpinnerIcon size={32} color="#D81010" />
                <p className="text-[#D81010] font-semibold">Retrying...</p>
              </div>
            ) : (
              <>
                <div className="text-[#D81010] text-center">
                  <p className="font-semibold">Failed to load maintenance logs</p>
                  <p className="text-sm">Please try again later</p>
                </div>
                <Button
                  onClick={() => logsCache.refetch()}
                  className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100"
                >
                  Retry
                </Button>
              </>
            )}
          </div>
        )}

        {!fetchError && filteredLogs.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="rounded-full bg-[#E5E5E6] p-3 mb-2">
              <Wrench size={30} color="#727272" />
            </div>
            <p className="text-[#122A48] font-semibold text-sm mb-1">No maintenance logs available</p>
            <p className="text-[#122A48] text-xs">No maintenance logs available have been added yet in the system</p>
          </div>
        )}

        <div className='mt-auto border-t border-[#00000015]'>
          <TablePagination
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>

      </div>

    <Toast toasts={toasts} onRemove={removeToast} />

    <PrintReport
      reportTitle="Maintenance Logs"
      columns={["Node", "Reason", "Date Marked", "Date Fixed"]}
      rows={printRows}
      generatedBy={generatedBy}
    />

    </div>
  )
}