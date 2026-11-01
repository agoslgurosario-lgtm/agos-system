import { useState } from 'react'
import { View, Text, Modal, Pressable, ActivityIndicator } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { rangeLabel } from '../../lib/dateRange'
import DateRangeFields from './DateRangeFields'

export default function DateRangeFilter({ from, to, onChange, loading = false }: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  loading?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ from, to })

  const openSheet = () => {
    setDraft({ from, to })
    setOpen(true)
  }

  const apply = () => {
    setOpen(false)
    if (draft.from !== from || draft.to !== to) onChange(draft.from, draft.to)
  }

  const clear = () => {
    setOpen(false)
    onChange('', '')
  }

  return (
    <>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={openSheet}
          className="flex-row items-center gap-1.5 self-start rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5"
        >
          <MaterialCommunityIcons name="calendar-range-outline" size={15} color="#64748B" />
          <Text className="text-[12px] font-semibold text-[#122A48]">{rangeLabel(from, to)}</Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color="#64748B" />
        </Pressable>
        {loading && <ActivityIndicator size="small" color="#94A3B8" />}
      </View>

      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/35" onPress={() => setOpen(false)}>
          <Pressable className="rounded-t-3xl bg-white px-5 pt-3 pb-8" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#E2E8F0]" />
            <Text className="mb-1 text-sm font-bold text-[#122A48]">Filter by date</Text>

            <DateRangeFields from={draft.from} to={draft.to} onChange={(f, t) => setDraft({ from: f, to: t })} />

            <View className="mt-5 flex-row gap-3">
              <Pressable onPress={clear} className="flex-1 items-center rounded-xl border border-[#E2E8F0] py-3">
                <Text className="text-[13px] font-semibold text-[#64748B]">Clear</Text>
              </Pressable>
              <Pressable onPress={apply} className="flex-1 items-center rounded-xl bg-[#122A48] py-3">
                <Text className="text-[13px] font-semibold text-white">Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}
