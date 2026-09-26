"use client"

import { useState, useEffect, useMemo, useRef , useCallback, } from "react"
import { RadioTower, Calendar as CalendarIcon, ChevronDown, FileDown  } from "lucide-react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/TablePagination"
import { Button } from "@/components/ui/button"
import { usePagination } from "@/components/hooks/usePagination"
import { SearchFilter } from "@/components/SearchFilter"
import { api } from "@/lib/api"
import { usePolling } from "@/components/hooks/usePolling"
import { useToast } from "@/components/hooks/useToast"
import { Toast } from "@/components/Toast"
import { AuditSkeleton } from "@/components/Skeleton/Admin/AuditSkeleton"
import { usePageCache } from "@/components/hooks/usePageCache"
import { useFillRows } from "@/components/hooks/useFillRows"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { PrintReport } from "@/components/PrintReport/PrintReport"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"


const affectedTableLabels: Record<string, string> = {
  tbl_user: 'User Management',
  tbl_barangay: 'Barangay Management',
  tbl_sensor_nodes: 'Sensor Nodes',
  tbl_sensor_readings: 'Sensor Readings',
  tbl_hotspots: 'Canal Hotspots',
  tbl_alerts: 'Alerts',
  tbl_alert_reads: 'Alert Reads',
  tbl_waste_classification: 'Waste Classification',
  tbl_clog_events: 'Clog Events',
  tbl_barangay_monthly_report: 'Barangay Monthly Reports',
  tbl_municipal_monthly_report: 'Municipal Monthly Reports',
  tbl_report_media: 'Report Media',
  tbl_system_health_logs: 'System Health Logs',
  tbl_audit_logs: 'Audit Logs',
}

