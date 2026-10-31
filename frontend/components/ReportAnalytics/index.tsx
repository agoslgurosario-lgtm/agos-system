"use client"

import { useEffect, useState } from "react"
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, PieChart, Pie, Cell,
} from "recharts"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchWithAuth } from "@/lib/auth"
import { formatMonthLabel, buildPeriodOptions } from "@/lib/reportOptions"
import { forHistory, barangayLabel } from "@/lib/barangayFilters"
import { formatWeight } from "@/lib/formatWeight"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { FileBarChart, Trash2, Clock, BadgeCheck } from "lucide-react"
import type { ReportBarangay } from "@/types/report"

const API = process.env.NEXT_PUBLIC_API_URL

type Analytics = {
  cards: {
    report_count: number
    total_waste_kg: number
    avg_response_minutes: number | null
    submissions: number
    on_time_rate: number | null
  }
  response_by_barangay: { barangay_id: number; barangay_name: string; avg_response_minutes: number; report_count: number }[]
  timeliness: { period_start: string; label: string; on_time: number; late: number }[]
  condition_source: { Sensor: number; Manual: number; Mixed: number }
  purok_comparison: { barangay_name: string; purok: number; label: string; reports: number; report_ids: number[]; avg_clog_pct: number | null; peak_clog_pct: number | null }[]
  waste_comparison: {
    group: "barangay" | "period"
    rows: { key: string; label: string; detected_kg: number; collected_kg: number; reports: number }[]
  }
  top_nodes: { node_id: number; node_name: string; barangay_name: string; purok: number | null; reports: number; report_ids: number[]; avg_clog_pct: number | null; peak_clog_pct: number | null }[]
  trend: { period_start: string; label: string; reports: number; total_waste_kg: number; avg_response_minutes: number | null }[]
}

type BarangayOption = ReportBarangay & { purok_count?: number }
type NodeOption = { node_id: number; node_name: string; barangay_details: { barangay_id: number } | null }
type Metric = "total_waste_kg" | "reports" | "avg_response_minutes"

type DrillRow = {
  report_id: number
  barangay_name: string
  kind: string
  purok_label: string
  severity: string | null
  date: string | null
  period_label: string | null
}

const METRIC_LABEL: Record<Metric, string> = {
  total_waste_kg: "Waste collected (kg)",
  reports: "Reports submitted",
  avg_response_minutes: "Average response time (min)",
}

const last12Months = () => {
  const out: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    out.push({ value, label: formatMonthLabel(value) })
  }
  return out
}

const fmtMinutes = (m: number | null | undefined) => {
  if (m == null) return "—"
  if (m < 60) return `${Math.round(m)} min`
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return r ? `${h} h ${r} min` : `${h} h`
}

