"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TablePagination } from "@/components/TablePagination"
import type { ClogEvent, SeverityFilter } from "@/types/clog-event"
import { formatDateTime } from "@/lib/clog-utils"
import { PAGE_SIZE } from "@/lib/hooks/use-clog-events"
import { PercentBadge, SeverityBadge, StatusBadge } from "./badges"
import { SeverityTabs } from "./severity-tabs"

const dateClass =
  "h-8 border-2 border-[#C6C6C8] rounded-lg px-2 text-xs outline-none text-[#122A48] cursor-pointer bg-white"

const HEADERS = [
  "BARANGAY / NODE", "SEVERITY", "CLOG %", "STATUS",
  "DETECTED AT", "WATER LEVEL", "WATER FLOW", "EST. WEIGHT (AI)",
]

type Props = {
  events: ClogEvent[]
  total: number
  page: number
  onPageChange: (p: number) => void
  loading: boolean
  error: boolean
  severity: SeverityFilter
  counts: Record<SeverityFilter, number>
  onSeverityChange: (v: SeverityFilter) => void
  from: string
  to: string
  onRangeChange: (from: string, to: string) => void
  emptyMessage: string
  onSelect: (e: ClogEvent) => void
}

export function ClogEventsTable({
  events, total, page, onPageChange, loading, error,
  severity, counts, onSeverityChange, from, to, onRangeChange,
  emptyMessage, onSelect,
}: Props) {
  return (
    <div className="mt-3 bg-[#FAFCFD] border border-[#00000040] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)] rounded-lg flex flex-col mb-3 min-h-[620px]">
      <div className="pl-2 p-1 py-2 flex flex-wrap items-center gap-3 border-b border-[#C6C6C8]">
        <p className="font-bold text-[#122A48] text-sm mr-auto">Clog Events History</p>
        <SeverityTabs value={severity} counts={counts} onChange={onSeverityChange} />
        <input type="date" value={from} className={dateClass}
          onChange={e => onRangeChange(e.target.value, to)}
          onClick={e => e.currentTarget.showPicker?.()} />
        <span className="text-xs text-[#727272]">to</span>
        <input type="date" value={to} className={dateClass}
          onChange={e => onRangeChange(from, e.target.value)}
          onClick={e => e.currentTarget.showPicker?.()} />
      </div>

      <div className="flex-1 flex flex-col">
        <Table>
          <TableHeader className="bg-[#e8eef1b4] border border-[#CFD8DC] h-10">
            <TableRow>
              {HEADERS.map(h => (
                <TableHead key={h} className="font-semibold text-left text-xs text-[#727272]">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map(e => (
              <TableRow
                key={e.id}
                onClick={() => onSelect(e)}
                className="border-b border-[#C6C6C8] hover:bg-[#f5f5f5] cursor-pointer"
              >
                <TableCell className="text-[#122A48] text-xs h-12">
                  <p className="font-bold">{e.barangay}</p>
                  <p className="text-[#727272]">{e.nodeId}</p>
                </TableCell>
                <TableCell className="text-xs"><SeverityBadge severity={e.severity} /></TableCell>
                <TableCell className="text-xs"><PercentBadge value={e.clogPercent} /></TableCell>
                <TableCell className="text-xs">
                  <StatusBadge status={e.status} />
                  {e.autoCleared && (
                    <p className="mt-1 text-[11px] text-[#727272]">Cleared without a response</p>
                  )}
                </TableCell>
                <TableCell className="text-[#122A48] text-xs">{formatDateTime(e.detectedAt)}</TableCell>
                <TableCell className="text-[#122A48] text-xs">{e.waterLevelCm} cm</TableCell>
                <TableCell className="text-[#122A48] text-xs">{e.waterFlowMs} m/s</TableCell>
                <TableCell className="text-[#122A48] text-xs">
                  {e.estimatedWeightG > 0 ? "~ " : ""}{e.estimatedWeightG} g
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {loading && events.length === 0 && <p className="text-center text-xs text-[#727272] py-50">Loading…</p>}
        {error && <p className="text-center text-xs text-[#D81010] py-50">Failed to load clog events.</p>}
        {!loading && !error && events.length === 0 && (
          <p className="text-center text-xs text-[#727272] py-50">{emptyMessage}</p>
        )}
      </div>

      <div className="mt-auto border-t border-[#00000015]">
        <TablePagination totalItems={total} itemsPerPage={PAGE_SIZE} currentPage={page} onPageChange={onPageChange} />
      </div>
    </div>
  )
}