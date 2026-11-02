"use client"

import type { Option } from "@/lib/canalReportOptions"

interface ChipSelectProps<T extends string> {
  label: string
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
  required?: boolean
  disabled?: boolean
  /** highlight color for the selected chip, defaults to AGOS green */
  activeColor?: string
  /** per-option colors, e.g. severity: Critical red, Medium amber, Low blue */
  colorMap?: Record<string, { bg: string; text: string }>
}

export default function ChipSelect<T extends string>({
  label, options, value, onChange, required = false, disabled = false, activeColor = "#16a34a", colorMap,
}: ChipSelectProps<T>) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-xs font-semibold text-[#334155]">
        {label} {required && <span className="text-[#dc2626]">*</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option.value
          const custom = colorMap?.[option.value]
          const bg = isActive ? custom?.bg ?? activeColor : "#f1f5f9"
          const border = isActive ? custom?.bg ?? activeColor : "#e2e8f0"
          const text = isActive ? custom?.text ?? "#ffffff" : "#64748b"
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className="cursor-pointer rounded-[10px] border px-3.5 py-2 text-[13px] font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: bg, borderColor: border, color: text }}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
