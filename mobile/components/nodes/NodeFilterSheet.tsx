import { useState, useEffect } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export type LevelFilter = 'All' | 'Normal' | 'Warning' | 'Critical'
const LEVEL_OPTIONS: LevelFilter[] = ['All', 'Normal', 'Warning', 'Critical']

interface Props {
  visible: boolean
  onClose: () => void
  health: LevelFilter
  level: LevelFilter
  onApply: (health: LevelFilter, level: LevelFilter) => void
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

export default function NodeFilterSheet({ visible, onClose, health, level, onApply }: Props) {
  const [localHealth, setLocalHealth] = useState(health)
  const [localLevel, setLocalLevel] = useState(level)

  useEffect(() => {
    if (visible) {
      setLocalHealth(health)
      setLocalLevel(level)
    }
  }, [visible, health, level])

  return (
    <Modal transparent visible={visible} animationType="slide">
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl p-5" onPress={(e) => e.stopPropagation()}>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Ionicons name="filter-outline" size={18} color="#122A48" />
              <Text className="ml-2 text-[15px] font-bold text-slate-800">Filter</Text>
            </View>
            <View className="flex-row items-center gap-4">
              <Pressable onPress={() => { setLocalHealth('All'); setLocalLevel('All') }}>
                <Text className="text-[12px] font-semibold text-[#64748B]">Reset</Text>
              </Pressable>
              <Pressable onPress={onClose}>
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">Device Health</Text>
          {LEVEL_OPTIONS.map((o) => (
            <RadioRow key={o} label={o} selected={localHealth === o} onPress={() => setLocalHealth(o)} />
          ))}

          <Text className="text-[11px] font-bold text-slate-400 uppercase mt-4 mb-1">Water Level</Text>
          {LEVEL_OPTIONS.map((o) => (
            <RadioRow key={o} label={o} selected={localLevel === o} onPress={() => setLocalLevel(o)} />
          ))}

          <Pressable
            className="w-full bg-[#122A48] rounded-lg py-3.5 items-center mt-5"
            onPress={() => {
              onApply(localHealth, localLevel)
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