"use client"

// react
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

// icons
import { Check, ChevronDown, Siren } from "lucide-react"

// shadcn
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// auth / lib
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { ALERT_STYLE } from "@/lib/constant"
import { rangeQuery, toISODate } from "@/lib/dateRange"
import { usePageCache } from "@/components/hooks/usePageCache"
import { usePagination } from "@/components/hooks/usePagination"
import { useFillRows } from "@/components/hooks/useFillRows"
import { usePolling } from "@/components/hooks/usePolling"

import { ALERT_META, type Alert } from "@/components/Alerts/AlertCard"
import { AlertDetailDialog } from "@/components/Alerts/AlertDetailDialog"
import { SearchFilter } from "@/components/SearchFilter"
import { DateRangeFilter } from "@/components/DateRangeFilter"
import { TablePagination } from "@/components/TablePagination"
import { SpinnerIcon } from "@/components/SpinnerIcon"

type FilterOption = { value: string; label: string; types: string[] | null }
type FilterGroup = { key: string; label: string; types?: string[] | null; options?: FilterOption[] }

const FILTER_GROUPS: FilterGroup[] = [
  { key: "All", label: "All", types: null },
  { key: "Water_Level_Rising", label: "Water Level Rising", types: ["Water_Level_Rising"] },
  {
    key: "Clog", label: "Clog",
    options: [
      { value: "Clog:all",            label: "All Clog", types: ["Low_Clog_Alert", "Moderate_Clog_Alert", "Critical_Clog"] },
      { value: "Low_Clog_Alert",      label: "Low Clog",      types: ["Low_Clog_Alert"] },
      { value: "Moderate_Clog_Alert", label: "Moderate Clog", types: ["Moderate_Clog_Alert"] },
      { value: "Critical_Clog",       label: "Critical Clog", types: ["Critical_Clog"] },
    ],
  },
  {
    key: "NodeHealth", label: "Node Health",
    options: [
      { value: "NodeHealth:all", label: "All Node Health", types: ["Node_Offline", "Low_Battery", "Weak_Signal", "Sensor_Failure"] },
      { value: "Node_Offline",   label: "Node Offline",    types: ["Node_Offline"] },
      { value: "Low_Battery",    label: "Low Battery",     types: ["Low_Battery"] },
      { value: "Weak_Signal",    label: "Weak Signal",     types: ["Weak_Signal"] },
      { value: "Sensor_Failure", label: "Sensor Failure",  types: ["Sensor_Failure"] },
    ],
  },
  {
    key: "Reports", label: "Reports",
    options: [
      { value: "Reports:all",     label: "All Reports", types: ["Report_Due_Soon", "Report_Overdue"] },
      { value: "Report_Due_Soon", label: "Due Soon",    types: ["Report_Due_Soon"] },
      { value: "Report_Overdue",  label: "Overdue",     types: ["Report_Overdue"] },
    ],
  },
  {
    key: "Notices", label: "Notices",
    options: [
      { value: "Notices:all",             label: "All Notices",         types: ["Node_Inspection_Request", "Waste_Type_Approved", "Waste_Type_Rejected"] },
      { value: "Node_Inspection_Request", label: "Inspection Request",  types: ["Node_Inspection_Request"] },
      { value: "Waste_Type_Approved",     label: "Waste Type Approved", types: ["Waste_Type_Approved"] },
      { value: "Waste_Type_Rejected",     label: "Waste Type Rejected", types: ["Waste_Type_Rejected"] },
    ],
  },
]

// the alert types a selected filter value stands for (null = everything)
const typesFor = (value: string): string[] | null => {
  for (const g of FILTER_GROUPS) {
    if (g.key === value && !g.options) return g.types ?? null
    const opt = g.options?.find(o => o.value === value)
    if (opt) return opt.types
  }
  return null
}

const chipClass = (active: boolean) =>
  `cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-[#1565BC] bg-[#1565BC] text-white hover:bg-[#135aa6]"
      : "border-[#C6C6C8] bg-transparent text-[#122A48] hover:bg-[#c3dffe]"
  }`

