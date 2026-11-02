"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import ChipSelect from "./ChipSelect"
import { SpinnerIcon } from "@/components/SpinnerIcon"
import {
  WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS, optionLabel,
} from "@/lib/canalReportOptions"
import type { CleanupPreviewPurok, WaterLevel, ObstructionCoverage, WaterFlowCondition } from "@/types/report"

interface Props {
  puroks: CleanupPreviewPurok[]
  loading?: boolean
  manual: { water: WaterLevel | null; obstruction: ObstructionCoverage | null; flow: WaterFlowCondition | null }
  onManualChange: (patch: { waterLevel?: WaterLevel; obstructionCoverage?: ObstructionCoverage; waterFlowCondition?: WaterFlowCondition }) => void
}

// options are ordered from mildest to worst, so the highest index is the worst value
function worst<T extends string>(opts: { value: T }[], vals: (T | null)[]): T | null {
  let best = -1
  vals.forEach((v) => {
    if (!v) return
    const i = opts.findIndex((o) => o.value === v)
    if (i > best) best = i
  })
  return best < 0 ? null : opts[best].value
}

function Tag({ text, color, bg }: { text: string; color: string; bg: string }) {
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: bg, color }}>{text}</span>
}

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-1 w-1/3 pr-2">
      <p className="mb-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">{label}</p>
      <p className="text-[13px] font-semibold text-[#122A48]">{value}</p>
    </div>
  )
}

export function CleanupSummary({ puroks, loading, manual, onManualChange }: Props) {
  const [open, setOpen] = useState(false)

  if (loading && puroks.length === 0) return <div className="my-6 flex justify-center"><SpinnerIcon size={24} color="#16a34a" /></div>
  if (puroks.length === 0) return null

  const counted = puroks.filter((p) => p.has_sensor_data)
  const readings = counted.reduce((s, p) => s + p.reading_count, 0)

  return (
    <div>
      {counted.length > 0 ? (
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-[#122A48]">Barangay summary</p>
            <Tag text="SENSOR" color="#15803d" bg="#dcfce7" />
          </div>
          <div className="flex flex-wrap">
            <Locked label="Water level" value={optionLabel(WATER_LEVEL_OPTIONS, worst(WATER_LEVEL_OPTIONS, counted.map((p) => p.overall_water_level)))} />
            <Locked label="Obstruction" value={optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, worst(OBSTRUCTION_COVERAGE_OPTIONS, counted.map((p) => p.overall_obstruction_coverage)))} />
            <Locked label="Water flow" value={optionLabel(WATER_FLOW_OPTIONS, worst(WATER_FLOW_OPTIONS, counted.map((p) => p.overall_water_flow_condition)))} />
          </div>
          <p className="mt-1 text-[11px] text-[#64748b]">
            Based on {counted.length} of {puroks.length} puroks with sensor data · {readings} readings
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[13px] font-bold text-[#122A48]">Barangay summary</p>
            <Tag text="MANUAL" color="#b45309" bg="#fef3c7" />
          </div>
          <p className="mb-3 text-[11px] text-[#92400e]">No sensor data for this week. Enter the canal condition for the whole barangay.</p>
          <ChipSelect label="Water level" required options={WATER_LEVEL_OPTIONS} value={manual.water} onChange={(v) => onManualChange({ waterLevel: v })} />
          <ChipSelect label="Obstruction coverage" required options={OBSTRUCTION_COVERAGE_OPTIONS} value={manual.obstruction} onChange={(v) => onManualChange({ obstructionCoverage: v })} />
          <ChipSelect label="Water flow" required options={WATER_FLOW_OPTIONS} value={manual.flow} onChange={(v) => onManualChange({ waterFlowCondition: v })} />
        </div>
      )}

      <button type="button" onClick={() => setOpen((o) => !o)} className="mt-2.5 flex cursor-pointer items-center gap-1 py-1 text-xs font-semibold text-[#475569]">
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />} See per purok
      </button>

      {open && (
        <div className="mt-1 rounded-xl border border-[#e2e8f0] bg-white">
          {puroks.map((p, i) => (
            <div key={p.purok} className={`flex items-center justify-between px-3 py-2 ${i > 0 ? "border-t border-[#f1f5f9]" : ""}`}>
              <span className="text-xs font-bold text-[#122A48]">Purok {p.purok}</span>
              {p.has_sensor_data ? (
                <span className="text-xs text-[#334155]">
                  {optionLabel(WATER_LEVEL_OPTIONS, p.overall_water_level)} · {optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, p.overall_obstruction_coverage)} · {optionLabel(WATER_FLOW_OPTIONS, p.overall_water_flow_condition)}
                </span>
              ) : (
                <span className="text-xs italic text-[#94a3b8]">{p.node_names.length === 0 ? "No sensors" : "No readings this week"}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
