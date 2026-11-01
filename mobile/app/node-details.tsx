import { useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import NodeReadings from '../components/nodes/NodeReadings'
import NodeHealth from '../components/nodes/NodeHealth'

type DetailView = 'readings' | 'health'

const TABS: { key: DetailView; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'readings', label: 'Readings', icon: 'pulse-outline' },
  { key: 'health',   label: 'Health',   icon: 'hardware-chip-outline' },
]

export default function NodeDetails() {
  const router = useRouter()
  const { id, name, hotspot, tab } = useLocalSearchParams<{
    id: string; name?: string; hotspot?: string; tab?: string
  }>()
  const nodeId = Number(id)
  const [view, setView] = useState<DetailView>(tab === 'health' ? 'health' : 'readings')

  return (
    <SafeAreaView className="flex-1 bg-[#EEF3F8]" edges={['top']}>
      {/* header + tabs share one white surface */}
      <View>
        <View className="flex-row items-center px-4 pt-3 pb-2">
          <Pressable onPress={() => router.back()} hitSlop={10} className="mr-3">
            <Ionicons name="arrow-back" size={22} color="#122A48" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[18px] font-bold text-[#122A48]" numberOfLines={1}>{name ?? 'Node'}</Text>
            {!!hotspot && <Text className="text-[11px] text-[#64748B]" numberOfLines={1}>{hotspot}</Text>}
          </View>
        </View>

        <View className="flex-row" style={{ borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
          {TABS.map((t) => {
            const active = view === t.key
            return (
              <Pressable
                key={t.key}
                onPress={() => setView(t.key)}
                className="flex-1 flex-row items-center justify-center py-3"
                style={{ borderBottomWidth: 3, borderBottomColor: active ? '#122A48' : 'transparent' }}
              >
                <Ionicons name={t.icon} size={16} color={active ? '#122A48' : '#94A3B8'} />
                <Text
                  className={`ml-2 text-[13px] ${active ? 'font-bold text-[#122A48]' : 'font-semibold text-[#94A3B8]'}`}
                >
                  {t.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* content */}
      <View className="flex-1 pt-3">
        {view === 'readings' ? (
          <NodeReadings nodeId={nodeId} />
        ) : (
          <NodeHealth nodeId={nodeId} />
        )}
      </View>
    </SafeAreaView>
  )
}