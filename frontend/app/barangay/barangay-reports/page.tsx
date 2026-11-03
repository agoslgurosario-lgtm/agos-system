"use client"

// Barangay personnel version of the admin barangay-reports page.
// Differences: no barangay filter / barangay column / "Barangays Reported" card (personnel only see their own barangay),
// a Status column, and Export only for finished reports.

// components
import { SearchFilter } from "@/components/SearchFilter"
import { usePageCache } from "@/components/hooks/usePageCache"
import { Toast } from "@/components/Toast"
import { useToast } from "@/components/hooks/useToast"
import { useFillRows } from "@/components/hooks/useFillRows"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import StyledBadge from "@/components/StyledBadge"
import { PrintCanalReport } from "@/components/PrintReport/PrintCanalReport"
import { DateRangeFilter } from "@/components/DateRangeFilter"
import { BarangayReportsSkeleton } from "@/components/Skeleton/Admin/HistorySkeleton/BarangayReportsSkeleton"

// react
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

// icons
import { FileText, Trash2, Clock, Send, Radar, Eye, FileDown, Plus, Pencil } from "lucide-react"

// table pagination
import { usePagination } from "@/components/hooks/usePagination"
import { TablePagination } from "@/components/TablePagination"

// shadcn
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// lib
import { fetchWithAuth, getUser } from "@/lib/auth"
import {
  SEVERITY_STYLE, SEVERITY_LABEL,
  formatDate, filedByName,
  reportDate, inDateRange,
  averageResponseMinutes, formatDuration, purokLabel,
  ON_TIME_STYLE, LATE_STYLE, submissionStatus,
} from "@/lib/reportOptions"
import { STATUS_STYLE } from "@/lib/canalReportOptions"
import { ROUTES } from "@/lib/canalReportRoutes"
import SubmitBanner from "@/components/CanalReports/SubmitBanner"
import PerformanceCard from "@/components/CanalReports/PerformanceCard"
import { printReport } from "@/lib/printReport"
import { openPdf } from "@/lib/openPdf"
import { isIOSDevice } from "@/lib/device"

// types
import type { CanalMonitoringReport } from "@/types/report"

const sortKey = (r: CanalMonitoringReport) => new Date(reportDate(r)).getTime()
// same rule as the mobile app: a report is "in progress" until it is completed (Draft, or waiting for its post-report)
const isInProgress = (r: CanalMonitoringReport) =>
  !r.is_submitted && !["Ready_To_Verify", "Verified"].includes(r.status)
// only completed reports can be exported (an in-progress one may not have its date yet)
const canExport = (r: CanalMonitoringReport) => !isInProgress(r)