function formatAffectedTableLabel(tableName?: string | null) {
  if (!tableName) return '—'
  return affectedTableLabels[tableName] ??
    tableName.replace(/^tbl_/, '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatAuditDetails(audit: AuditLog) {
  const oldValue = audit.old_value?.trim()
  const newValue = audit.new_value?.trim()

  if (oldValue && newValue) {
    return `${audit.action} from ${oldValue} to ${newValue}`
  }
  if (newValue) return `${audit.action}: ${newValue}`
  if (oldValue) return `${audit.action}: ${oldValue}`
  return audit.action
}

type AuditLog = {
  audit_id: number
  user: number | null
  user_details: {
    user_id: number
    first_name: string
    last_name: string
    email: string
    user_role: string
  } | null
  action: string
  affected_table?: string | null
  old_value?: string | null
  new_value?: string | null
  ip_address?: string | null
  timestamp: string
}

// fetch raw data
const fetchAuditsRaw = async (): Promise<AuditLog[]> => {
  const res = await api.get('/api/audit-logs/')
  const data = res.results ?? res
  return Array.isArray(data) ? data : []
}

export default function Audit() {
  const auditsCache = usePageCache('audit:audits', fetchAuditsRaw, [] as AuditLog[], { autoFetch: false })

  useEffect(() => {
    auditsCache.refetch()
  }, [])

  const audits = auditsCache.data
  const [search, setSearch] = useState<string>('')
  
  // Date State
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isOpen, setIsOpen] = useState<boolean>(false)
  
  const loading = auditsCache.loading
  const fetchError = auditsCache.error

  const [exporting, setExporting] = useState(false)
  
  const { toasts, addToast, removeToast } = useToast()
  
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredAudits = useMemo(() => {
    const q = search.trim().toLowerCase()
    
    return audits.filter((a) => {
      if (q) {
        const tableLabel = formatAffectedTableLabel(a.affected_table)
        const matchesSearch = [
          String(a.action),
          tableLabel,
          String(a.old_value ?? ''),
          String(a.new_value ?? ''),
          String(a.ip_address ?? ''),
          a.user_details ? `${a.user_details.first_name} ${a.user_details.last_name}` : '',
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(q))
        
        if (!matchesSearch) return false
      }

      if (startDate || endDate) {
        const auditDate = new Date(a.timestamp).toISOString().split('T')[0] // YYYY-MM-DD
        if (startDate && auditDate < startDate) return false
        if (endDate && auditDate > endDate) return false
      }

      return true
    })
  }, [audits, search, startDate, endDate])

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 33,
    initialRows: 14,
    deps: [loading],
  })

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filteredAudits, rows)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, startDate, endDate, setCurrentPage])

  usePolling(async () => { await auditsCache.refetch() }, 30000)

  // Generate dynamic button label text 
  const dateLabel = useMemo(() => {
    if (startDate && endDate) return `${startDate} to ${endDate}`
    if (startDate) return `From: ${startDate}`
    if (endDate) return `Until: ${endDate}`
    return "Filter by Date"
  }, [startDate, endDate])

    const printRows = filteredAudits.map(a => [
    a.audit_id,
    a.user_details ? `${a.user_details.first_name} ${a.user_details.last_name}` : '—',
    a.action,
    formatAffectedTableLabel(a.affected_table),
    a.old_value?.trim() || '—',
    a.new_value?.trim() || '—',
    a.ip_address || '—',
    new Date(a.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  ])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

  const handlePrint = () => {
    printReport()
  }


  if (loading) return <AuditSkeleton/>

  return (
    <div className="w-full h-full flex flex-col gap-2 max-w-full box-border">

      {/* Toolbar */}
      <div className="w-full flex gap-2 items-center justify-between ">
        <SearchFilter value={search} onChange={setSearch} placeholder='Search audit logs...' width="w-150" height="h-9" />
        
        {/* Dropdown Container */}
        <div className="relative flex gap-2" ref={dropdownRef} >
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`cursor-pointer flex items-center justify-between w-[240px] h-9 px-3 border border-[#D0D0D0] rounded-lg bg-white text-[12px] font-normal transition-colors outline-none text-left ${
              startDate || endDate ? "text-[#122A48]" : "text-[#999999]"
            }`}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-[#122A48]" />
              <span>{dateLabel}</span>
            </div>
            <ChevronDown size={14} className="text-[#999999]" />
          </button>

          <Button onClick={handlePrint} className="bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer py-[17px]">
            <FileDown size={16}/>
            Export
          </Button>

          {/* Expanded Dual Calendar Dropdown Card Panel */}
          {isOpen && (
            <div className="absolute right-20 top-9 mt-1.5 p-4 bg-white border border-[#D0D0D0] rounded-lg shadow-xl z-50 flex flex-col gap-3 w-[280px]">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wide">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full h-9 border border-[#D0D0D0] rounded-md px-2 text-[12px] outline-none text-[#122A48] cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wide">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  className="w-full h-9 border border-[#D0D0D0] rounded-md px-2 text-[12px] outline-none text-[#122A48] cursor-pointer"
                />
              </div>

              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="w-full text-center py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded border border-dashed border-red-200 mt-1 transition"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audit Table Card */}
      <div ref={panelRef} className='bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col overflow-hidden min-w-0 mt-2 flex-1 min-h-[596px]'>
        <p className='p-2 font-bold text-[#122A48] text-sm'>Audit Logs and Activities</p>

        <div ref={tableWrapRef} className="w-full overflow-x-auto">
          <Table className="w-full min-w-[700px]"> 
            <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC]'>
              <TableRow>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>TIMESTAMP</TableHead>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>USER</TableHead>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>ACTION</TableHead>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>MODULE</TableHead>
                <TableHead className='font-semibold text-left text-[#727272] text-xs px-1 whitespace-nowrap'>DETAILS</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {!fetchError && filteredAudits.length > 0 && paginated.map((a) => (
                <TableRow key={a.audit_id} className="border-b border-[#C6C6C8]">
                  <TableCell className="text-[#122A48] text-left text-[12px] px-2 h-7 whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="text-[#122A48] text-left text-[12px] px-2 h-7 whitespace-nowrap">
                    {a.user_details ? `${a.user_details.first_name} ${a.user_details.last_name}` : '—'}
                  </TableCell>
                  <TableCell className="text-[#122A48] text-left text-[12px] px-2 h-7 whitespace-nowrap">{a.action}</TableCell>
                  <TableCell className="text-[#122A48] text-left text-[12px] px-2 h-7 whitespace-nowrap">{formatAffectedTableLabel(a.affected_table)}</TableCell>
                  <TableCell className="text-[#122A48] text-left text-[12px] max-w-xs px-4 h-7 truncate">{formatAuditDetails(a)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {fetchError && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            {auditsCache.retrying ? (
              <div className="flex flex-col items-center gap-3">
                <SpinnerIcon size={32} color="#D81010" />
                <p className="text-[#D81010] font-semibold">Retrying...</p>
              </div>
            ) : (
              <>
                <div className="text-[#D81010] text-center">
                  <p className="font-semibold">Failed to load audit logs</p>
                  <p className="text-sm">Please try again later</p>
                </div>
                <Button
                  onClick={() => auditsCache.refetch()}
                  className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100"
                >
                  Retry
                </Button>
              </>
            )}
          </div>
        )}

        {!fetchError && filteredAudits.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <div className="rounded-full bg-[#E5E5E6] p-1">
              <RadioTower size={36} color="#727272" />
            </div>
            <p className="text-[#122A48] font-bold">No audit logs available</p>
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
      reportTitle="Audit Logs"
      columns={["ID", "User", "Action", "Table", "Old Value", "New Value", "IP Address", "Timestamp"]}
      rows={printRows}
      generatedBy={generatedBy}
    />

    </div>
  )
}