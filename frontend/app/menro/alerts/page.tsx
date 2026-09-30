"use client"

// react
import { useEffect, useState, useMemo } from "react"

// auth
import { api } from "@/lib/api"
import { fetchWithAuth } from "@/lib/auth"
import { useWebSocket } from "@/lib/hooks/useWebSocket"

// components
import { TablePagination } from "@/components/TablePagination"
import { usePagination } from "@/components/hooks/usePagination"
import { ALERT_META, ContextRow } from "@/components/Alerts/AlertCard"
import { ALERT_STYLE } from "@/lib/constant"
import { SearchFilter } from "@/components/SearchFilter"
import { AlertsSkeleton } from "@/components/Skeleton/Menro/AlertsSkeleton"
import { usePageCache } from "@/components/hooks/usePageCache"
import { useFillRows } from "@/components/hooks/useFillRows"
import { SpinnerIcon } from "@/components/SpinnerIcon"

// icons
import { Siren, X } from "lucide-react"

// shadcn
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"


type Alert = {
  alert_id: number
  alert_type: string
  node_name: string | null
  barangay_name: string | null
  timestamp: string
  is_read: boolean
  alert_context: Record<string, any> 
}

type Barangay = {
  barangay_id: number
  barangay_name: string
}

const ALERT_TYPES = [
  { value: "All Alert", label: "All" },
  { value: "Water_Level_Rising", label: "Water Level Rising" },
  { value: "Low_Clog_Alert", label: "Low Clog Alert" },
  { value: "Moderate_Clog_Alert", label: "Moderate Clog Alert" },
  { value: "Critical_Clog", label: "Critical Clog" },
]


// always scoped to the MENRO-allowed alert types — barangay/specific-type narrowing happens client-side
const menroTypes = ALERT_TYPES.filter(t => t.value !== 'All Alert').map(t => t.value)

