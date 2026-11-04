import { useState, useEffect } from 'react'
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { ReportSeverity } from '@/types/reports'

export type SeverityFilter = 'All' | ReportSeverity
export type StatusFilter =
  | 'All' | 'Draft' | 'Awaiting_Post_Report' | 'Ready_To_Verify' | 'Verified' | 'Submitted'

// "Medium" is shown as "Moderate", same as everywhere else in the app
const SEVERITY_OPTIONS: { value: SeverityFilter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Moderate' },
  { value: 'Critical', label: 'Critical' },
]

// Voided reports never reach this screen (the API leaves them out), so they are not an option
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Draft', label: 'In progress' },
  { value: 'Awaiting_Post_Report', label: 'Awaiting post-report' },
  { value: 'Ready_To_Verify', label: 'Ready to verify' },
  { value: 'Verified', label: 'Verified' },
  { value: 'Submitted', label: 'Submitted' },
]

interface Props {
  visible: boolean
  onClose: () => void
  severity: SeverityFilter
  status: StatusFilter
  onApply: (severity: SeverityFilter, status: StatusFilter) => void
}

function RadioRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center py-3 border-b border-slate-100">
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
          selected ? 'border-[#7FA9B8]' : 'border-slate-300'
        }`}
      >
        {selected && <View className="w-2.5 h-2.5 rounded-full bg-[#7FA9B8]" />}
      </View>
      <Text className={`text-[14px] ${selected ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{label}</Text>
    </Pressable>
  )
}

export default function ReportFilterSheet({ visible, onClose, severity, status, onApply }: Props) {
  const [localSeverity, setLocalSeverity] = useState(severity)
  const [localStatus, setLocalStatus] = useState(status)

  // start from what is currently applied every time the sheet opens
  useEffect(() => {
    if (visible) {
      setLocalSeverity(severity)
      setLocalStatus(status)
    }
  }, [visible, severity, status])

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl p-5" onPress={(e) => e.stopPropagation()}>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Ionicons name="filter-outline" size={18} color="#122A48" />
              <Text className="ml-2 text-[15px] font-bold text-slate-800">Filter</Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => { setLocalSeverity('All'); setLocalStatus('All') }}>
                <Text className="text-[12px] font-semibold text-[#64748B]">Reset</Text>
              </Pressable>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          {/* two sections can be taller than a small screen, so they scroll while Apply stays put */}
          <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.55 }} showsVerticalScrollIndicator={false}>
            <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">Severity</Text>
            {SEVERITY_OPTIONS.map((o) => (
              <RadioRow key={o.value} label={o.label} selected={localSeverity === o.value} onPress={() => setLocalSeverity(o.value)} />
            ))}

            <Text className="text-[11px] font-bold text-slate-400 uppercase mt-4 mb-1">Status</Text>
            {STATUS_OPTIONS.map((o) => (
              <RadioRow key={o.value} label={o.label} selected={localStatus === o.value} onPress={() => setLocalStatus(o.value)} />
            ))}
          </ScrollView>

          <Pressable
            className="w-full bg-[#122A48] rounded-lg py-3.5 items-center mt-5"
            onPress={() => {
              onApply(localSeverity, localStatus)
              onClose()
            }}
          >
            <Text className="text-white text-[15px] font-semibold">Apply</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}