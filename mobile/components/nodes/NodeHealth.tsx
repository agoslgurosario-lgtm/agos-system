import { useRef } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import Pagination from '../alerts/Pagination'
import DateRangeFilter from '../common/DateRangeFilter'
import { rangeLabel } from '../../lib/dateRange'
import { useNodeHealth, type HealthTab } from '../../hooks/useNodeHealth'
import type { NodeHealthLog } from '../../types/health'

const TABS: HealthTab[] = ['All', 'Normal', 'Warning', 'Critical']

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

// same curve the web uses: 3.0 V = 0%, 4.2 V = 100%
const batteryPct = (v: number) => Math.min(100, Math.max(0, Math.round(((v - 3.0) / 1.2) * 100)))

function signalWord(dbm: number) {
  if (dbm >= -65) return 'Excellent'
  if (dbm >= -75) return 'Good'
  if (dbm >= -85) return 'Fair'
  if (dbm >= -95) return 'Weak'
  return 'No signal'
}

function formatDate(iso?: string | null) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--'
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} ${time}`
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: '#F1F5F9', text: '#64748B' }
  return (
    <View className="px-2.5 py-1 rounded-2xl" style={{ backgroundColor: s.bg }}>
      <Text className="text-[10px] font-extrabold" style={{ color: s.text }}>{status}</Text>
    </View>
  )
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View className="flex-1 bg-[#F8FAFC] rounded-xl p-3">
      <Text className="text-[10px] text-[#94A3B8] font-medium">{label}</Text>
      <Text className="text-[15px] font-extrabold text-[#122A48] mt-0.5">{value}</Text>
      {!!sub && <Text className="text-[10px] text-[#64748B] mt-0.5">{sub}</Text>}
    </View>
  )
}

function LatestCard({ log }: { log: NodeHealthLog }) {
  return (
    <View className="bg-white rounded-2xl p-4 border border-[#F1F5F9]" style={CARD_SHADOW}>
      <View className="flex-row justify-between items-center">
        <View>
          <Text className="text-[13px] font-bold text-[#122A48]">Latest Check</Text>
          <Text className="text-[11px] text-[#94A3B8] mt-0.5">{formatDate(log.checked_at)}</Text>
        </View>
        <StatusBadge status={log.status} />
      </View>

      <View className="flex-row gap-2 mt-3">
        <Metric
          label="Battery"
          value={log.battery_voltage != null ? `${log.battery_voltage.toFixed(2)} V` : '--'}
          sub={log.battery_voltage != null ? `${batteryPct(log.battery_voltage)}% charge` : undefined}
        />
        <Metric
          label="Signal"
          value={log.signal_strength != null ? `${log.signal_strength} dBm` : '--'}
          sub={log.signal_strength != null ? signalWord(log.signal_strength) : undefined}
        />
      </View>
      <View className="flex-row gap-2 mt-2">
        <Metric
          label="Water Sensor"
          value={log.sensor_continuity == null ? '--' : log.sensor_continuity ? 'OK' : 'No echo'}
          sub={log.sensor_continuity === false ? 'Please check the sensor' : undefined}
        />
        <Metric label="Firmware" value={log.firmware_version ?? '--'} />
      </View>
    </View>
  )
}

function HistoryRow({ log }: { log: NodeHealthLog }) {
  return (
    <View className="bg-white rounded-2xl p-3.5 border border-[#F1F5F9]" style={CARD_SHADOW}>
      <View className="flex-row justify-between items-center">
        <Text className="text-[11px] font-bold text-[#334155]">{formatDate(log.checked_at)}</Text>
        <StatusBadge status={log.status} />
      </View>
      <View className="flex-row justify-between mt-2.5 pt-2.5 border-t border-[#F1F5F9]">
        <View className="flex-1">
          <Text className="text-[10px] text-[#94A3B8] font-medium">Battery</Text>
          <Text className="text-xs font-bold text-[#334155] mt-0.5">
            {log.battery_voltage != null ? `${log.battery_voltage.toFixed(2)} V (${batteryPct(log.battery_voltage)}%)` : '--'}
          </Text>
        </View>
        <View className="flex-1 items-center">
          <Text className="text-[10px] text-[#94A3B8] font-medium">Signal</Text>
          <Text className="text-xs font-bold text-[#334155] mt-0.5">
            {log.signal_strength != null ? `${log.signal_strength} dBm` : '--'}
          </Text>
        </View>
        <View className="flex-1 items-end">
          <Text className="text-[10px] text-[#94A3B8] font-medium">Sensor</Text>
          <Text
            className="text-xs font-bold mt-0.5"
            style={{ color: log.sensor_continuity === false ? '#D81010' : '#334155' }}
          >
            {log.sensor_continuity == null ? '--' : log.sensor_continuity ? 'OK' : 'No echo'}
          </Text>
        </View>
      </View>
    </View>
  )
}

export default function NodeHealth({ nodeId }: { nodeId: number }) {
  const scrollRef = useRef<ScrollView>(null)
  const {
    latest, logs, summary, tab, range, page, totalPages,
    loading, refreshing, fetching, error, selectTab, selectRange, changePage, refresh,
  } = useNodeHealth(nodeId)

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#2F6FED" />
        <Text>Loading...</Text>
      </View>
    )
  }

  const tabCounts: Record<HealthTab, number> = {
    All: summary.total,
    Normal: summary.normal,
    Warning: summary.warning,
    Critical: summary.critical,
  }

  return (
    <ScrollView
      ref={scrollRef}
      contentContainerClassName="p-4 gap-3 pb-5 pt-2"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#122A48" />}
    >
      {error && (
        <Text className="text-[#D81010] text-xs text-center mb-1">
          Couldn't load device health. Pull down to try again.
        </Text>
      )}

      {latest ? (
        <LatestCard log={latest} />
      ) : (
        !error && (
          <View className="bg-white rounded-2xl p-6 items-center border border-[#F1F5F9]" style={CARD_SHADOW}>
            <Text className="text-sm font-semibold text-[#122A48]">No health data yet</Text>
            <Text className="text-xs text-[#94A3B8] mt-1 text-center">This device hasn't reported its status yet.</Text>
          </View>
        )
      )}

      <Text className="text-[15px] font-bold text-[#122A48] mt-2">Health History</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
        {TABS.map((t) => {
          const active = tab === t
          return (
            <Pressable
              key={t}
              onPress={() => selectTab(t)}
              className={`px-4 py-2 rounded-full justify-center items-center ${active ? 'bg-[#122A48]' : 'bg-[#F1F5F9]'}`}
            >
              <Text className={`text-[13px] font-semibold ${active ? 'text-white' : 'text-[#64748B]'}`}>
                {t} ({tabCounts[t]})
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <View className="flex justify-center items-center">
        <DateRangeFilter from={range.from} to={range.to} onChange={selectRange} loading={fetching} />
      </View>

      {logs.length === 0 ? (
        <Text className="text-[#94A3B8] text-sm text-center mt-6">
          No {tab === 'All' ? '' : `${tab} `}health checks in {rangeLabel(range.from, range.to)}.
        </Text>
      ) : (
        logs.map((l) => <HistoryRow key={l.health_id} log={l} />)
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={(p) => { changePage(p); scrollRef.current?.scrollTo({ y: 0, animated: true }) }}
      />
    </ScrollView>
  )
}