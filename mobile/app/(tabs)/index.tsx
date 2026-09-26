import { useState, useMemo } from 'react'
import { View, Text, Button, Pressable, ScrollView, ActivityIndicator, RefreshControl  } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/lib/AuthContext'
import CanalMapScreen, { type CanalStatus } from '@/components/maps/CanalMapScreen'
import NodeDetailSheet, { type NodeDetail } from '@/components/maps/NodeDetailSheet'
import WasteCompositionCard from '@/components/maps/WasteCompositionCard'
import { useMapData } from '@/hooks/useMapData'
import { useRainfallCondition } from '@/hooks/useRainfallCondition'
import { SensorNodeApi } from '@/types/map'
import AlertBellButton from '@/components/alerts/AlertBellButton'

import { BASE_URL } from '@/lib/api'

// Rosario, La Union
const FALLBACK_CENTER = { lat: 16.23031273833657, lng: 120.48632076236241 }

function formatRelativeTime(timestamp: string | null) {
  if (!timestamp) return 'No data yet'
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function getNodeDetail(node: SensorNodeApi): NodeDetail {
  const depth = node.hotspot_details?.canal_depth
  const waterLevelPercent =
    node.water_level != null && depth
      ? Math.min(100, Math.max(0, (node.water_level / depth) * 100))
      : null

  const status: CanalStatus = node.condition ?? 'Normal'

  return {
    id: node.node_id,
    title: node.hotspot_details?.name
      ? `${node.node_name} – ${node.hotspot_details.name}`
      : node.node_name,
    status,
    statusLabel: status,
    waterLevelPercent,
    sensorReadingCm: node.water_level,
    lastUpdated: formatRelativeTime(node.last_reading_at),
    flowRate: node.water_flow_rate,
    clogPercentage: node.clog_pct,
  }
}

function StatCard({ icon, title, value, subtitle, subtitleColor, }: {
  icon: keyof typeof Feather.glyphMap
  title: string
  value: string
  subtitle: string
  subtitleColor?: string
}) {
  return (
    <View
      className="flex-1 rounded-xl bg-white p-[15px]"
      style={{
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View className="mb-1.5 flex-row items-center gap-1.5">
        <Feather name={icon} size={14} color="#5B6472" />
        <Text className="text-xs font-semibold text-[#5B6472]">{title}</Text>
      </View>
      <Text className="mb-0.5 text-xl font-bold text-[#1A1A1A]">{value}</Text>
      <Text
        className="text-[11px] text-[#8A93A0]"
        style={subtitleColor ? { color: subtitleColor } : undefined}
      >
        {subtitle}
      </Text>
    </View>
  )
}

export default function TabOneScreen() {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null)

  const { nodes, mappableNodes, stats, composition, totalWasteKg, loading, refreshing, error, refetch } = useMapData()
  const { riskLevel } = useRainfallCondition()

  const canalNodes = useMemo(
    () =>
      mappableNodes.map((n) => ({
        id: n.node_id,
        latitude: n.hotspot_details!.latitude,
        longitude: n.hotspot_details!.longitude,
        status: (n.condition ?? 'Normal') as CanalStatus,
        label: `${n.node_name} – ${n.barangay_details?.barangay_name ?? ''}`,
      })),
    [mappableNodes]
  )

  const center = useMemo(() => {
    if (mappableNodes.length === 0) return FALLBACK_CENTER
    const lat = mappableNodes.reduce((sum, n) => sum + n.hotspot_details!.latitude, 0) / mappableNodes.length
    const lng = mappableNodes.reduce((sum, n) => sum + n.hotspot_details!.longitude, 0) / mappableNodes.length
    return { lat, lng }
  }, [mappableNodes])

  const selectedNode = useMemo(() => {
    if (selectedNodeId === null) return null
    const node = nodes.find((n) => n.node_id === selectedNodeId)
    return node ? getNodeDetail(node) : null
  }, [selectedNodeId, nodes])


  return (
    <SafeAreaView className="flex-1 bg-[#EDF2F7]" edges={['top']}>
      <ScrollView
        className="flex-1 bg-[#EDF2F7]"
        contentContainerClassName="items-center gap-2.5 p-[15px]"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refetch(true)} tintColor="#122A48" />
        }
      >
        <View className="w-full flex flex-row items-center justify-between -mt-2 px-1">
          <View></View>
          <Text className="ml-5 text-[21px] font-bold text-[#122A48]">Localized Canal Map</Text>
          <AlertBellButton />
        </View>

        <View className="w-full overflow-hidden rounded-xl">
          {error && (
            <View className="items-center justify-center p-10">
              <Text className="mb-2.5 font-semibold text-[#D81010]">Failed to load map data.</Text>
              <Pressable
                onPress={() => refetch()}
                className="rounded-lg border border-[#D8DCE2] px-4 py-2"
              >
                <Text className="text-[13px] text-[#5B6472]">Retry</Text>
              </Pressable>
            </View>
          )}

          {(loading || refreshing) && !error && (
            <>
              <View className="items-center justify-center p-10 flex flex-col gap-2">
                <ActivityIndicator color="#2F6FED" />
                <Text>Loading...</Text>
              </View>
            </>
          )}

          {!loading && !refreshing && !error && (
            <>
              <CanalMapScreen
                nodes={canalNodes}
                centerLat={center.lat}
                centerLng={center.lng}
                riskLevel={riskLevel}
                onMarkerPress={(id) => setSelectedNodeId(id as number)}
              />

              <View className="gap-2.5 p-3">
                <View className="flex-row gap-2.5">
                  <StatCard
                    icon="map-pin"
                    title="Monitoring Points"
                    value={String(stats.monitoringPointsTotal)}
                    subtitle="Sensor nodes in this barangay"
                  />

                  <StatCard
                    icon="alert-triangle"
                    title="Critical Nodes"
                    value={String(stats.criticalNodesCount)}
                    subtitle="Immediate action is needed"
                    subtitleColor="#E74C3C"
                  />
                </View>

                <View className="flex-row gap-2.5">
                  <StatCard
                    icon="slash"
                    title="Obstructed Canals"
                    value={String(stats.obstructedCanalsCount)}
                    subtitle={`${stats.awaitingResponseCount} awaiting response`}
                  />

                  <StatCard
                    icon="droplet"
                    title="Average water level"
                    value={stats.averageWaterLevelCm != null ? `${stats.averageWaterLevelCm} cm` : '—'}
                    subtitle="Across all nodes"
                  />
                </View>
              </View>

              <WasteCompositionCard
                totalKg={totalWasteKg}
                segments={composition.map((c) => ({ label: c.type, percent: c.percent, color: c.color }))}
              />
            </>
          )}
        </View>
        <NodeDetailSheet
          node={selectedNode}
          visible={selectedNode !== null}
          onClose={() => setSelectedNodeId(null)}
        />
      </ScrollView>
    </SafeAreaView>
  )
}