import { View, Text, TouchableOpacity } from 'react-native'
import type { Option } from '@/constants/reports'

interface ChipSelectProps<T extends string> {
  label: string
  options: Option<T>[]
  value: T | null
  onChange: (value: T) => void
  required?: boolean
  /** highlight color for the selected chip — defaults to AGOS green */
  activeColor?: string
  /** per-option colors, e.g. severity: Critical red, Medium amber, Low blue */
  colorMap?: Record<string, { bg: string; text: string }>
}

export default function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
  required = false,
  activeColor = '#16a34a',
  colorMap,
}: ChipSelectProps<T>) {
  return (
    <View className="mb-3">
      <Text className="mb-1.5 text-xs font-semibold text-[#334155]">
        {label} {required && <Text className="text-[#dc2626]">*</Text>}
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option.value
          const custom = colorMap?.[option.value]

          const bg = isActive ? (custom?.bg ?? activeColor) : '#f1f5f9'
          const border = isActive ? (custom?.bg ?? activeColor) : '#e2e8f0'
          const text = isActive ? (custom?.text ?? '#ffffff') : '#64748b'

          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onChange(option.value)}
              activeOpacity={0.8}
              className="rounded-[10px] border px-3.5 py-2"
              style={{ backgroundColor: bg, borderColor: border }}
            >
              <Text className="text-[13px] font-semibold" style={{ color: text }}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}