import { useRef } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Pagination from '../../components/alerts/Pagination'
import AlertBellButton from '@/components/alerts/AlertBellButton'
import { useReadings, type SeverityTab } from '../../hooks/useReadings'
import type { ReadingStatus } from '../../types/readings'
import MonthFilter from '../../components/common/MonthFilter'
import { monthLabel } from '../../lib/months'

const SEVERITY_TABS: SeverityTab[] = ['All', 'Normal', 'Warning', 'Critical']

const STATUS_STYLE: Record<ReadingStatus, { bg: string; text: string }> = {
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

function formatDate(iso?: string | null) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--'
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} ${time}`
}

// same thresholds the backend uses for clog events (Low 30 / Medium 60 / High 80)
function clogSeverity(pct: number | null): { label: string; color: string } {
  if (pct == null) return { label: '', color: '#CBD5E1' }
  if (pct >= 80) return { label: 'High', color: '#D81010' }
  if (pct >= 60) return { label: 'Medium', color: '#FF9705' }
  if (pct >= 30) return { label: 'Low', color: '#1F9D55' }
  return { label: '', color: '#94A3B8' }
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-1 bg-white p-3.5 rounded-xl border border-[#F1F5F9]" style={CARD_SHADOW}>
      <Text className="text-[11px] text-[#64748B] font-semibold">{label}</Text>
      <Text className="text-[22px] font-extrabold mt-1" style={{ color }}>{value}</Text>
    </View>
  )
}

export default function ReadingsScreen() {
  const scrollRef = useRef<ScrollView>(null)
  const {
    readings, summary, selectedTab, month, page, totalPages,
    loading, refreshing, fetching, error, selectTab, selectMonth, changePage, refresh,
  } = useReadings()

  const tabCounts: Record<SeverityTab, number> = {
    All: summary.total,
    Normal: summary.normal,
    Warning: summary.warning,
    Critical: summary.critical,
  }

  const handlePageChange = (next: number) => {
    changePage(next)
    scrollRef.current?.scrollTo({ y: 0, animated: true })
  }

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
        <View></View>
        <Text className="ml-5 text-[21px] font-bold text-center text-[#122A48]">Sensor Readings</Text>
        <AlertBellButton />
      </View>

      {/* severity tabs */}
      <View className="flex justify-center items-center">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 gap-2">
          {SEVERITY_TABS.map((tab) => {
            const isActive = selectedTab === tab
            return (
              <Pressable
                key={tab}
                onPress={() => selectTab(tab)}
                className={`px-4 py-2 rounded-full justify-center items-center ${
                  isActive ? 'bg-[#122A48]' : 'bg-[#F1F5F9]'
                }`}
              >
                <Text className={`text-[13px] font-semibold ${isActive ? 'text-white' : 'text-[#64748B]'}`}>
                  {tab} ({tabCounts[tab]})
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerClassName="p-4 gap-3 pb-5 pt-2"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#122A48" />}
      >
        {error && (
          <Text className="text-[#D81010] text-xs text-center mb-1">
            Couldn't load readings. Pull down to try again.
          </Text>
        )}

        <View className='flex justify-center items-center'>
          <MonthFilter value={month} onChange={selectMonth} />
        </View>

        {/* summary cards */}
        <View className="flex-row gap-3">
          <SummaryCard label="Total Readings" value={summary.total} color="#122A48" />
          <SummaryCard label="Normal" value={summary.normal} color="#1F9D55" />
        </View>
        <View className="flex-row gap-3">
          <SummaryCard label="Warning" value={summary.warning} color="#FF9705" />
          <SummaryCard label="Critical" value={summary.critical} color="#D81010" />
        </View>

        {/* list */}
        {readings.length === 0 ? (
          <Text className="text-[#94A3B8] text-sm text-center mt-8">
            No readings found for {selectedTab} status in {monthLabel(month)}.
          </Text>
        ) : (
          readings.map((item) => {
            const statusStyle = STATUS_STYLE[item.reading_status] ?? STATUS_STYLE.Normal
            const hotspotName = item.node_details?.hotspot_details?.name ?? '—'
            const nodeName = item.node_details?.node_name ?? '—'
            const barangayName = item.node_details?.barangay_details?.barangay_name
            const clog = item.clog_pct
            const clogInfo = clogSeverity(clog)
            const flow = item.water_flow_rate

            return (
              <View
                key={item.reading_id}
                className="bg-white rounded-2xl p-4 border border-[#F1F5F9]"
                style={CARD_SHADOW}
              >
                <View className="flex-row justify-between items-start">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-extrabold text-[#122A48]" numberOfLines={1}>{hotspotName}</Text>
                    <Text className="text-xs text-[#94A3B8] mt-0.5">{nodeName}</Text>
                                        <Text className="text-xs text-[#94A3B8] mt-0.5">
                      {barangayName ? `${barangayName} · ${nodeName}` : nodeName}
                    </Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-2xl" style={{ backgroundColor: statusStyle.bg }}>
                    <Text className="text-[10px] font-extrabold" style={{ color: statusStyle.text }}>
                      {item.reading_status}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between mt-2.5 pt-2.5 border-t border-[#F1F5F9]">
                  <View className="flex-[1.2]">
                    <Text className="text-[10px] text-[#94A3B8] font-medium">Recorded At</Text>
                    <Text className="text-[11px] font-bold text-[#334155] mt-0.5" numberOfLines={1}>
                      {formatDate(item.timestamp)}
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-[10px] text-[#94A3B8] font-medium">Water Level</Text>
                    <Text className="text-xs font-bold text-[#334155] mt-0.5">
                      {item.water_level != null ? `${item.water_level.toFixed(1)} cm` : '--'}
                    </Text>
                  </View>
                  <View className="flex-1 items-end">
                    <Text className="text-[10px] text-[#94A3B8] font-medium">Water Flow</Text>
                    <Text className="text-xs font-bold text-[#334155] mt-0.5">
                      {flow != null ? `${flow.toFixed(4)} m/s` : '--'}
                    </Text>
                  </View>
                </View>

                <View className="mt-2.5 pt-2.5 border-t border-[#F1F5F9]">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-[10px] text-[#94A3B8] font-medium">Clog Percentage</Text>
                    <Text className="text-[11px] font-bold" style={{ color: clogInfo.color }}>
                      {clog != null
                        ? `${clog.toFixed(1)}%${clogInfo.label ? ` · ${clogInfo.label}` : ''}`
                        : '--'}
                    </Text>
                  </View>
                  <View className="h-1.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(clog ?? 0, 100)}%`, backgroundColor: clogInfo.color }}
                    />
                  </View>
                </View>
              </View>
            )
          })
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </ScrollView>
    </SafeAreaView>
  )
}