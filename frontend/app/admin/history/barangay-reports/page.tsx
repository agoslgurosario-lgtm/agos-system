"use client"

// components
import { SearchFilter } from "@/components/SearchFilter"
import ReportOutcomeBar from "@/components/ReportOutcomeBar"
import FollowUpDialog from "@/components/ReportOutcomeBar/FollowUpDialog"
import { BarangayReportsSkeleton } from "@/components/Skeleton/Admin/HistorySkeleton/BarangayReportsSkeleton"
import { usePageCache } from "@/components/hooks/usePageCache"
import { Toast } from "@/components/Toast"
import { useToast } from "@/components/hooks/useToast"
import { useFillRows } from "@/components/hooks/useFillRows"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import StyledBadge from "@/components/StyledBadge"
import { PrintCanalReport } from "@/components/PrintReport/PrintCanalReport"

// react
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

// icons
import { Calendar as CalendarIcon, FileText, Trash2, TriangleAlert, MapPin, Radar, Eye, FileDown } from "lucide-react"

// table pagination
import { usePagination } from "@/components/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

// shadcn
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"

// lib
import { fetchWithAuth } from "@/lib/auth"
import {
  SEVERITY_STYLE, FINAL_CONDITION_LABEL, FINAL_CONDITION_STYLE,
  formatDate, monthOf, filedByName, buildMonthOptions, formatMonthLabel,
} from "@/lib/reportOptions"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

// types
import type { CanalMonitoringReport, ReportBarangay } from "@/types/report"

const sortKey = (r: CanalMonitoringReport) => new Date(r.date_observed ?? r.created_at).getTime()

