import type { SeverityFilter } from "@/types/clog-event"

const TABS: { key: SeverityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "critical", label: "Critical" },
  { key: "moderate", label: "Moderate" },
  { key: "low", label: "Low" },
]

type Props = {
  value: SeverityFilter
  counts: Record<SeverityFilter, number>
  onChange: (v: SeverityFilter) => void
}

export function SeverityTabs({ value, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map(t => {
        const active = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`h-7 px-3 rounded-full text-xs cursor-pointer transition-colors border ${
              active
                ? "bg-[#1259B8] border-[#1259B8] text-white font-semibold"
                : "bg-white border-[#C6C6C8] text-[#122A48] font-medium hover:bg-[#f5f5f5]"
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        )
      })}
    </div>
  )
}