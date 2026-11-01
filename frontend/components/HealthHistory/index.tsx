"use client"

import { useEffect, useRef, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/TablePagination"
import { useWebSocket } from "@/lib/hooks/useWebSocket"
import { fetchWithAuth } from "@/lib/auth"


type CacheEntry = { logs: HealthLog[]; total: number }
const historyCache = new Map<string, CacheEntry>()
const DEFAULT_KEY = `all|all|all|||1`   // barangay|node|status|from|to|page

type HealthLog = {
  health_id: number
  node_details: {
    node_id: number
    node_name: string
    barangay_details?: { barangay_id: number; barangay_name: string } | null
  }
  battery_voltage: number | null
  signal_strength: number | null
  sensor_continuity: boolean | null
  status: string
  firmware_version: string | null
  checked_at: string
}

type Props = {
  barangays?: { barangay_id: number; barangay_name: string }[]
  nodes: { node_id: number; node_name: string }[]
}


const PAGE_SIZE = 10
const ALL = "all"

const STATUS_BADGE: Record<string, string> = {
  Normal: "bg-[#B2FBC173] text-[#2C7B3C]",
  Warning: "bg-[#F4E4A7] text-[#B58F00]",
  Critical: "bg-[#FFE5E5] text-[#D81010]",
}

const triggerClass =
  "text-xs cursor-pointer px-3 py-[13px] bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium"
const itemClass = "text-xs cursor-pointer p-2 text-[#122A48]"
const dateClass =
  "h-8 border-2 border-[#C6C6C8] rounded-lg px-2 text-xs outline-none text-[#122A48] cursor-pointer bg-white"

const batteryPct = (v: number) =>
  Math.min(100, Math.max(0, Math.round(((v - 3.0) / (4.2 - 3.0)) * 100)))

export function HealthHistoryTable({ barangays, nodes }: Props) {
  const [logs, setLogs] = useState<HealthLog[]>(() => historyCache.get(DEFAULT_KEY)?.logs ?? [])
  const [total, setTotal] = useState(() => historyCache.get(DEFAULT_KEY)?.total ?? 0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(() => !historyCache.has(DEFAULT_KEY))
  const [error, setError] = useState(false)

  const [barangay, setBarangay] = useState(ALL)
  const [node, setNode] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const reqRef = useRef(0) // ignore out-of-order responses

  const cacheKey = `${barangay}|${node}|${status}|${from}|${to}|${page}`

  useEffect(() => {
    const req = ++reqRef.current
    const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
    if (barangay !== ALL) params.set("barangay", barangay)
    if (node !== ALL) params.set("node", node)
    if (status !== ALL) params.set("status", status)
    if (from) params.set("from", from)
    if (to) params.set("to", to)

    const hit = historyCache.get(cacheKey)
    if (hit) { setLogs(hit.logs); setTotal(hit.total); setLoading(false) }  // instant
    else setLoading(true)
    setError(false)
    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/system-health/history/?${params}`)
      .then(async res => {
        if (!res.ok) throw new Error()
        const data = await res.json()
        const entry = { logs: data.results ?? [], total: data.count ?? 0 }
        historyCache.set(cacheKey, entry)          // keep for next time
        if (req !== reqRef.current) return
        setLogs(entry.logs)
        setTotal(entry.total)
      })
      .catch(() => { if (req === reqRef.current) setError(true) })
      .finally(() => { if (req === reqRef.current) setLoading(false) })
  }, [page, barangay, node, status, from, to])

  // always-fresh copies for the socket handler
  const logsRef = useRef(logs);   logsRef.current = logs
  const totalRef = useRef(total); totalRef.current = total

  useWebSocket({
    path: "/ws/node-health/",
    onMessage: (log: HealthLog) => {
      if (log?.health_id == null) return
      if (logsRef.current.some(l => l.health_id === log.health_id)) return

      if (barangay !== ALL && String(log.node_details.barangay_details?.barangay_id) !== barangay) return
      if (node !== ALL && String(log.node_details.node_id) !== node) return
      if (status !== ALL && log.status !== status) return
      const day = new Date(log.checked_at).toLocaleDateString("en-CA")
      if (from && day < from) return
      if (to && day > to) return

      const nextTotal = totalRef.current + 1
      setTotal(nextTotal)
      historyCache.clear()
      if (page === 1) {
        const next = [log, ...logsRef.current].slice(0, PAGE_SIZE)
        setLogs(next)
        historyCache.set(cacheKey, { logs: next, total: nextTotal })
      }
    },
  })

  // any filter change goes back to page 1
  const onFilter = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1) }

  return (
    <div className="mt-3 bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg flex flex-col mb-3 min-h-[620px]">
      <div className="pl-2 p-1 py-2 flex flex-wrap items-center gap-3 border-b border-[#C6C6C8]">
        <p className="font-bold text-[#122A48] text-sm mr-auto">Sensor Nodes Health History</p>

        {barangays && (
          <Select value={barangay} onValueChange={onFilter(setBarangay)}>
          <SelectTrigger className={triggerClass}><SelectValue /></SelectTrigger>
          <SelectContent position="popper" className="min-w-0">
            <SelectItem className={itemClass} value={ALL}>All Barangay</SelectItem>
            {barangays.map(b => (
              <SelectItem key={b.barangay_id} className={itemClass} value={String(b.barangay_id)}>{b.barangay_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        )}

        <Select value={node} onValueChange={onFilter(setNode)}>
          <SelectTrigger className={triggerClass}><SelectValue /></SelectTrigger>
          <SelectContent position="popper" className="min-w-0">
            <SelectItem className={itemClass} value={ALL}>All Nodes</SelectItem>
            {nodes.map(n => (
              <SelectItem key={n.node_id} className={itemClass} value={String(n.node_id)}>{n.node_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={onFilter(setStatus)}>
          <SelectTrigger className={triggerClass}><SelectValue /></SelectTrigger>
          <SelectContent position="popper" className="min-w-0">
            <SelectItem className={itemClass} value={ALL}>All Status</SelectItem>
            <SelectItem className={itemClass} value="Normal">Normal</SelectItem>
            <SelectItem className={itemClass} value="Warning">Warning</SelectItem>
            <SelectItem className={itemClass} value="Critical">Critical</SelectItem>
          </SelectContent>
        </Select>

        <input type="date" value={from} className={dateClass}
          onChange={e => { setFrom(e.target.value); setPage(1) }}
          onClick={e => e.currentTarget.showPicker?.()} />
        <span className="text-xs text-[#727272]">to</span>
        <input type="date" value={to} className={dateClass}
          onChange={e => { setTo(e.target.value); setPage(1) }}
          onClick={e => e.currentTarget.showPicker?.()} />
      </div>

      <div className="flex-1 flex flex-col">
        <Table>
          <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-10">
            <TableRow>
              {["NODE", "BARANGAY", "STATUS", "BATTERY", "SIGNAL", "SENSOR", "FIRMWARE", "CHECKED AT"].map(h => (
                <TableHead key={h} className="font-semibold text-left text-xs text-[#727272]">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(l => (
              <TableRow key={l.health_id} className="border-b border-[#C6C6C8] hover:bg-[#f5f5f5]">
                <TableCell className="text-[#122A48] text-xs h-12">{l.node_details.node_name}</TableCell>
                <TableCell className="text-[#122A48] text-xs">{l.node_details.barangay_details?.barangay_name ?? "—"}</TableCell>
                <TableCell className="text-xs">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-semibold ${STATUS_BADGE[l.status] ?? ""}`}>
                    {l.status}
                  </span>
                </TableCell>
                <TableCell className="text-[#122A48] text-xs">
                  {l.battery_voltage != null ? `${l.battery_voltage.toFixed(2)} V (${batteryPct(l.battery_voltage)}%)` : "—"}
                </TableCell>
                <TableCell className="text-[#122A48] text-xs">
                  {l.signal_strength != null ? `${l.signal_strength} dBm` : "—"}
                </TableCell>
                <TableCell className="text-[#122A48] text-xs">
                  {l.sensor_continuity == null ? "—" : l.sensor_continuity ? "OK" : "No echo"}
                </TableCell>
                <TableCell className="text-[#122A48] text-xs">{l.firmware_version ?? "—"}</TableCell>
                <TableCell className="text-[#122A48] text-xs">
                  {new Date(l.checked_at).toLocaleString("en-PH", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit", hour12: true,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {loading && logs.length === 0 && <p className="text-center text-xs text-[#727272] py-50">Loading…</p>}
        {error && <p className="text-center text-xs text-[#D81010] py-50">Failed to load health history.</p>}
        {!loading && !error && logs.length === 0 && (
          <p className="text-center text-xs text-[#727272] py-50">No health records match these filters.</p>
        )}
      </div>

      <div className='mt-auto border-t border-[#00000015]'>
        <TablePagination totalItems={total} itemsPerPage={PAGE_SIZE} currentPage={page} onPageChange={setPage} />
      </div>
    </div>
  )
}