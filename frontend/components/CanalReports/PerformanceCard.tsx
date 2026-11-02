"use client"

import { useEffect, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, TrendingUp } from "lucide-react"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import { fetchWithAuth } from "@/lib/auth"

type PeriodStats = {
  period_start: string
  period_end: string
  label: string
  reports: number
  total_waste_kg: number
  avg_response_minutes: number | null
}

type Summary = {
  current: PeriodStats
  previous: PeriodStats
  trend: PeriodStats[]
  submissions: { on_time: number; late: number; missed: number; total: number }
}

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const
const fmtKg = (v: number) => `${v.toLocaleString("en-US", ONE_DECIMAL)} kg`

const fmtMinutes = (m: number | null) => {
  if (m == null) return "—"
  if (m < 60) return `${Math.round(m)} min`
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return r ? `${h} h ${r} min` : `${h} h`
}

// goodWhenDown: true for response time (faster is better); leave out for counts, which stay neutral
function Delta({ diff, text, goodWhenDown }: { diff: number | null; text: string; goodWhenDown?: boolean }) {
  if (diff === null) return null
  if (diff === 0) return <p className="mt-0.5 text-[10px] text-[#94a3b8]">same as last</p>
  const up = diff > 0
  const color = goodWhenDown === undefined ? "#64748b" : up === goodWhenDown ? "#dc2626" : "#16a34a"
  return (
    <p className="mt-0.5 flex items-center text-[10px]" style={{ color }}>
      {up ? <ArrowUp size={11} /> : <ArrowDown size={11} />}&nbsp;{text} vs last
    </p>
  )
}

function Stat({ label, value, divider, children }: { label: string; value: string; divider?: boolean; children?: ReactNode }) {
  return (
    <div className={`shrink-0 ${divider ? "border-l border-[#e2e8f0] pl-4" : ""}`}>
      <p className="text-[11px] font-medium text-[#64748b]">{label}</p>
      <p className="mt-0.5 whitespace-nowrap text-lg font-extrabold leading-6 text-[#122A48]">{value}</p>
      {children}
    </div>
  )
}

const SHELL = "h-full rounded-xl border border-[#e2e8f0] bg-white p-3.5 shadow-[0_2px_4px_rgba(0,0,0,0.06)]"

export default function PerformanceCard() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/canal-reports/summary/`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d: Summary) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading && !data) {
    return <div className={`${SHELL} flex items-center justify-center py-8`}><SpinnerIcon size={24} color="#2F6FED" /></div>
  }
  if (!data) return null

  // nothing finished in any of the last 6 periods
  if (!data.trend.some((t) => t.reports > 0)) {
    return (
      <div className={SHELL}>
        <div className="mb-1.5 flex items-center gap-1.5">
          <TrendingUp size={18} color="#16a34a" />
          <p className="text-sm font-bold text-[#122A48]">Your performance</p>
        </div>
        <p className="text-xs leading-5 text-[#64748b]">
          No finished reports yet. Once you verify your first report, your waste collected, response time and submission record will show up here.
        </p>
      </div>
    )
  }

  const cur = data.current
  const prev = data.previous
  const hasPrev = prev.reports > 0 // without a last period there is nothing to compare with
  const reportsDiff = hasPrev ? cur.reports - prev.reports : null
  const wasteDiff = hasPrev ? Math.round((cur.total_waste_kg - prev.total_waste_kg) * 10) / 10 : null
  const respDiff = cur.avg_response_minutes != null && prev.avg_response_minutes != null
    ? cur.avg_response_minutes - prev.avg_response_minutes
    : null

  const max = Math.max(...data.trend.map((t) => t.total_waste_kg), 1)
  const { on_time, late, missed, total } = data.submissions
  const allOnTime = total > 0 && on_time === total

  return (
    <div className={SHELL}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={18} color="#16a34a" />
          <p className="text-sm font-bold text-[#122A48]">Your performance</p>
        </div>
        <span className="rounded-full border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-0.5 text-[11px] font-semibold text-[#166534]">
          {cur.label}
        </span>
      </div>

      <div className="flex flex-wrap items-stretch gap-x-5 gap-y-4">
        <Stat label="Reports" value={String(cur.reports)}>
          <Delta diff={reportsDiff} text={String(Math.abs(reportsDiff ?? 0))} />
        </Stat>
        <Stat label="Waste" value={fmtKg(cur.total_waste_kg)} divider>
          <Delta diff={wasteDiff} text={fmtKg(Math.abs(wasteDiff ?? 0))} />
        </Stat>
        <Stat label="Avg response" value={fmtMinutes(cur.avg_response_minutes)} divider>
          <Delta diff={respDiff} text={fmtMinutes(Math.abs(respDiff ?? 0))} goodWhenDown />
        </Stat>

        {/* waste per period: past periods faded, this period solid green; hover a bar for its value */}
        <div className="min-w-[16rem] flex-1 self-end">
          <div className="flex h-9 items-end gap-2 border-b border-[#e2e8f0]">
            {data.trend.map((t, i) => {
              const isCurrent = i === data.trend.length - 1
              return (
                <div
                  key={t.period_start}
                  title={`${t.label}: ${fmtKg(t.total_waste_kg)}`}
                  className="min-w-0 flex-1 rounded-t-sm"
                  style={{ height: Math.max(3, (t.total_waste_kg / max) * 36), backgroundColor: isCurrent ? "#16a34a" : "#bbf7d0" }}
                />
              )
            })}
          </div>
          <p
            className="mt-1 truncate text-right text-[10px] font-semibold"
            style={{ color: total === 0 ? "#94a3b8" : allOnTime ? "#166534" : "#c2410c" }}
            title={total === 0 ? undefined : `Last ${total} closed period${total === 1 ? "" : "s"}${late > 0 ? ` · ${late} late` : ""}${missed > 0 ? ` · ${missed} missed` : ""}`}
          >
            {total === 0 ? "No closed periods yet" : `${on_time}/${total} on time`}
          </p>
        </div>
      </div>
    </div>
  )
}