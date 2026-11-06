"use client"

// icons
import { FileDown, Radar, FileSearch, ClipboardCheck, CheckCircle2, TriangleAlert, History, FileText } from "lucide-react"

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
import { useRouter } from "next/navigation"

// shadcn
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table"

// table pagination
import { usePagination } from "@/components/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

// auth
import { PersonnelField, PersonnelDialog, namesFromText, namesToText } from "@/components/CanalReports/PersonnelPicker"
import { fetchWithAuth } from "@/lib/auth"
import { api } from "@/lib/api"
import { ROUTES } from "@/lib/canalReportRoutes"

// lib
import { usePageCache } from "@/components/hooks/usePageCache"
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { exportOrPrint } from "@/lib/exportOrPrint"
import { getUser } from "@/lib/auth"
import { clogSeverityLabel } from '@/lib/clogSeverity'
import { currentMonthRange, rangeQuery, toISODate } from "@/lib/dateRange"


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
  barangay: number | null
  responded_at: string | null
  reopened_at?: string | null
  previous_responded_at?: string | null
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
          {(clog.responded_at ?? clog.resolved_at) && <Row label="Responded At" value={fmtDateTime(clog.responded_at ?? clog.resolved_at)} />}
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

// ---------- status pill (same colours as the mobile app) ----------
const STATUS_PILL: Record<string, string> = {
  Detected:  'bg-[#FEE2E2] text-[#D81010]',
  Responded: 'bg-[#E0F2FE] text-[#1565BC]',
  Cleared:   'bg-[#E7F7EE] text-[#1F9D55]',
}
const STATUS_DOT: Record<string, string> = {
  Detected: 'bg-[#D81010]', Responded: 'bg-[#1565BC]', Cleared: 'bg-[#1F9D55]',
}
function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_PILL[status] ?? STATUS_PILL.Detected}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] ?? STATUS_DOT.Detected}`} />
      {status}
    </span>
  )
}

// shown on a clog event that came back because its report was voided
function ReopenedNotice({ status, compact }: { status: string; compact?: boolean }) {
  if (compact) {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
        <History size={11} /> Re-detected
      </span>
    )
  }
  return (
    <div className="mx-4 flex gap-2 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[11px] leading-4 text-[#92400E]">
      <History size={15} className="mt-0.5 shrink-0" />
      <p>
        {status === 'Detected'
          ? 'This is not a new clog event. It was detected again because its earlier report was voided. Respond to it again to make a new report.'
          : 'This clog event was reported again. Its earlier report was voided.'}
      </p>
    </div>
  )
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
const firstError = (v: unknown): string | undefined =>
  Array.isArray(v) ? String(v[0]) : typeof v === 'string' ? v : undefined

// Pre-report: the response details. Saving it marks the event as responded and starts the report.
function ResponseDialog({ event, open, onClose, onSaved, onContinue }: {
  event: Clogs | null
  open: boolean
  onClose: () => void
  onSaved: (event: Clogs) => void
  onContinue: (reportId: number) => void
}) {
  const [when, setWhen] = useState('')
  const [personnel, setPersonnel] = useState('')
  const [personnelOpen, setPersonnelOpen] = useState(false)
  const [action, setAction] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ when?: string; personnel?: string; action?: string; general?: string }>({})
  const [reportId, setReportId] = useState<number | null>(null)

  // a fresh form every time it opens (a re-detected event starts at the original response time)
  useEffect(() => {
    if (!open || !event) return
    setPersonnel(''); setPersonnelOpen(false); setAction(''); setErrors({}); setReportId(null); setSaving(false)
    setWhen(toLocalInput(new Date(event.previous_responded_at ?? Date.now())))
  }, [open, event?.event_id])

  if (!event) return null
  const saved = reportId !== null
  const clearError = (k: 'when' | 'personnel' | 'action') => setErrors(p => ({ ...p, [k]: undefined, general: undefined }))

  const submit = async () => {
    const e: typeof errors = {}
    const t = new Date(when).getTime()
    if (!personnel.trim()) e.personnel = 'List the personnel assigned to the response.'
    if (!action.trim()) e.action = 'Describe the action to be taken.'
    if (isNaN(t)) e.when = 'Enter the date and time of the response.'
    else if (t < new Date(event.detected_at).getTime()) e.when = "The response time can't be before the clog was detected."
    else if (t > Date.now() + 2 * 60 * 1000) e.when = "The response time can't be in the future."
    setErrors(e)
    if (Object.keys(e).length) return

    setSaving(true)
    try {
      const res = await api.post(`/api/clog-events/${event.event_id}/respond/`, {
        assigned_personnel: personnel.trim(),
        action_taken: action.trim(),
        responded_at: new Date(when).toISOString(),
      })
      onSaved(res.event)
      setReportId(res.report_id)
    } catch (err: any) {
      const fieldMsg = firstError(err?.assigned_personnel) || firstError(err?.action_taken) || firstError(err?.responded_at)
      setErrors({
        personnel: firstError(err?.assigned_personnel),
        action: firstError(err?.action_taken),
        when: firstError(err?.responded_at),
        general: err?.error ?? err?.detail ?? (fieldMsg ? undefined : 'Could not save the response. Please try again.'),
      })
    } finally {
      setSaving(false)
    }
  }

  const input = (bad?: string) =>
    `w-full rounded-lg border-2 bg-white px-3 py-2 text-sm text-[#122A48] outline-none focus:border-[#1565BC] ${bad ? 'border-[#D81010]' : 'border-[#C6C6C8]'}`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose() }}>
      <DialogContent className="max-w-md rounded-2xl p-5 text-[#122A48]">
        {saved ? (
          <>
            <DialogHeader className="items-center text-center">
              <div className="mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-[#E7F7EE]">
                <CheckCircle2 size={30} color="#1F9D55" />
              </div>
              <DialogTitle className="text-base font-bold">Response recorded</DialogTitle>
              <DialogDescription className="text-xs leading-5 text-[#64748B]">
                The clog event is now marked as responded. Continue to the report now, or come back to it later from this event or the Barangay Reports page.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Button onClick={() => onContinue(reportId!)} className="w-full cursor-pointer bg-[#1F9D55] py-5 font-bold text-white hover:bg-[#188046]">
                Continue to Report
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full cursor-pointer border-[#E2E8F0] py-5 font-semibold text-[#475569]">
                Later
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Response Details</DialogTitle>
              <DialogDescription className="text-[11px] leading-4 text-[#94A3B8]">
                Nothing is saved until you submit. Responding also marks this clog event as cleared.
              </DialogDescription>
            </DialogHeader>

            {event.reopened_at && <div className="-mx-4"><ReopenedNotice status="Detected" /></div>}

            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#64748B]">DATE &amp; TIME RESPONDED *</label>
                <input
                  type="datetime-local" value={when} disabled={saving}
                  min={toLocalInput(new Date(event.detected_at))} max={toLocalInput(new Date())}
                  onChange={e => { setWhen(e.target.value); clearError('when') }}
                  className={input(errors.when)}
                />
                <p className={`mt-1 text-[11px] ${errors.when ? 'text-[#D81010]' : 'text-[#94A3B8]'}`}>
                  {errors.when ?? (event.reopened_at && event.previous_responded_at
                    ? 'Starts at your original response time. Change it if that was wrong.'
                    : 'Change this if you responded earlier than now.')}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#64748B]">ASSIGNED PERSONNEL *</label>
                <PersonnelField
                  names={namesFromText(personnel)} disabled={saving} error={errors.personnel}
                  onRemove={n => { setPersonnel(namesToText(namesFromText(personnel).filter(x => x !== n))); clearError('personnel') }}
                  onOpen={() => setPersonnelOpen(true)}
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold text-[#64748B]">ACTION TAKEN *</label>
                <textarea
                  rows={4} maxLength={2000} value={action} disabled={saving}
                  onChange={e => { setAction(e.target.value); clearError('action') }}
                  placeholder="e.g. Manual clearing of plastic waste at the canal inlet"
                  className={input(errors.action)}
                />
                {errors.action && <p className="mt-1 text-[11px] text-[#D81010]">{errors.action}</p>}
              </div>

              {errors.general && <p className="text-center text-xs font-medium text-[#D81010]">{errors.general}</p>}

              <div className="mt-1 flex gap-3">
                <Button variant="outline" onClick={onClose} disabled={saving} className="flex-1 cursor-pointer border-[#E2E8F0] font-semibold text-[#475569]">
                  Cancel
                </Button>
                <Button onClick={submit} disabled={saving} className="flex-1 cursor-pointer bg-[#122A48] font-semibold text-white hover:bg-[#0d1f36]">
                  {saving ? 'Submitting...' : 'Submit Response'}
                </Button>
              </div>
            </div>
          </>
        )}
      <PersonnelDialog
          open={personnelOpen} names={namesFromText(personnel)}
          onChange={n => { setPersonnel(namesToText(n)); clearError('personnel') }}
          onClose={() => setPersonnelOpen(false)}
        />
      </DialogContent>
    </Dialog>
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

  const router = useRouter()
  const [respondOpen, setRespondOpen] = useState(false)
  const [openingReport, setOpeningReport] = useState(false)

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

  // summary cards: same four counts as the mobile app (everything in the selected date range)
  const totalCount = clogs.length
  const detectedCount = clogs.filter(n => n.status === 'Detected').length
  const respondedCount = clogs.filter(n => n.status === 'Responded').length
  const resolvedCount = clogs.filter(n => n.status === 'Cleared').length

  // the response was saved: show the new status everywhere right away
  const applyEvent = (updated: Clogs) => {
    clogsCache.setData(prev => prev.map(c => (c.event_id === updated.event_id ? updated : c)))
    setSelectedClog(cur => (cur && cur.event_id === updated.event_id ? updated : cur))
  }

  // "Complete Report": open the report this event already has (never make a second one)
  const openReportFor = async (event: Clogs) => {
    setOpeningReport(true)
    try {
      const res = await api.get('/api/canal-reports/mine/')
      const list: { report_id: number; clog_event: number | null; status: string; is_submitted: boolean }[] = res.results ?? res
      const existing = Array.isArray(list)
        ? list.find(r => r.clog_event === event.event_id && r.status !== 'Voided')
        : null
      if (!existing) {
        addToast('No report was found for this event yet. Please try again.', 'error')
      } else if (existing.is_submitted || ['Ready_To_Verify', 'Verified'].includes(existing.status)) {
        router.push(ROUTES.view(existing.report_id))   // finished: review / verify there
      } else {
        router.push(ROUTES.form(existing.report_id))   // still needs the post-report
      }
    } catch (err: any) {
      addToast(err?.detail ?? err?.error ?? 'Could not open the report. Please try again.', 'error')
    } finally {
      setOpeningReport(false)
    }
  }

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
    onMessage: (incoming: Clogs) => {
      // only this barangay's events
      const user = getUser() as { barangay_id?: number | null } | null
      if (user?.barangay_id != null && incoming.barangay != null && incoming.barangay !== user.barangay_id) return

      clogsCache.setData(prev => {
        // an update to an event we already have (e.g. it was just responded to): replace it
        if (prev.some(c => c.event_id === incoming.event_id)) {
          return prev.map(c => (c.event_id === incoming.event_id ? incoming : c))
        }
        // a new event: only add it if it falls inside the selected date range
        const day = toISODate(new Date(incoming.detected_at))
        if ((startDate && day < startDate) || (endDate && day > endDate)) return prev
        return [incoming, ...prev]
      })
      setSelectedClog(cur => (cur && cur.event_id === incoming.event_id ? incoming : cur))
    },
  })

  if (loading) return <ClogEventsSkeleton/>


  return (
    <>
      <div className="hidden md:flex md:flex-col md:min-h-full">
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
            { icon: <Radar size={20} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", count: totalCount, label: "Total Events" },
            { icon: <TriangleAlert size={20} color="#D81010" />, bg: "bg-[#FFE5E5]", count: detectedCount, label: "Detected (awaiting response)" },
            { icon: <ClipboardCheck size={20} color="#1565BC" />, bg: "bg-[#1565BC29]", count: respondedCount, label: "Responded" },
            { icon: <CheckCircle2 size={20} color="#1F9D55" />, bg: "bg-[#E7F7EE]", count: resolvedCount, label: "Resolved" },
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
        <div className="flex gap-3 mt-3 flex-1 min-h-[900px]">

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
                        <div className="flex flex-col items-start">
                          <StatusPill status={clog.status} />
                          {clog.reopened_at && clog.status === 'Detected' && <ReopenedNotice status="Detected" compact />}
                        </div>
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
        <div className="relative border border-[#C6C6C8] rounded-lg bg-[#F8F9FA] flex-1 min-w-[240px]">
          <div className="absolute inset-0 overflow-y-auto pb-4">
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

              {/* what to do with this event (same steps as the mobile app) */}
              {(selectedClog.status !== 'Cleared' || selectedClog.responded_at) ? (
                <div className="px-4">
                  {selectedClog.status === 'Detected' && (
                    <Button onClick={() => setRespondOpen(true)} className="w-full cursor-pointer bg-[#122A48] font-semibold text-white hover:bg-[#0d1f36]">
                      Mark as Responded
                    </Button>
                  )}
                  {(selectedClog.status === 'Responded' || selectedClog.status === 'Cleared') && (
                    <Button
                      onClick={() => openReportFor(selectedClog)}
                      disabled={openingReport}
                      className="w-full cursor-pointer bg-[#1F9D55] font-bold text-white hover:bg-[#188046]"
                    >
                      <FileText size={16} className="mr-1" />
                      {openingReport ? 'Opening...' : selectedClog.status === 'Responded' ? 'Complete Report' : 'View Report'}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="px-4 text-center text-[11px] text-[#94A3B8]">
                  This event cleared on its own, so no response report is needed.
                </p>
              )}

              {selectedClog.reopened_at && <ReopenedNotice status={selectedClog.status} />}

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
                  <StatusPill status={selectedClog.status} />
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

        </div>
        <Toast toasts={toasts} onRemove={removeToast} />

        <ResponseDialog
          event={selectedClog}
          open={respondOpen}
          onClose={() => setRespondOpen(false)}
          onSaved={applyEvent}
          onContinue={(reportId) => { setRespondOpen(false); router.push(ROUTES.form(reportId)) }}
        />

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