// fetch raw data
const fetchAllBarangaysRaw = async (): Promise<ReportBarangay[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/barangays/all/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchReportsRaw = async (): Promise<CanalMonitoringReport[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/canal-reports/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}


export default function BarangayReports() {
  const router = useRouter()

  // filter states
  const [search, setSearch] = useState<string>('')
  const [filterBarangay, setFilterBarangay] = useState<string>('All')

  const now = new Date()
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthValue)
  const [outcomeDialog, setOutcomeDialog] = useState(false)

  const { toasts, addToast, removeToast } = useToast()

  // data states
  const barangaysCache = usePageCache('adminCanalReports:barangays', fetchAllBarangaysRaw, [] as ReportBarangay[], { autoFetch: false })
  const reportsCache = usePageCache('adminCanalReports:reports', fetchReportsRaw, [] as CanalMonitoringReport[], { autoFetch: false })
  const allBarangays = barangaysCache.data
  const reports = reportsCache.data
  const loading = barangaysCache.loading || reportsCache.loading
  const fetchError = barangaysCache.error || reportsCache.error

  const monthOptions = buildMonthOptions(reports)

  // reports in scope of the barangay + month filters (search doesn't affect the cards or the bar)
  const scopedReports = reports
    .filter(r => filterBarangay === "All" || String(r.barangay_details?.barangay_id) === filterBarangay)
    .filter(r => selectedMonth === "All" || monthOf(r) === selectedMonth)

  const q = search.toLowerCase()
  const filtered = scopedReports
    .filter(r =>
      [r.barangay_details?.barangay_name, r.canal_name, filedByName(r), r.assigned_personnel]
        .some(field => field?.toLowerCase().includes(q))
    )
    .sort((a, b) => sortKey(b) - sortKey(a) || b.report_id - a.report_id)

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 56,
    initialRows: 5,
    deps: [loading],
  })
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)

  // summary cards
  const totalReports = scopedReports.length
  const totalCollectedKg = scopedReports.reduce((sum, r) => sum + Number(r.waste_collected_amount ?? 0), 0)
  const criticalCount = scopedReports.filter(r => r.severity === "Critical").length

  // every barangay files after its clearing operations, so the total is ALL barangays,
  // not just the ones with a sensor
  const reportingCount = new Set(scopedReports.map(r => r.barangay)).size
  const barangayTotal = filterBarangay === "All" ? allBarangays.length : 1

  const cards = [
    { icon: <FileText size={20} color="#D48A00" />, bg: "bg-[#EED7AA]", value: String(totalReports), label: "Total Reports" },
    { icon: <Trash2 size={20} color="#582579" />, bg: "bg-[#E1CDE3]", value: totalCollectedKg.toLocaleString("en-US", { maximumFractionDigits: 2 }), label: "Waste Collected (kg)" },
    { icon: <TriangleAlert size={20} color="#CC251F" />, bg: "bg-[#FDD1D2]", value: String(criticalCount), label: "Critical Incidents" },
    { icon: <MapPin size={20} color="#1565BC" />, bg: "bg-[#1565BC61]", value: `${reportingCount} / ${barangayTotal}`, label: "Barangays Reporting" },
  ]

  // labels for the bar and the reporting period card
  const periodLabel = selectedMonth === "All" ? "Overall" : formatMonthLabel(selectedMonth)
  const periodRange = (() => {
    if (selectedMonth === "All") return "All months"
    const [y, m] = selectedMonth.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const label = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long' })
    return `${label} 1 - ${lastDay}, ${y}`
  })()

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      barangaysCache.refetch(),
      reportsCache.refetch(),
    ])
  }, [])

  useEffect(() => {
    refetchAll()
  }, [])

  const [printingReport, setPrintingReport] = useState<CanalMonitoringReport | null>(null)

  useEffect(() => {
    if (!printingReport) return

    const urls = [
      '/ROS-logo.jpg',
      ...printingReport.media.filter(m => m.file_url).map(m => m.file_url!),
    ]

    let remaining = urls.length
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      printReport()
    }

    urls.forEach(url => {
      const img = new window.Image()
      img.onload = img.onerror = () => {
        remaining -= 1
        if (remaining === 0) finish()
      }
      img.src = url
    })

    const timeout = setTimeout(finish, 4000)
    return () => clearTimeout(timeout)
  }, [printingReport])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'Admin'

  if (loading) return <BarangayReportsSkeleton/>

  return (
    <>
      <div className="hidden md:flex md:flex-col md:h-full">
        <div className="flex justify-between">
          <div className="flex gap-3">
            {/* search */}
            <SearchFilter value={search} onChange={setSearch} placeholder='Search...' height="h-9" />

            {/* barangay filter (all barangay regardless if registered or not) */}
            <Select value={filterBarangay} onValueChange={setFilterBarangay}>
              <SelectTrigger className="text-xs cursor-pointer w-40 px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="All Barangays" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                <SelectItem value="All" className="p-2 text-[#122A48] text-xs cursor-pointer ">All Barangays</SelectItem>
                {[...allBarangays]
                  .sort((a, b) => a.barangay_name.localeCompare(b.barangay_name))
                  .map(b => (
                    <SelectItem key={b.barangay_id} value={String(b.barangay_id)} className="text-xs cursor-pointer p-2 text-[#122A48]">
                      {b.barangay_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* month filter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="cursor-pointer text-xs w-40 px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="cursor-pointer text-xs p-2 w-40 min-w-0 !max-h-70 overflow-y-auto">
                <SelectItem className="cursor-pointer text-xs p-2 text-[#122A48]" value="All">All Months</SelectItem>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} className="cursor-pointer text-xs p-2 text-[#122A48]" value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48] mt-2">
          {cards.map(card => (
            <div key={card.label} className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
              <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-[#122A48] leading-tight">{card.value}</span>
                <p className="text-xs text-[#122A48]">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* cleanup outcomes + reporting period */}
        <div className="mt-2 flex gap-2 w-full">
          <div onClick={() => setOutcomeDialog(true)} className="flex-[3] cursor-pointer hover:opacity-80">
            <ReportOutcomeBar reports={scopedReports} periodLabel={periodLabel} />
          </div>

          <div className="bg-[#58D07159] rounded-lg flex justify-center flex-1 min-w-[240px]">
            <div className="flex gap-4.5 items-center">
              <CalendarIcon color={'#2C7B3C'} size={32} />
              <div>
                <p className="text-sm font-semibold text-[#2C7B3C]">Reporting Period</p>
                <p className="text-sm text-[#5BAD6C]">{periodRange}</p>
              </div>
            </div>
          </div>
        </div>

        {/* table */}
        <div ref={panelRef} className='flex-1 min-h-[412px] mt-2 bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg flex flex-col'>
          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC] h-12 rounded-lg'>
                <TableRow>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>DATE OBSERVED</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>BARANGAY</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>CANAL</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>SEVERITY</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>FINAL CONDITION</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>FILED BY</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {!fetchError && filtered.length > 0 && paginated.map(report => (
                  <TableRow key={report.report_id} className="border-b border-[#C6C6C8] text-xs">
                    <TableCell className="text-[#122A48] text-left h-14">{formatDate(report.date_observed)}</TableCell>
                    <TableCell className="text-[#122A48] text-left h-14">{report.barangay_details?.barangay_name}</TableCell>
                    <TableCell className="text-[#122A48] text-left h-14 max-w-40 truncate">{report.canal_name}</TableCell>
                    <TableCell className="text-[#122A48] text-left h-14">
                      {report.severity && <StyledBadge text={report.severity} style={SEVERITY_STYLE[report.severity]} size="md" />}
                    </TableCell>
                    <TableCell className="text-[#122A48] text-left h-14">
                      {report.final_canal_condition && (
                        <StyledBadge
                          text={FINAL_CONDITION_LABEL[report.final_canal_condition]}
                          style={FINAL_CONDITION_STYLE[report.final_canal_condition]}
                          size="md"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-[#122A48] text-left h-14">{filedByName(report)}</TableCell>
                    <TableCell className="flex gap-3">
                      <Button
                        onClick={() => router.push(`/admin/history/barangay-reports/view-barangay-report/?id=${report.report_id}`)}
                        className="text-xs border border-[#1565BC80] bg-[#CDE3DE45] hover:bg-[#b8d5cf45] text-[#122A48] cursor-pointer"
                      >
                        <Eye size={16} className="mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => setPrintingReport(report)}
                        className="text-xs bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer"
                      >
                        <FileDown size={16} className="mr-1" />
                        Export
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {fetchError && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              {(barangaysCache.retrying || reportsCache.retrying) ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                </div>
              ) : (
                <>
                  <div className="text-[#D81010] text-center">
                    <p className="font-semibold">Failed to load barangay reports</p>
                    <p className="text-sm">Please try again later</p>
                  </div>
                  <Button onClick={refetchAll} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                </>
              )}
            </div>
          )}

          {!fetchError && filtered.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
              <div className="rounded-full bg-[#E5E5E6] p-3">
                <Radar size={30} color="#727272" />
              </div>
              <p className="text-[#122A48] font-bold">No barangay reports found</p>
              <p className="text-[#727272] text-xs">
                {reports.length === 0
                  ? "No barangay reports have been submitted yet."
                  : "No reports match the selected filters."}
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

      {printingReport && <PrintCanalReport report={printingReport} generatedBy={generatedBy} />}

      <FollowUpDialog
        open={outcomeDialog}
        onOpenChange={setOutcomeDialog}
        reports={scopedReports}
        periodLabel={periodLabel}
        onView={(r) => router.push(`/admin/history/barangay-reports/view-barangay-report/?id=${r.report_id}`)}
      />
    </>
  )
}