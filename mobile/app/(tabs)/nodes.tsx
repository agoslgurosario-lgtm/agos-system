import { useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AlertBellButton from '@/components/alerts/AlertBellButton'
import { useNodes } from '../../hooks/useNodes'
import type { SensorNodeApi } from '../../types/map'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

type LevelFilter = 'All' | 'Normal' | 'Warning' | 'Critical'
const LEVEL_FILTERS: LevelFilter[] = ['All', 'Normal', 'Warning', 'Critical']

import NodeFilterSheet from '../../components/nodes/NodeFilterSheet'

// only count a reading recorded since the node was installed here
function hasCurrentReading(n: SensorNodeApi) {
  return (
    !!n.last_reading_at &&
    (!n.installed_at || new Date(n.last_reading_at) >= new Date(n.installed_at))
  )
}

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Normal:   { bg: '#E7F7EE', text: '#1F9D55' },
  Warning:  { bg: '#FFF3E0', text: '#FF9705' },
  Critical: { bg: '#FEE2E2', text: '#D81010' },
}

const CARD_SHADOW = {
  elevation: 2,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 4,
  shadowOffset: { width: 0, height: 2 },
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function deviceState(n: SensorNodeApi) {
  if (n.status === 'Maintenance') return { label: 'Maintenance', color: '#D27000' }
  if (n.is_force_sleeping) return { label: 'Sleeping', color: '#2563EB' }
  if (n.is_online) return { label: 'Online', color: '#1F9D55' }
  return { label: 'Offline', color: '#94A3B8' }
}

function NodeCard({ node }: { node: SensorNodeApi }) {
  const router = useRouter()
  const state = deviceState(node)
  const health = node.health_status ? STATUS_STYLE[node.health_status] : null

  // only show a reading recorded since the node was installed here
  const hasReading = hasCurrentReading(node)
  const cond = node.condition ? STATUS_STYLE[node.condition] : null

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/node-details',
          params: { id: String(node.node_id), name: node.node_name, hotspot: node.hotspot_details?.name ?? '' },
        })
      }
      className="bg-white rounded-2xl p-4 border border-[#F1F5F9]"
      style={CARD_SHADOW}
    >
      {/* header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-[15px] font-bold text-[#122A48]" numberOfLines={1}>{node.node_name}</Text>
          <Text className="text-[11px] text-[#64748B] mt-0.5" numberOfLines={1}>
            {node.hotspot_details?.name ?? 'No hotspot'}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: state.color }} />
          <Text className="text-[11px] font-semibold" style={{ color: state.color }}>{state.label}</Text>
        </View>
      </View>

      <View className="border-b border-slate-200 my-3" />

      {/* body */}
      <View className="flex-row justify-between">
        <View>
          <Text className="text-[9px] text-slate-400 uppercase">DEVICE HEALTH</Text>
          {health ? (
            <View className="mt-1 px-2 py-1 rounded-full self-start" style={{ backgroundColor: health.bg }}>
              <Text className="text-[10px] font-semibold" style={{ color: health.text }}>{node.health_status}</Text>
            </View>
          ) : (
            <Text className="text-[11px] text-slate-400 mt-1">No data</Text>
          )}
        </View>

        <View className="items-center">
          <Text className="text-[9px] text-slate-400 uppercase">WATER LEVEL</Text>
          {hasReading && node.water_level != null ? (
            <View className="mt-1 flex-row items-center gap-1.5">
              <Text className="text-[12px] font-semibold text-[#122A48]">{node.water_level} cm</Text>
              {cond && (
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: cond.bg }}>
                  <Text className="text-[9px] font-semibold" style={{ color: cond.text }}>{node.condition}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text className="text-[11px] text-slate-400 mt-1">No readings yet</Text>
          )}
        </View>

        <View className="items-end">
          <Text className="text-[9px] text-slate-400 uppercase">LAST READING</Text>
          <Text className="text-[11px] mt-1">
            {hasReading && node.last_reading_at ? timeAgo(node.last_reading_at) : '—'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

function ChipRow({
  label, value, onChange,
}: { label: string; value: LevelFilter; onChange: (v: LevelFilter) => void }) {
  return (
    <View className="mb-2 flex justify-center items-center">
      <Text className="px-4 text-[10px] font-semibold text-slate-400 uppercase mb-1">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 gap-2 flex justify-center items-center">
        {LEVEL_FILTERS.map((f) => {
          const active = value === f
          return (
            <Pressable
              key={f}
              onPress={() => onChange(f)}
              className={`px-4 py-2 rounded-full justify-center items-center ${active ? 'bg-[#122A48]' : 'bg-[#F1F5F9]'}`}
            >
              <Text className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-[#64748B]'}`}>{f}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

export default function NodesScreen() {
  const { nodes, loading, refreshing, error, refresh } = useNodes()

  const [healthFilter, setHealthFilter] = useState<LevelFilter>('All')
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('All')
  const [filterVisible, setFilterVisible] = useState(false)
  const filtersActive = healthFilter !== 'All' || levelFilter !== 'All'

  const visible = nodes.filter((n) => {
    if (healthFilter !== 'All' && n.health_status !== healthFilter) return false
    // a node with no current reading can't match a water level filter
    if (levelFilter !== 'All' && !(hasCurrentReading(n) && n.condition === levelFilter)) return false
    return true
  })

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#2F6FED" />
        <Text>Loading...</Text>
      </View>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#EEF3F8]" edges={['top']}>
      <View className="w-full flex flex-row items-center justify-between px-4 pt-3 pb-3">
        <Pressable onPress={() => setFilterVisible(true)} hitSlop={10} className="relative">
          <Ionicons name="filter-outline" size={22} color="#334155" />
          {filtersActive && (
            <View className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#D81010]" />
          )}
        </Pressable>
        <Text className="text-[21px] font-bold text-center text-[#122A48]">Sensor Nodes</Text>
        <AlertBellButton />
      </View>

      <ScrollView
        contentContainerClassName="p-4 gap-3 pb-5 pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#122A48" />}
      >
        {error && (
          <Text className="text-[#D81010] text-xs text-center mb-1">
            Couldn't load nodes. Pull down to try again.
          </Text>
        )}

        {!error && nodes.length === 0 && (
          <View className="items-center py-16">
            <Text className="text-slate-500 text-sm">No nodes are assigned to your barangay yet.</Text>
          </View>
        )}

        {!error && nodes.length > 0 && visible.length === 0 && (
          <View className="items-center py-16">
            <Text className="text-slate-500 text-sm">No nodes match these filters.</Text>
          </View>
        )}

        {visible.map((n) => <NodeCard key={n.node_id} node={n} />)}
      </ScrollView>
      
      <NodeFilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        health={healthFilter}
        level={levelFilter}
        onApply={(h, l) => { setHealthFilter(h); setLevelFilter(l) }}
      />
    </SafeAreaView>
  )
}