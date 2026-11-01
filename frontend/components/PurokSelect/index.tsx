"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { purokOptions } from "@/lib/purok"

type Props = {
  value: string
  onChange: (v: string) => void
  count?: number | null
  error?: boolean
  size?: "sm" | "md"      // sm = bulk-add cards, md = the edit form
}

export function PurokSelect({ value, onChange, count, error, size = "sm" }: Props) {
  // !h-* beats the trigger's built-in height; w-full keeps the width fixed
  const height = size === "md" ? "!h-10 md:!h-10.5 md:text-sm" : "!h-8 md:!h-9"
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={`w-full ${height} py-0 text-sm cursor-pointer text-[#122A48] !font-normal rounded-lg bg-[#1565BC05] border ${
          error ? "border-[#FF0000]" : "border-[#727272]"
        }`}
      >
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent position="popper">
        {purokOptions(count).map(n => (
          <SelectItem className="cursor-pointer" key={n} value={String(n)}>Purok {n}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}