const fetchReportsRaw = async (): Promise<CanalMonitoringReport[]> => {
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/canal-reports/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

export default function MyBarangayReports() {
  const router = useRouter()

  // filter states
  const [search, setSearch] = useState<string>("")
  const [filterTimeliness, setFilterTimeliness] = useState<string>("All")
  const [filterSeverity, setFilterSeverity] = useState<string>("All")
  const [filterStatus, setFilterStatus] = useState<string>("All")

  // date range (empty = show every report)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const rangeActive = startDate !== "" || endDate !== ""

  const { toasts, addToast, removeToast } = useToast()

  // data
  const reportsCache = usePageCache("barangayCanalReports:reports", fetchReportsRaw, [] as CanalMonitoringReport[], { autoFetch: false })
  // voided reports are removed from the list
  const reports = reportsCache.data.filter(r => r.status !== "Voided")
  const loading = reportsCache.loading
  const fetchError = reportsCache.error

  // reports in scope of the date range (search and timeliness don't affect the cards)
  const scopedReports = reports.filter(r => !rangeActive || inDateRange(r, startDate, endDate))

  const q = search.toLowerCase()
  const filtered = scopedReports
    .filter(r => filterTimeliness === "All" || submissionStatus(r) === filterTimeliness)
    .filter(r => filterSeverity === "All" || r.severity === filterSeverity)
    .filter(r => filterStatus === "All" || r.status === filterStatus)
    .filter(r =>
      [purokLabel(r), filedByName(r), r.assigned_personnel].some(field => field?.toLowerCase().includes(q))
    )
    .sort((a, b) => sortKey(b) - sortKey(a) || b.report_id - a.report_id)

  const { panelRef, tableWrapRef, rows } = useFillRows({ rowHeight: 56, initialRows: 5, deps: [loading] })
  const { paginated, currentPage, setCurrentPage, totalItems, itemsPerPage } = usePagination(filtered, rows)

  useEffect(() => { setCurrentPage(1) }, [search, filterTimeliness, filterSeverity, filterStatus, startDate, endDate])

  // summary cards
  const totalReports = scopedReports.length
  const totalCollectedKg = scopedReports.reduce((sum, r) => sum + Number(r.waste_collected_amount ?? 0), 0)
  const avgResponse = averageResponseMinutes(scopedReports)
  const onTime = scopedReports.filter(r => submissionStatus(r) === "On time").length
  const late = scopedReports.filter(r => submissionStatus(r) === "Late").length
  const submittedCount = onTime + late

  const cards = [
    { icon: <FileText size={20} color="#D48A00" />, bg: "bg-[#EED7AA]", value: String(totalReports), label: "Total Reports" },
    { icon: <Trash2 size={20} color="#582579" />, bg: "bg-[#E1CDE3]", value: totalCollectedKg.toLocaleString("en-US", { maximumFractionDigits: 2 }), label: "Waste Collected (kg)" },
    { icon: <Clock size={20} color="#1F8F6E" />, bg: "bg-[#D5F0E8]", value: formatDuration(avgResponse), label: "Avg. Response Time" },
    { icon: <Send size={20} color="#1565BC" />, bg: "bg-[#1565BC61]", value: submittedCount ? `${onTime} / ${submittedCount}` : "—", label: "On-time Submissions" },
  ]

  const refetchAll = useCallback(async () => { await reportsCache.refetch() }, [])
  useEffect(() => { refetchAll() }, [])

  // printing / export (same flow as the admin page)
  const [printingReport, setPrintingReport] = useState<CanalMonitoringReport | null>(null)
  const [signatoryNames, setSignatoryNames] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!printingReport) return

    let finished = false
    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | undefined
    const finish = () => {
      if (finished || cancelled) return
      finished = true
      printReport()
    }

    // the saved snapshot can be empty ({}), a JSON string, or hold { name } objects; only trust it when it has names
    const readSnapshot = (raw: unknown): Record<string, string> => {
      let snap: any = raw
      if (typeof snap === "string") { try { snap = JSON.parse(snap) } catch { return {} } }
      if (!snap || typeof snap !== "object") return {}
      const names: Record<string, string> = {}
      Object.entries(snap).forEach(([position, v]: [string, any]) => {
        const name = typeof v === "string" ? v : v?.name
        if (typeof name === "string" && name.trim()) names[position] = name
      })
      return names
    }

    const resolveSignatories = async (): Promise<Record<string, string>> => {
      const saved = readSnapshot(printingReport.signatory_snapshot)
      if (Object.keys(saved).length > 0) return saved
      const barangayId = printingReport.barangay_details?.barangay_id
      if (!barangayId) return {}
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/signatories/?barangay=${barangayId}`)
        if (!res.ok) return {}
        const slots = await res.json()
        const names: Record<string, string> = {}
        slots.forEach((s: any) => { if (s.active) names[s.position] = s.active.name })
        return names
      } catch {
        return {}
      }
    }

    resolveSignatories().then(names => {
      if (cancelled) return
      setSignatoryNames(names)

      const urls = ["/ROS-logo.jpg", ...printingReport.media.filter(m => m.file_url).map(m => m.file_url!)]
      let remaining = urls.length

      // start the fallback timer only now, so the print dialog (which freezes the page)
      // can never open while the signatory request is still pending
      timeout = setTimeout(finish, 4000)
      urls.forEach(url => {
        const img = new window.Image()
        img.onload = img.onerror = () => {
          remaining -= 1
          if (remaining === 0) finish()
        }
        img.src = url
      })
    })

    return () => { cancelled = true; if (timeout) clearTimeout(timeout) }
  }, [printingReport])

  const currentUser = getUser()
  const generatedBy = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Barangay personnel"

  const handleExportReport = async (report: CanalMonitoringReport) => {
    try {
      await openPdf(`/api/canal-reports/${report.report_id}/export/`)
    } catch {
      addToast("Failed to export the report. Please try again.", "error")
    }
  }

  if (loading) return <BarangayReportsSkeleton />

  const selectTrigger = "cursor-pointer text-xs px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium"
  const selectItem = "cursor-pointer text-xs p-2 text-[#122A48]"
  const th = "font-semibold text-left text-xs text-[#727272]"
  const td = "text-[#122A48] text-left h-14"

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex flex-wrap gap-3">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search..." height="h-9" />

          {/* date range */}
          <DateRangeFilter from={startDate} to={endDate} onChange={(from, to) => { setStartDate(from); setEndDate(to) }} width="w-[260px]" />

          {/* submission filter (on time / late) */}
          <Select value={filterTimeliness} onValueChange={setFilterTimeliness}>
            <SelectTrigger className={selectTrigger}><SelectValue /></SelectTrigger>
            <SelectContent position="popper" className="cursor-pointer text-xs min-w-0">
              <SelectItem className={selectItem} value="All">All Submissions</SelectItem>
              <SelectItem className={selectItem} value="On time">On time</SelectItem>
              <SelectItem className={selectItem} value="Late">Late</SelectItem>
            </SelectContent>
          </Select>

          {/* severity */}
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className={selectTrigger}><SelectValue /></SelectTrigger>
            <SelectContent position="popper" className="cursor-pointer text-xs min-w-0">
              <SelectItem className={selectItem} value="All">All Severity</SelectItem>
              {(Object.keys(SEVERITY_LABEL) as (keyof typeof SEVERITY_LABEL)[]).map(sev => (
                <SelectItem key={sev} className={selectItem} value={sev}>{SEVERITY_LABEL[sev]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* report status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className={selectTrigger}><SelectValue /></SelectTrigger>
            <SelectContent position="popper" className="cursor-pointer text-xs min-w-0">
              <SelectItem className={selectItem} value="All">All Status</SelectItem>
              {Object.entries(STATUS_STYLE).filter(([key]) => key !== "Voided").map(([key, st]) => (
                <SelectItem key={key} className={selectItem} value={key}>{st.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={() => router.push(ROUTES.form())} className="ml-auto cursor-pointer bg-[#16a34a] font-bold text-white hover:bg-[#15803d]">
            <Plus size={16} className="mr-1" />
            Add report
          </Button>
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

        {/* submit to MENRO + performance, right above the table */}
        <div className="mt-4 grid grid-cols-1 gap-x-3 lg:grid-cols-2">
          <SubmitBanner />
          <PerformanceCard />
        </div>

        {/* table */}
        <div ref={panelRef} className="flex-1 min-h-[412px] mt-2 bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg flex flex-col">
          <div className="w-full p-2">
            <p className="text-sm font-bold text-[#122A48]">Recent Reports</p>
          </div>

          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-12 rounded-lg">
                <TableRow>
                  <TableHead className={th}>DATE SUBMITTED</TableHead>
                  <TableHead className={th}>PERIOD</TableHead>
                  <TableHead className={th}>PUROK</TableHead>
                  <TableHead className={th}>SEVERITY</TableHead>
                  <TableHead className={th}>STATUS</TableHead>
                  <TableHead className={th}>WASTE</TableHead>
                  <TableHead className={th}>FILED BY</TableHead>
                  <TableHead className={th}>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {!fetchError && filtered.length > 0 && paginated.map(report => {
                  const status = STATUS_STYLE[report.status]
                  return (
                    <TableRow key={report.report_id} className="border-b border-[#C6C6C8] text-xs">
                      <TableCell className={td}>
                        <p>{isInProgress(report) && !report.date_responded && !report.date_observed ? "No date yet" : formatDate(reportDate(report))}</p>
                      </TableCell>
                      <TableCell className={td}>
                        {report.submission_info ? (
                          <>
                            <p>{report.submission_info.label}</p>
                            <StyledBadge
                              text={submissionStatus(report) === "Late" ? `Late · ${report.submission_info.days_late}d` : "On time"}
                              style={submissionStatus(report) === "Late" ? LATE_STYLE : ON_TIME_STYLE}
                            />
                          </>
                        ) : "—"}
                      </TableCell>
                      <TableCell className={`${td} max-w-40 truncate`}>{purokLabel(report)}</TableCell>
                      <TableCell className={td}>
                        {report.severity && <StyledBadge text={SEVERITY_LABEL[report.severity]} style={SEVERITY_STYLE[report.severity]} size="md" />}
                      </TableCell>
                      <TableCell className={td}>
                        {status && (
                          <span className="rounded-lg px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap" style={{ backgroundColor: status.bg, color: status.text }}>
                            {status.label}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className={td}>
                        <p>{report.waste_collected_amount != null ? `${Number(report.waste_collected_amount).toLocaleString("en-US", { maximumFractionDigits: 2 })} ${report.waste_collected_unit}` : "—"}</p>
                        <p className="text-[10px] text-[#94a3b8]">{report.media.length} file{report.media.length === 1 ? "" : "s"}</p>
                      </TableCell>
                      <TableCell className={td}>{filedByName(report)}</TableCell>
                      <TableCell className="flex gap-3">
                        {isInProgress(report) ? (
                          <Button
                            onClick={() => router.push(ROUTES.form(report.report_id))}
                            className="text-xs bg-[#16a34a] hover:bg-[#15803d] text-white cursor-pointer"
                          >
                            <Pencil size={16} className="mr-1" />
                            Continue report
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => router.push(ROUTES.view(report.report_id))}
                              className="text-xs border border-[#1565BC80] bg-[#CDE3DE45] hover:bg-[#b8d5cf45] text-[#122A48] cursor-pointer"
                            >
                              <Eye size={16} className="mr-1" />
                              {report.status === "Ready_To_Verify" ? "Review & verify" : "View"}
                            </Button>
                            {canExport(report) && (
                              <Button
                                onClick={() => (isIOSDevice() ? handleExportReport(report) : setPrintingReport(report))}
                                className="text-xs bg-[#2fd45b] hover:bg-[#28b54e] cursor-pointer"
                              >
                                <FileDown size={16} className="mr-1" />
                                Export
                              </Button>
                            )}
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {fetchError && (
            <div className="flex-1 flex flex-col justify-center items-center gap-3">
              {reportsCache.retrying ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-[#D81010] font-semibold text-base">Retrying...</p>
                </div>
              ) : (
                <>
                  <div className="text-[#D81010] text-center">
                    <p className="font-semibold">Failed to load reports</p>
                    <p className="text-sm">Please try again later</p>
                  </div>
                  <Button onClick={refetchAll} className="cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                </>
              )}
            </div>
          )}

          {!fetchError && filtered.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm">
              <div className="rounded-full bg-[#E5E5E6] p-3"><Radar size={30} color="#727272" /></div>
              <p className="text-[#122A48] font-bold">No reports found</p>
              <p className="text-[#727272] text-xs">
                {reports.length === 0 ? "You haven't filed any reports yet." : "No reports match the selected filters."}
              </p>
            </div>
          )}

          <div className="mt-auto">
            <TablePagination totalItems={totalItems} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
          </div>
        </div>
      </div>

      <Toast toasts={toasts} onRemove={removeToast} />

      {printingReport && <PrintCanalReport report={printingReport} generatedBy={generatedBy} signatoryNames={signatoryNames} />}
    </>
  )
}