function FilterSelect({ value, onChange, options, allLabel, disabled }: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  allLabel?: string
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="cursor-pointer px-3 py-3 bg-white border-2 border-[#C6C6C8] text-[#122A48] rounded-lg font-medium">
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" className="min-w-0 !max-h-70 overflow-y-auto">
        {allLabel && <SelectItem className="p-2 py-1 cursor-pointer text-[#122A48]" value="All">{allLabel}</SelectItem>}
        {options.map(o => (
          <SelectItem key={o.value} className="p-2 py-1 cursor-pointer text-[#122A48]" value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function Panel({ title, note, right, children, className = "" }: {
  title: string
  note?: string
  right?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg p-3 ${className}`}>
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="text-sm font-bold text-[#122A48]">{title}</p>
          {note && <p className="text-[11px] text-[#727272]">{note}</p>}
        </div>
        {right}
      </div>
      <div className="mt-2 flex flex-1 flex-col">{children}</div>
    </div>
  )
}

const Empty = ({ text = "No data for these filters." }: { text?: string }) => (
  <div className="flex flex-1 min-h-[240px] items-center justify-center text-center text-xs text-[#727272]">{text}</div>
)

function Stat({ icon, bg, label, value, hint }: { icon: React.ReactNode; bg: string; label: string; value: string; hint?: string }) {
  return (
    <div
      title={hint}
      className="rounded-lg border-2 border-[#C6C6C8] h-17 min-[2560px]:h-20 min-[3840px]:h-24 w-full flex items-center p-3 gap-3 relative bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]"
    >
      <div className={`${bg} rounded-lg p-2`}>{icon}</div>
      <div className="flex flex-col">
        <span className="text-xl font-bold text-[#122A48] leading-tight">{value}</span>
        <p className="text-xs text-[#122A48]">{label}</p>
      </div>
    </div>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-md border cursor-pointer ${active ? "bg-[#122A48] text-white border-[#122A48]" : "bg-white text-[#122A48] border-[#C6C6C8]"}`}
    >
      {children}
    </button>
  )
}

// the same soft tones as the pie chart on the Waste Analytics page
const C = { blue: "#7CB3E8", green: "#7ED99B", orange: "#E8B27C", red: "#E87C7C" }
const SOURCE_COLOR: Record<string, string> = { Sensor: C.green, Manual: C.orange, Mixed: C.blue }

type TipItem = { name?: string | number; value?: number | string; color?: string; payload?: { fill?: string; name?: string } }

// hover details: bold title, smaller values, and a soft colour swatch instead of coloured text
function ChartTooltip({ active, payload, label, format }: {
  active?: boolean
  payload?: ReadonlyArray<TipItem>
  label?: string | number
  format?: (v: number) => string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="max-w-[220px] rounded-md border border-[#C6C6C8] bg-white/95 px-2.5 py-1.5 shadow-md">
      <p className="text-xs font-bold text-[#122A48]">{label ?? payload[0].name ?? payload[0].payload?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#122A48]/80">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-sm"
            style={{ backgroundColor: p.color ?? p.payload?.fill ?? SOURCE_COLOR[String(p.name)] }}
          />
          <span>{p.name}:</span>
          <span className="font-semibold text-[#122A48]">{format ? format(Number(p.value)) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function ReportAnalytics() {
  const months = last12Months()

  const [barangays, setBarangays] = useState<BarangayOption[]>([])
  const [nodes, setNodes] = useState<NodeOption[]>([])

  const [month, setMonth] = useState(months[0].value)
  const [period, setPeriod] = useState("All")
  const [barangay, setBarangay] = useState("All")
  const [purok, setPurok] = useState("All")
  const [node, setNode] = useState("All")

  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [metric, setMetric] = useState<Metric>("total_waste_kg")
  const [cumulative, setCumulative] = useState(false)

  const pathname = usePathname()
  const reportBase = pathname.startsWith("/admin") ? "/admin/history" : "/menro"
  const [drill, setDrill] = useState<{ title: string; ids: number[]; total: number } | null>(null)
  const [drillRows, setDrillRows] = useState<DrillRow[] | null>(null)
  const [drillError, setDrillError] = useState(false)

  const openDrill = (title: string, ids: number[]) => setDrill({ title, ids: ids.slice(-50), total: ids.length })

  useEffect(() => {
    if (!drill) {
      setDrillRows(null)
      return
    }
    let cancelled = false
    setDrillRows(null)
    setDrillError(false)
    fetchWithAuth(`${API}/api/report-analytics/reports/?ids=${drill.ids.join(",")}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((rows: DrillRow[]) => { if (!cancelled) setDrillRows(rows) })
      .catch(() => { if (!cancelled) setDrillError(true) })
    return () => { cancelled = true }
  }, [drill])

  useEffect(() => {
    fetchWithAuth(`${API}/api/barangays/all/`).then(r => r.json()).then(d => setBarangays(d.results ?? d)).catch(() => {})
    fetchWithAuth(`${API}/api/sensor-nodes/`).then(r => r.json()).then(d => setNodes(d.results ?? d)).catch(() => {})
  }, [])

  useEffect(() => {
    const qs = new URLSearchParams({ month, periods: "12" })
    if (period !== "All") qs.set("period", period)
    if (barangay !== "All") qs.set("barangay", barangay)
    if (purok !== "All") qs.set("purok", purok)
    if (node !== "All") qs.set("node", node)

    let cancelled = false
    setLoading(true)
    setError(false)
    fetchWithAuth(`${API}/api/report-analytics/?${qs}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then((d: Analytics) => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [month, period, barangay, purok, node])

  const handleMonth = (v: string) => { setMonth(v); setPeriod("All") }
  const handleBarangay = (v: string) => { setBarangay(v); setPurok("All"); setNode("All") }

  const selectedBarangay = barangays.find(b => String(b.barangay_id) === barangay)
  const purokOptions = Array.from({ length: selectedBarangay?.purok_count ?? 0 }, (_, i) => ({ value: String(i + 1), label: `Purok ${i + 1}` }))
  const nodeOptions = nodes
    .filter(n => String(n.barangay_details?.barangay_id) === barangay)
    .map(n => ({ value: String(n.node_id), label: n.node_name }))
  const barangayOptions = [...forHistory(barangays)]
    .sort((a, b) => a.barangay_name.localeCompare(b.barangay_name))
    .map(b => ({ value: String(b.barangay_id), label: barangayLabel(b) }))

  // trend: per period, or a running total (a running average means nothing, so that metric stays per period)
  const trendData = (() => {
    if (!data) return []
    let run = 0
    return data.trend.map(t => {
      const v = metric === "total_waste_kg" ? t.total_waste_kg : metric === "reports" ? t.reports : t.avg_response_minutes
      if (cumulative && metric !== "avg_response_minutes") {
        run += v ?? 0
        return { label: t.label, value: Math.round(run * 100) / 100 }
      }
      return { label: t.label, value: v }
    })
  })()

  const sourceData = data
    ? Object.entries(data.condition_source).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }))
    : []

  const purokChart = (data?.purok_comparison ?? []).map(p => ({ ...p, name: barangay === "All" ? p.label : `Purok ${p.purok}` }))
  const nodeChart = (data?.top_nodes ?? []).map(n => ({ ...n, name: `${n.node_name} · ${n.barangay_name}` }))

  const c = data?.cards

  return (
    <div className="hidden md:flex md:flex-col gap-3 text-[#122A48]">

      {/* filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect value={month} onChange={handleMonth} options={months} allLabel="All Months" />
        <FilterSelect value={period} onChange={setPeriod} options={buildPeriodOptions(month).filter(o => o.value !== "All")} allLabel="All periods" disabled={month === "All"} />
        <FilterSelect value={barangay} onChange={handleBarangay} options={barangayOptions} allLabel="All Barangays" />
        <FilterSelect value={purok} onChange={setPurok} options={purokOptions} allLabel="All Puroks" disabled={barangay === "All"} />
        <FilterSelect value={node} onChange={setNode} options={nodeOptions} allLabel="All Nodes" disabled={barangay === "All"} />
      </div>

      {error && <p className="text-sm text-[#D81010]">Couldn't load the analytics. Change a filter to try again.</p>}
      {!data && loading && (
        <div className="flex flex-col gap-2 min-h-[100vh] items-center justify-center">
          <SpinnerIcon size={36} />
          <p>Loading...</p>
        </div>
      )}

      {data && (
        <div className="relative flex flex-col gap-3">
          {loading && (
            <div className="flex-col gap-2 absolute inset-0 z-10 flex items-center justify-center bg-white/60">
              <SpinnerIcon size={36} />
              <p>Loading...</p>
            </div>
          )}

          {/* summary */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            <Stat icon={<FileBarChart size={20} color="#1565BC" />} bg="bg-[#1565BC29]" label="Reports submitted" value={String(c!.report_count)} />
            <Stat icon={<Trash2 size={20} color="#2C7B3C" />} bg="bg-[#CDE3DE]" label="Waste collected" value={formatWeight(c!.total_waste_kg)} />
            <Stat icon={<Clock size={20} color="#E65100" />} bg="bg-[#FFF0D6]" label="Average response time" value={fmtMinutes(c!.avg_response_minutes)} hint="Detected to responded (clog reports)" />
            <Stat
              icon={<BadgeCheck size={20} color="#2C7B3C" />}
              bg="bg-[#CDE3DE]"
              label="On-time submissions"
              value={c!.on_time_rate == null ? "—" : `${c!.on_time_rate}%`}
              hint={c!.submissions ? `${c!.submissions} submission${c!.submissions === 1 ? "" : "s"}` : "No submissions in this range"}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

            {/* trend across periods */}
            <Panel
              title="Trend by period"
              note="The last 12 periods up to the selected one."
              right={
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex gap-1">
                    <Toggle active={!cumulative} onClick={() => setCumulative(false)}>Per period</Toggle>
                    <Toggle active={cumulative} onClick={() => setCumulative(true)}>Cumulative</Toggle>
                  </div>
                  <div className="flex gap-1">
                    {(Object.keys(METRIC_LABEL) as Metric[]).map(m => (
                      <Toggle key={m} active={metric === m} onClick={() => setMetric(m)}>
                        {m === "total_waste_kg" ? "Waste" : m === "reports" ? "Reports" : "Response"}
                      </Toggle>
                    ))}
                  </div>
                </div>
              }
            >
              {trendData.filter(t => t.value != null).length === 0 ? (
                <Empty text={metric === "avg_response_minutes" ? "No clog reports with a response time in these periods yet." : "No data for these filters."} />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={trendData} margin={{ left: 0, right: 16, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        content={
                          <ChartTooltip
                            format={(v) => metric === "avg_response_minutes" ? fmtMinutes(v) : metric === "total_waste_kg" ? `${v} kg` : String(v)}
                          />
                        }
                      />
                      <Line type="monotone" dataKey="value" name={`${cumulative && metric !== "avg_response_minutes" ? "Cumulative " : ""}${METRIC_LABEL[metric]}`} stroke={C.blue} strokeWidth={2} dot={{ r: 4 }} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                  {trendData.filter(t => t.value != null).length === 1 && (
                    <p className="text-center text-[11px] text-[#727272]">Only one period has data so far, so there is no line yet.</p>
                  )}
                </>
              )}
            </Panel>

            {/* on time vs late */}
            <Panel title="On-time vs late submissions" note="Per submission period. Reports from before the period system have no submission, so they aren't counted here.">
              {data.timeliness.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.timeliness} margin={{ left: 0, right: 16, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "#F1F5F9" }} content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                    <Bar dataKey="on_time" name="On time" stackId="s" fill={C.green} />
                    <Bar dataKey="late" name="Late" stackId="s" fill={C.red} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

            {/* response time per barangay */}
            <Panel title="Response time per barangay (minutes)" note="Average time from detection to response. Only barangays with responded clog reports appear.">
              {data.response_by_barangay.length === 0 ? <Empty /> : (
                <div className="flex flex-1 items-center max-h-[300px] overflow-y-auto [scrollbar-gutter:stable_both-edges]">
                  <ResponsiveContainer width="100%" height={Math.max(200, data.response_by_barangay.length * 30)}>
                    <BarChart data={data.response_by_barangay} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="barangay_name" width={110} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: "#F1F5F9" }} content={<ChartTooltip format={fmtMinutes} />} />
                      <Bar dataKey="avg_response_minutes" name="Average response" fill={C.blue} radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* sensor vs manual */}
            <Panel title="Sensor vs manual reports" note="Where the canal condition on each report came from.">
              {sourceData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={sourceData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} label>
                      {sourceData.map(s => <Cell key={s.name} fill={SOURCE_COLOR[s.name]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Panel>

            {/* purok comparison */}
            <Panel
              title="Purok comparison"
              note={`${barangay === "All" ? "Worst puroks across all barangays, labelled by barangay. Pick a barangay to compare its own puroks." : "Peak and average clog % recorded by the sensors, worst first."} Click a bar to see its reports.`}
            >
              {purokChart.length === 0 ? <Empty /> : (
                <div className="flex flex-1 items-center max-h-[300px] overflow-y-auto [scrollbar-gutter:stable_both-edges]">
                  <ResponsiveContainer width="100%" height={Math.max(200, purokChart.length * 38)}>
                    <BarChart data={purokChart} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: "#F1F5F9" }} content={<ChartTooltip format={(v) => `${v}%`} />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                      <Bar dataKey="peak_clog_pct" name="Peak clog" fill={C.red} radius={[0, 4, 4, 0]} barSize={14} cursor="pointer"
                        onClick={(_: unknown, i: number) => openDrill(purokChart[i].label, purokChart[i].report_ids)} />
                      <Bar dataKey="avg_clog_pct" name="Average clog" fill={C.orange} radius={[0, 4, 4, 0]} barSize={14} cursor="pointer"
                        onClick={(_: unknown, i: number) => openDrill(purokChart[i].label, purokChart[i].report_ids)} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* nodes */}
            <Panel title="Sensor nodes" note="Devices that recorded the highest clogging. Only nodes that appear in submitted reports are listed. Click a bar to see its reports.">
              {nodeChart.length === 0 ? <Empty /> : (
                <div className="flex flex-1 items-center max-h-[300px] overflow-y-auto [scrollbar-gutter:stable_both-edges]">
                  <ResponsiveContainer width="100%" height={Math.max(200, nodeChart.length * 38)}>
                    <BarChart data={nodeChart} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip cursor={{ fill: "#F1F5F9" }} content={<ChartTooltip format={(v) => `${v}%`} />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                      <Bar dataKey="peak_clog_pct" name="Peak clog" fill={C.red} radius={[0, 4, 4, 0]} barSize={14} cursor="pointer"
                        onClick={(_: unknown, i: number) => openDrill(nodeChart[i].name, nodeChart[i].report_ids)} />
                      <Bar dataKey="avg_clog_pct" name="Average clog" fill={C.orange} radius={[0, 4, 4, 0]} barSize={14} cursor="pointer"
                        onClick={(_: unknown, i: number) => openDrill(nodeChart[i].name, nodeChart[i].report_ids)} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* waste detected vs collected */}
            <Panel
              className="xl:col-span-2"
              title="Waste detected vs collected (kg)"
              note={`For each node in a report, the AI's highest waste estimate; these are added up across the nodes and reports in each bar, and compared with the kg collected on the same reports. It's a visual estimate, so the two rarely match exactly. Reports without AI data are left out. ${data.waste_comparison.group === "period" ? "Grouped by period." : "Grouped by barangay; pick a barangay to see it by period."}`}
            >
              {data.waste_comparison.rows.length === 0 ? (
                <Empty text="No reports with an AI waste estimate for these filters yet." />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, data.waste_comparison.rows.length * 44)}>
                  <BarChart data={data.waste_comparison.rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} unit=" kg" />
                    <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip cursor={{ fill: "#F1F5F9" }} content={<ChartTooltip format={(v) => `${v} kg`} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                    <Bar dataKey="detected_kg" name="Detected by AI (peak estimate)" fill={C.blue} radius={[0, 4, 4, 0]} barSize={14} />
                    <Bar dataKey="collected_kg" name="Collected" fill={C.green} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Panel>

          </div>
        </div>
      )}

      <Dialog open={!!drill} onOpenChange={(o) => { if (!o) setDrill(null) }}>
        <DialogContent className="text-[#122A48] w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-base">Reports behind {drill?.title}</DialogTitle>
          </DialogHeader>

          {drillError && <p className="text-sm text-[#D81010]">Couldn't load these reports.</p>}
          {!drillRows && !drillError && (
            <div className="flex justify-center py-8"><SpinnerIcon size={28} /></div>
          )}
          {drillRows && drillRows.length === 0 && (
            <p className="py-6 text-center text-xs text-[#727272]">No reports found.</p>
          )}
          {drillRows && drillRows.length > 0 && (
            <div className="flex max-h-[360px] flex-col divide-y divide-[#E5E7EB] overflow-y-auto">
              {drillRows.map(r => (
                <Link
                  key={r.report_id}
                  href={`${reportBase}/barangay-reports/view-barangay-report/?id=${r.report_id}`}
                  className="flex items-center justify-between gap-3 rounded px-1 py-2 text-xs hover:bg-[#F1F5F9]"
                >
                  <div>
                    <p className="font-semibold">{r.barangay_name} · {r.purok_label}</p>
                    <p className="text-[#727272]">{r.kind}{r.period_label ? ` · ${r.period_label}` : ""}</p>
                  </div>
                  <p className="text-[#727272]">
                    {r.date ? new Date(r.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </p>
                </Link>
              ))}
            </div>
          )}
          {drill && drill.total > drill.ids.length && (
            <p className="text-[11px] text-[#727272]">Showing the latest {drill.ids.length} of {drill.total} reports.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}