const fetchAlertsForWindow = (window: string) => async (): Promise<Alert[]> => {
  const params = new URLSearchParams()
  params.append('alert_type', menroTypes.join(','))
  params.append('date', window)
  const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts/?${params.toString()}`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchAlertsTodayRaw = fetchAlertsForWindow('Today')
const fetchAlerts7DaysRaw = fetchAlertsForWindow('7Days')
const fetchAlerts30DaysRaw = fetchAlertsForWindow('30Days')

const fetchBarangaysRaw = async (): Promise<Barangay[]> => {
  const data = await api.get('/api/barangays/')
  return data.results ?? data
}


export default function Alerts() {
  // filter states
  const [search, setSearch] = useState<string>('')
  const [barangay, setBarangay] = useState<string>('All Barangay')
  const [alertType, setAlertType] = useState<string>('All Alert')
  const [dateFilter, setDateFilter] = useState<string>('Today')

  const alertsToday = usePageCache('menroAlerts:today', fetchAlertsTodayRaw, [] as Alert[], { autoFetch: false })
  const alerts7Days = usePageCache('menroAlerts:7days', fetchAlerts7DaysRaw, [] as Alert[], { autoFetch: false })
  const alerts30Days = usePageCache('menroAlerts:30days', fetchAlerts30DaysRaw, [] as Alert[], { autoFetch: false })
  const barangaysCache = usePageCache('menroAlerts:barangays', fetchBarangaysRaw, [] as Barangay[], { autoFetch: false })

  const activeAlerts =
    dateFilter === 'Today' ? alertsToday :
    dateFilter === '7Days' ? alerts7Days :
    alerts30Days

  const alerts = activeAlerts.data
  const barangays = barangaysCache.data
  const loading = activeAlerts.loading || barangaysCache.loading
  const fetchError = activeAlerts.error

  // select state
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const filteredAlerts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return alerts.filter(a => {
      if (barangay !== 'All Barangay' && a.barangay_name !== barangays.find(b => String(b.barangay_id) === barangay)?.barangay_name) return false
      if (alertType !== 'All Alert' && a.alert_type !== alertType) return false
      if (q && !(
        a.alert_type.toLowerCase().includes(q) ||
        a.node_name?.toLowerCase().includes(q) ||
        a.barangay_name?.toLowerCase().includes(q)
      )) return false
      return true
    })
  }, [alerts, search, barangay, alertType, barangays])

  const { panelRef, tableWrapRef, rows } = useFillRows({
    rowHeight: 49.3,
    initialRows: 9,
    deps: [loading],
  })

  const { currentPage, setCurrentPage, totalPages, paginated, totalItems, itemsPerPage } = usePagination(filteredAlerts, rows)

  useEffect(() => {
    activeAlerts.refetch()
  }, [dateFilter])

  useEffect(() => {
    barangaysCache.refetch()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, barangay, alertType, dateFilter])

  const handleRowClick = async (alert: Alert) => {
    setSelectedAlert(alert)
    setDialogOpen(true)

    if (alert.is_read) return
    try {
      await api.post(`/api/alerts/${alert.alert_id}/read/`, {})
      activeAlerts.setData(prev => prev.map(a =>
        a.alert_id === alert.alert_id ? { ...a, is_read: true } : a
      ))
    } catch {}
  }

  useWebSocket({
    path: "/ws/alerts/",
    onMessage: (newAlert) => {
      activeAlerts.setData(prev => [newAlert, ...prev])
    },
  })

  if (loading) return <AlertsSkeleton/>

return (
     <>
      <div className="hidden md:flex md:flex-col md:h-full">

        {/* filter container */}
        <div className="flex justify-between">
          {/* search filter */}
          <SearchFilter value={search} onChange={setSearch} placeholder='Search notification...' height="h-9" width="w-100" />

            <div className="flex gap-3">
              {/* barangay filter */}
              <Select value={barangay} onValueChange={setBarangay}>
                <SelectTrigger className="w-40 px-3 py-4 text-xs bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" className='w-40 min-w-0'>
                  <SelectItem className="text-xs" value="All Barangay">All Barangay</SelectItem>
                    {barangays.map(b => (
                      <SelectItem className="text-xs" key={b.barangay_id} value={String(b.barangay_id)}>
                        {b.barangay_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              {/* date filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="text-xs px-3 py-4 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" className='min-w-0'>
                  <SelectItem className="p-2 text-xs text-[#122A48]" value="Today">Today</SelectItem>
                  <SelectItem className="p-2 text-xs text-[#122A48]" value="7Days">Last 7 days</SelectItem>
                  <SelectItem className="p-2 text-xs text-[#122A48]" value="30Days">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </div>

        {/* notif list container */}
        <div ref={panelRef} className="bg-[#F8F9FA] rounded-lg mt-2 shadow-[0_0_8px_rgba(0,0,0,0.15)] flex flex-col flex-1 min-h-[604px]">
          <div className="flex w-full p-3 items-center justify-between flex-wrap gap-2">
            <p className="text-[#122A48] font-semibold">Notifications</p>
            <div className="flex gap-2 flex-wrap">
              {ALERT_TYPES.map(t => (
                <Button
                  key={t.value}
                  onClick={() => setAlertType(t.value)}
                  className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-medium transition-colors
                    ${alertType === t.value
                      ? "bg-[#1565BC] hover:bg-[#135aa6] text-white"
                      : "bg-transparent text-[#122A48] border-[#C6C6C8] hover:bg-[#c3dffe]"
                    }`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>

          <hr />

          {/* alert table */}
          <div ref={tableWrapRef}>
            <Table>
              <TableHeader className='bg-[#e8eef1b4] border border-[#CFD8DC] h-12'>
                <TableRow>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>NODE</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>TYPE</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>BARANGAY</TableHead>
                  <TableHead className='font-semibold text-left text-xs text-[#727272]'>DETECTED</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {!fetchError && filteredAlerts.length > 0 && (
                  paginated.map(alert => {
                    const meta = ALERT_META[alert.alert_type] ?? { label: alert.alert_type.replace(/_/g, " "), Icon: null }
                    const style = ALERT_STYLE[alert.alert_type] ?? ALERT_STYLE.default
                    return (
                      <TableRow
                        key={alert.alert_id}
                        className={`border-b border-[#C6C6C8] cursor-pointer ${alert.is_read ? "opacity-60" : ""} hover:bg-[#f5f5f5]`}
                        onClick={() => handleRowClick(alert)}
                      >
                        <TableCell className="text-[#122A48] text-left h-[49.3px] text-xs">{alert.node_name ?? "—"}</TableCell>
                        <TableCell className="text-left h-[49.3px] text-xs">
                          <span className={`inline-flex items-center gap-1.5 px-2 text-[11px] py-1 rounded-full font-semibold ${style.icon}`}>
                            {meta.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#122A48] text-left h-[49.3px] text-xs">{alert.barangay_name ?? "—"}</TableCell>
                        <TableCell className="text-[#122A48] text-left h-[49.3px] text-xs">
                          {new Date(alert.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {fetchError && (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              {activeAlerts.retrying ? (
                <div className="flex flex-col items-center gap-3">
                  <SpinnerIcon size={32} color="#D81010" />
                  <p className="text-[#D81010] font-semibold text-sm">Retrying...</p>
                </div>
              ) : (
                <>
                  <div className="text-[#D81010] text-center">
                    <p className="font-semibold">Failed to load alerts</p>
                    <p className="text-sm">Please try again later</p>
                  </div>
                  <Button onClick={() => activeAlerts.refetch()} className="text-sm cursor-pointer bg-transparent rounded-lg border border-[#D81010] text-[#D81010] px-3 py-2 hover:bg-gray-100">Retry</Button>
                </>
              )}
            </div>
          )}

          {!fetchError && filteredAlerts.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-1">
              <div className="rounded-full bg-[#E5E5E6] p-4 my-2">
                <Siren size={30} color="#727272" />
              </div>
              <p className="text-[#122A48] font-bold text-sm">No alerts today</p>
              <p className="text-[#727272] text-xs">
                No alerts have been added today.
              </p>
            </div>
          )}

          {/* pagination */}
          <div className="mt-auto">
            {!fetchError && alerts.length > 0 && (
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

      {/* Alert Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="[&>button]:hidden text-[#122A48] w-[380px]">
          {selectedAlert && (() => {
            const meta = ALERT_META[selectedAlert.alert_type] ?? { label: selectedAlert.alert_type.replace(/_/g, " "), Icon: null }
            const style = ALERT_STYLE[selectedAlert.alert_type] ?? ALERT_STYLE.default
            const Icon = meta.Icon
            return (
              <>
                <DialogHeader>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${style.icon}`}>
                        {Icon && <Icon size={16} />}
                      </div>
                      <p className="font-bold text-sm">{meta.label}</p>
                    </div>
                    <button onClick={() => setDialogOpen(false)} className="cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                </DialogHeader>

                <DialogTitle className="sr-only">Alert Details</DialogTitle>
                <hr />

                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <p className="text-[#727272]">Node</p>
                    <p className="font-medium">{selectedAlert.node_name ?? "—"}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-[#727272]">Barangay</p>
                    <p className="font-medium">{selectedAlert.barangay_name ?? "—"}</p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-[#727272]">Detected</p>
                    <p className="font-medium">
                      {new Date(selectedAlert.timestamp).toLocaleString("en-PH", {
                        month: "short", day: "numeric", year: "numeric",
                        hour: "2-digit", minute: "2-digit", hour12: true
                      })}
                    </p>
                  </div>

                  <hr />
                  <p className="font-semibold text-xs text-[#727272]">DETAILS</p>
                  <ContextRow alertType={selectedAlert.alert_type} ctx={selectedAlert.alert_context} />
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
     
     </>
   )
 }
