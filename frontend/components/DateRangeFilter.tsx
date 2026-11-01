"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"
import { toISODate } from "@/lib/dateRange"

type DateRangeFilterProps = {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  align?: "left" | "right"   // which edge of the button the panel lines up with
  width?: string             // tailwind width class for the button
  disabled?: boolean
}

export function DateRangeFilter({ from, to, onChange, align = "left", width = "w-[240px]", disabled = false }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const today = toISODate(new Date())

  // close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const label = useMemo(() => {
    if (from && to) return `${from} to ${to}`
    if (from) return `From: ${from}`
    if (to) return `Until: ${to}`
    return "Filter by Date"
  }, [from, to])

  // keep the range valid: the end can never be before the start
  const handleFrom = (value: string) => onChange(value, to && value > to ? value : to)
  const handleTo = (value: string) => onChange(from && value && value < from ? value : from, value)

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between ${width} h-9 px-3 border border-[#D0D0D0] rounded-lg bg-white text-[12px] font-normal transition-colors outline-none text-left ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        } ${from || to ? "text-[#122A48]" : "text-[#999999]"}`}
      >
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-[#122A48]" />
          <span>{label}</span>
        </div>
        <ChevronDown size={14} className="text-[#999999]" />
      </button>

      {isOpen && (
        <div className={`absolute ${align === "right" ? "right-0" : "left-0"} top-full mt-1.5 p-4 bg-white border border-[#D0D0D0] rounded-lg shadow-xl z-50 flex flex-col gap-3 w-[280px]`}>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wide">Start Date</label>
            <input
              type="date"
              value={from}
              max={to || today}
              onChange={(e) => handleFrom(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-full h-9 border border-[#D0D0D0] rounded-md px-2 text-[12px] outline-none text-[#122A48] cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-[#727272] uppercase tracking-wide">End Date</label>
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(e) => handleTo(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-full h-9 border border-[#D0D0D0] rounded-md px-2 text-[12px] outline-none text-[#122A48] cursor-pointer"
            />
          </div>

          {(from || to) && (
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="w-full text-center py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 rounded border border-dashed border-red-200 mt-1 transition cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}