function FilterDropdown({ group, value, onChange }: { group: FilterGroup; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const options = group.options ?? []
  const selected = options.find(o => o.value === value)

  // close when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const isAllOption = selected && selected.value === options[0].value
  const label = selected && !isAllOption ? `${group.label}: ${selected.label}` : group.label

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className={`${chipClass(!!selected)} flex items-center gap-1.5`}>
        {label}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[170px] rounded-lg border border-[#C6C6C8] bg-white p-1 shadow-lg">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-xs text-[#122A48] hover:bg-[#c3dffe] ${
                o.value === value ? "font-semibold" : ""
              }`}
            >
              {o.label}
              {o.value === value && <Check size={13} className="text-[#1565BC]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const labelOf = (type: string) => ALERT_META[type]?.label ?? type.replace(/_/g, " ")

const formatDetected = (ts: string) =>
  new Date(ts).toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })

const fetchAlertsRange = async (from: string, to: string): Promise<Alert[]> => {
  const list: Alert[] = []
  let endpoint: string | null = `/api/alerts/?${rangeQuery(from, to)}&page_size=100`
  for (let i = 0; endpoint && i < 50; i++) {
    const data = await api.get(endpoint)
    if (Array.isArray(data)) { list.push(...data); break }
    list.push(...(data.results ?? []))
    if (data.next) {
      const next = new URL(data.next, window.location.origin)
      endpoint = next.pathname + next.search
    } else {
      endpoint = null
    }
  }
  return list.filter(a => a.alert_type !== "Report_Submitted")
}

function AlertsContent() {
  // filter states
  const [search, setSearch] = useState("")
  const [chip, setChip] = useState("All")
  // date range: opens on today; clearing it goes back to today instead of loading every alert
  const [startDate, setStartDate] = useState(() => toISODate(new Date()))
  const [endDate, setEndDate] = useState(() => toISODate(new Date()))

  const handleRangeChange = (from: string, to: string) => {
    const today = toISODate(new Date())
    setStartDate(from || to ? from : today)
    setEndDate(from || to ? to : today)
  }

  // cached per range
  const alertsCache = usePageCache(
    `barangayAlerts:${startDate}:${endDate}`,
    () => fetchAlertsRange(startDate, endDate),
    [] as Alert[],
    { autoFetch: false }
  )
  const alerts = alertsCache.data
  const loading = alertsCache.loading
  const fetchError = alertsCache.error

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase()
    const types = typesFor(chip)
    return alerts.filter(a => {
      if (types && !types.includes(a.alert_type)) return false
      if (q && !(
        labelOf(a.alert_type).toLowerCase().includes(q) ||
        a.alert_type.replace(/_/g, " ").toLowerCase().includes(q) ||
        a.node_name?.toLowerCase().includes(q) ||
        a.barangay_name?.toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [alerts, search, chip])

  const { panelRef, tableWrapRef, rows } = useFillRows({ rowHeight: 49.3, initialRows: 9, deps: [loading] })
  const { currentPage, setCurrentPage, totalPages, paginated, totalItems, itemsPerPage } = usePagination(filteredAlerts, rows)

  useEffect(() => { setCurrentPage(1) }, [search, chip, startDate, endDate])
  useEffect(() => { alertsCache.refetch() }, [startDate, endDate])
  usePolling(async () => { await alertsCache.refetch() }, 30000)

  const markRead = async (alert: Alert) => {
    if (alert.is_read) return
    try {
      await api.post(`/api/alerts/${alert.alert_id}/read/`, {})
      alertsCache.setData(prev => prev.map(a => a.alert_id === alert.alert_id ? { ...a, is_read: true } : a))
    } catch {}
  }

  const handleRowClick = (alert: Alert) => {
    setSelectedAlert(alert)
    setDialogOpen(true)
    markRead(alert)
  }

  // open a specific alert when linked from a notification
  const alertId = useSearchParams().get("alertId")
  const openedRef = useRef<string | null>(null)
  useEffect(() => {
    if (!alertId || loading || openedRef.current === alertId) return
    const match = alerts.find(a => String(a.alert_id) === alertId)
    if (match) {
      openedRef.current = alertId
      handleRowClick(match)
    }
  }, [alertId, loading, alerts])

  // live alerts: only this barangay's, and only ones inside the selected range
  useWebSocket({
    path: "/ws/alerts/",
    onMessage: (incoming: Alert & { barangay_id?: number | null }) => {
      if (incoming.alert_type === "Report_Submitted") return
      const user = getUser() as { barangay_id?: number | null } | null
      if (incoming.barangay_id != null && user?.barangay_id != null && incoming.barangay_id !== user.barangay_id) return
      const day = toISODate(new Date(incoming.timestamp))
      if ((startDate && day < startDate) || (endDate && day > endDate)) return
      alertsCache.setData(prev => prev.some(a => a.alert_id === incoming.alert_id) ? prev : [incoming, ...prev])
    },
  })

  return (
    <>
      <div className="flex h-full flex-col">
        {/* filter container */}
        <div className="flex justify-between">
          <SearchFilter value={search} onChange={setSearch} placeholder="Search notification..." height="h-9" width="w-100" />
          <DateRangeFilter from={startDate} to={endDate} onChange={handleRangeChange} align="right" width="w-[210px]" />
        </div>

        {/* notif list container */}
        <div ref={panelRef} className="mt-2 flex min-h-[604px] flex-1 flex-col rounded-lg bg-[#F8F9FA] shadow-[0_0_8px_rgba(0,0,0,0.15)]">
          <div className="flex w-full flex-wrap items-center justify-between gap-2 p-3">
            <p className="font-semibold text-[#122A48]">Notifications</p>
            <div className="flex flex-wrap gap-2">
              {FILTER_GROUPS.map(g =>
                g.options ? (
                  <FilterDropdown key={g.key} group={g} value={chip} onChange={setChip} />
                ) : (
                  <Button key={g.key} onClick={() => setChip(g.key)} className={chipClass(chip === g.key)}>
                    {g.label}
                  </Button>
                )
              )}
            </div>
          </div>

          <hr />

          {/* alert table */}
          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className="h-12 border border-[#CFD8DC] bg-[#e8eef1b4]">
                <TableRow>
                  <TableHead className="text-left text-xs font-semibold text-[#727272]">NODE</TableHead>
                  <TableHead className="text-left text-xs font-semibold text-[#727272]">TYPE</TableHead>
                  <TableHead className="text-left text-xs font-semibold text-[#727272]">BARANGAY</TableHead>
                  <TableHead className="text-left text-xs font-semibold text-[#727272]">DETECTED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!loading && !fetchError && paginated.map(alert => {
                  const style = ALERT_STYLE[alert.alert_type] ?? ALERT_STYLE.default
                  return (
                    <TableRow
                      key={alert.alert_id}
                      onClick={() => handleRowClick(alert)}
                      className={`cursor-pointer border-b border-[#C6C6C8] hover:bg-[#f5f5f5] ${alert.is_read ? "opacity-60" : ""}`}
                    >
                      <TableCell className="h-[49.3px] text-left text-xs text-[#122A48]">{alert.node_name ?? "—"}</TableCell>
                      <TableCell className="h-[49.3px] text-left text-xs">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${style.icon}`}>
                          {labelOf(alert.alert_type)}
                        </span>
                      </TableCell>
                      <TableCell className="h-[49.3px] text-left text-xs text-[#122A48]">{alert.barangay_name ?? "—"}</TableCell>
                      <TableCell className="h-[49.3px] text-left text-xs text-[#122A48]">{formatDetected(alert.timestamp)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* loading */}
          {loading && !fetchError && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <SpinnerIcon size={32} color="#1565BC" />
              <p className="text-sm text-[#727272]">Loading alerts...</p>
            </div>
          )}

          {/* error */}
          {fetchError && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              {alertsCache.retrying ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-sm font-semibold text-[#D81010]">Retrying...</p>
                </div>
              ) : (
                <>
                  <div className="text-center text-[#D81010]">
                    <p className="font-semibold">Failed to load alerts</p>
                    <p className="text-sm">Please try again later</p>
                  </div>
                  <Button
                    onClick={() => alertsCache.refetch()}
                    className="cursor-pointer rounded-lg border border-[#D81010] bg-transparent px-3 py-2 text-sm text-[#D81010] hover:bg-gray-100"
                  >
                    Retry
                  </Button>
                </>
              )}
            </div>
          )}

          {/* empty */}
          {!loading && !fetchError && filteredAlerts.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-1">
              <div className="my-2 rounded-full bg-[#E5E5E6] p-4">
                <Siren size={30} color="#727272" />
              </div>
              <p className="text-sm font-bold text-[#122A48]">No alerts found</p>
              <p className="text-xs text-[#727272]">No alerts match this date range or filter.</p>
            </div>
          )}

          {/* pagination */}
          <div className="mt-auto">
            {!loading && !fetchError && filteredAlerts.length > 0 && (
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

      <AlertDetailDialog alert={selectedAlert} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}

export default function AlertsPage() {
  return (
    <Suspense>
      <AlertsContent />
    </Suspense>
  )
}