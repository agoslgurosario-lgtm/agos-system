"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

// lib
import { fetchWithAuth } from "@/lib/auth"
import {
  SEVERITY_STYLE, FINAL_CONDITION_LABEL, FINAL_CONDITION_STYLE,
  formatDate, monthOf, filedByName, buildMonthOptions
} from "@/lib/reportOptions"
import { printReport } from "@/lib/printReport"
import { getUser } from "@/lib/auth"

// shadcn
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"

// icons
import { FileDown, FileText, Eye } from "lucide-react"

// components
import { TablePagination } from "@/components/TablePagination"
import { usePagination } from "@/components/hooks/usePagination"
import { BarangayReportsSkeleton } from "@/components/Skeleton/Menro/BarangayReportsSkeleton"
import { usePageCache } from "@/components/hooks/usePageCache"
import { Toast } from "@/components/Toast"
import { useToast } from "@/components/hooks/useToast"
import { useFillRows } from "@/components/hooks/useFillRows"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import StyledBadge from "@/components/StyledBadge"
import { PrintCanalReport } from "@/components/PrintReport/PrintCanalReport"

// types
import type { CanalMonitoringReport, ReportBarangay, ReportSeverity } from "@/types/report"

const SEVERITY_FILTERS: ReportSeverity[] = ["Critical", "Medium", "Low"]

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

  const barangaysCache = usePageCache('menroCanalReports:barangays', fetchAllBarangaysRaw, [] as ReportBarangay[], { autoFetch: false })
  const reportsCache = usePageCache('menroCanalReports:reports', fetchReportsRaw, [] as CanalMonitoringReport[], { autoFetch: false })

  const { toasts, addToast, removeToast } = useToast()

  const reports = reportsCache.data
  const allBarangays = barangaysCache.data
  const loading = barangaysCache.loading || reportsCache.loading
  const fetchError = barangaysCache.error || reportsCache.error

  // filter state
  const [selectedMonth, setSelectedMonth] = useState<string>("All")
  const [filterBarangay, setFilterBarangay] = useState("All")
  const [filterSeverity, setFilterSeverity] = useState("All")

  const [printingReport, setPrintingReport] = useState<CanalMonitoringReport | null>(null)

  const monthOptions = buildMonthOptions(reports)

  const filteredReports = reports
    .filter(r => selectedMonth === "All" || monthOf(r) === selectedMonth)
    .filter(r => filterBarangay === "All" || String(r.barangay_details?.barangay_id) === filterBarangay)
    .filter(r => filterSeverity === "All" || r.severity === filterSeverity)
    .sort((a, b) => sortKey(b) - sortKey(a) || b.report_id - a.report_id)

  const { panelRef, tableWrapRef } = useFillRows({
    rowHeight: 56,
    initialRows: 6,
    deps: [loading],
  })

  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filteredReports, 6)

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      barangaysCache.refetch(),
      reportsCache.refetch(),
    ])
  }, [])

  useEffect(() => {
    refetchAll()
  }, [])

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

        {/* top filters */}
        <div className="flex justify-between">
          <div className="flex gap-3">

            {/* month filter */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="cursor-pointer w-40 px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className='w-40 min-w-0 !max-h-70 overflow-y-auto'>
                <SelectItem className="p-2 py-1 cursor-pointer text-[#122A48]" value="All">All Months</SelectItem>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} className="p-2 py-1 cursor-pointer text-[#122A48]" value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* barangay filter (all barangay regardless if they are registered or not) */}
            <Select value={filterBarangay} onValueChange={setFilterBarangay}>
              <SelectTrigger className="cursor-pointer w-40 px-3 py-2 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue placeholder="All Barangays" />
              </SelectTrigger>
              <SelectContent position="popper" className="!max-h-70 overflow-y-auto">
                <SelectItem value="All">All Barangays</SelectItem>
                {[...allBarangays]
                  .sort((a, b) => a.barangay_name.localeCompare(b.barangay_name))
                  .map((barangay) => (
                    <SelectItem className="cursor-pointer" key={barangay.barangay_id} value={String(barangay.barangay_id)}>
                      {barangay.barangay_name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* severity filter */}
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="cursor-pointer w-40 px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" className="w-40 min-w-0">
                <SelectItem value="All" className="p-2 py-1 cursor-pointer text-[#122A48]">All Severity</SelectItem>
                {SEVERITY_FILTERS.map(s => (
                  <SelectItem key={s} value={s} className="p-2 py-1 cursor-pointer text-[#122A48]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>
        </div>

        {/* barangay reports table */}
        <div className="flex gap-4 mt-3 flex-1 min-h-[600px]">
          <div ref={panelRef} className="bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] w-full rounded-lg flex flex-col">
            <p className="p-2 px-3 text-sm font-bold text-[#122A48]">Barangay Reports</p>

            <div ref={tableWrapRef}>
              <Table>
                <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC]">
                  <TableRow>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">DATE OBSERVED</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">BARANGAY</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">CANAL</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">SEVERITY</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">FINAL CONDITION</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">FILED BY</TableHead>
                    <TableHead className="font-semibold text-left text-xs text-[#727272]">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {!fetchError && filteredReports.length > 0 &&
                    paginated.map(report => (
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
                            onClick={() => router.push(`/menro/barangay-reports/view-barangay-report/?id=${report.report_id}`)}
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
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
                {(barangaysCache.retrying || reportsCache.retrying) ? (
                  <div className="flex flex-col items-center gap-3">
                    <SpinnerIcon size={32} color="#D81010" />
                    <p className="text-[#D81010] font-semibold text-xs">Retrying...</p>
                  </div>
                ) : (
                  <>
                    <div className="text-[#D81010] text-center">
                      <p className="font-semibold">Failed to load barangay reports</p>
                      <p className="text-sm">Please try again later</p>
                    </div>

                    <Button
                      onClick={refetchAll}
                      className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100"
                    >
                      Retry
                    </Button>
                  </>
                )}
              </div>
            )}

            {!fetchError && filteredReports.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
                <div className="rounded-full bg-[#E5E5E6] p-3">
                  <FileText size={30} color="#727272" />
                </div>

                <p className="text-[#122A48] font-bold">
                  No barangay reports found
                </p>

                <p className="text-[#727272] text-xs">
                  {reports.length === 0
                    ? "No barangay reports have been submitted yet."
                    : "No reports match the selected filters."}
                </p>
              </div>
            )}

            <div className="mt-auto">
              <TablePagination
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>

          </div>
        </div>

      </div>

      <Toast toasts={toasts} onRemove={removeToast} />
      {printingReport && <PrintCanalReport report={printingReport} generatedBy={generatedBy} />}
    </>
  )
}