import { useMemo, useState } from 'react'
import { View, Text, Modal, Pressable, ScrollView, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { monthLabel, recentMonths, currentMonthValue } from '../../lib/months'

export default function MonthFilter({ value, onChange, loading = false }: {
  value: string
  onChange: (value: string) => void
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const options = useMemo(() => ['All', ...recentMonths()], [])
  const thisMonth = currentMonthValue()

  return (
    <>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => setOpen(true)}
          className="flex-row items-center gap-1.5 self-start rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5"
        >
          <MaterialCommunityIcons name="calendar-month-outline" size={15} color="#64748B" />
          <Text className="text-[12px] font-semibold text-[#122A48]">{monthLabel(value)}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color="#64748B" />
        </Pressable>
        {loading && <ActivityIndicator size="small" color="#94A3B8" />}
      </View>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-3xl bg-white px-5 pt-3 pb-8" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#E2E8F0]" />
            <Text className="mb-2 text-sm font-bold text-[#122A48]">Filter by month</Text>

            <ScrollView style={{ maxHeight: 360 }}>
              {options.map((option) => {
                const selected = option === value
                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setOpen(false)
                      if (option !== value) onChange(option)
                    }}
                    className="flex-row items-center justify-between border-b border-[#F1F5F9] py-3"
                  >
                    <Text className={`text-[13px] ${selected ? 'font-bold text-[#122A48]' : 'text-[#334155]'}`}>
                      {monthLabel(option)}
                      {option === thisMonth ? '  ·  This month' : ''}
                    </Text>
                    {selected && <MaterialCommunityIcons name="check" size={18} color="#16a34a" />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}