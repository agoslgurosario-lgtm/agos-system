import { useState } from 'react'
import { View, Text, Pressable, Platform } from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { fromISODate, toISODate, rangeLabel } from '../../lib/dateRange'

type Field = 'from' | 'to'

// Start / end date rows with the native picker. Controlled: the parent owns the values.
export default function DateRangeFields({ from, to, onChange }: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}) {
  const [picking, setPicking] = useState<Field | null>(null)

  const handlePick = (e: DateTimePickerEvent, selected?: Date) => {
    const field = picking
    if (Platform.OS === 'android') setPicking(null)
    if (e.type !== 'set' || !selected || !field) return
    const iso = toISODate(selected)
    if (field === 'from') onChange(iso, to && iso > to ? iso : to) // the end can never be before the start
    else onChange(from && iso < from ? iso : from, iso)
  }

  const row = (field: Field, label: string, value: string) => (
    <Pressable
      onPress={() => setPicking(picking === field ? null : field)}
      className="flex-row items-center justify-between border-b border-[#F1F5F9] py-3"
    >
      <Text className="text-[11px] font-bold uppercase text-[#64748B]">{label}</Text>
      <View className="flex-row items-center gap-1.5">
        <Text className={`text-[13px] ${value ? 'font-semibold text-[#122A48]' : 'text-[#94A3B8]'}`}>
          {value ? rangeLabel(value, value) : 'Not set'}
        </Text>
        <MaterialCommunityIcons name="calendar-edit" size={16} color="#64748B" />
      </View>
    </Pressable>
  )

  const pickerValue = picking === 'from' ? from : to

  return (
    <View>
      {row('from', 'Start date', from)}
      {row('to', 'End date', to)}

      {picking && (
        <DateTimePicker
          value={pickerValue ? fromISODate(pickerValue) : new Date()}
          mode="date"
          maximumDate={new Date()}
          minimumDate={picking === 'to' && from ? fromISODate(from) : undefined}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePick}
        />
      )}
    </View>
  )
}
