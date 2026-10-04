import { useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { api } from '../../lib/api'
import { useClogEvent } from '../../lib/ClogEventContext'
import { ClogEvent } from '../../types/clog-events'
import Pagination from '../../components/alerts/Pagination'
import { SafeAreaView } from 'react-native-safe-area-context'
import AlertBellButton from '@/components/alerts/AlertBellButton'
import MonthFilter from '../../components/common/MonthFilter'
import { currentMonthValue, monthLabel, monthOfIso } from '../../lib/months'

import { useAuth } from '../../lib/AuthContext'
import { useLiveSocket } from '../../lib/useLiveSocket'

const PAGE_SIZE = 5
const SEVERITY_TABS = ['All', 'High', 'Medium', 'Low'] as const

const SEVERITY_STYLE: Record<string, { bg: string; text: string }> = {
  High:   { bg: '#FEE2E2', text: '#D81010' },
  Medium: { bg: '#FFF3E0', text: '#FF9705' },
  Low:    { bg: '#E7F7EE', text: '#1F9D55' },
}

function formatDate(iso?: string | null) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--'
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} ${time}`
}

export default function ClogEventsScreen() {
  const router = useRouter()
  const { setSelectedEvent } = useClogEvent()
  const { user } = useAuth()
  const hasLoadedOnce = useRef(false)

  const [events, setEvents] = useState<ClogEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [selectedTab, setSelectedTab] = useState<(typeof SEVERITY_TABS)[number]>('All')
  const [page, setPage] = useState(1)

  const [month, setMonth] = useState(currentMonthValue())
  const [fetching, setFetching] = useState(false)
  const monthRef = useRef(currentMonthValue())
  const requestId = useRef(0)

  const fetchEvents = async (isRefresh = false) => {
    const myRequest = ++requestId.current
    if (isRefresh) {
      setRefreshing(true)
    } else if (!hasLoadedOnce.current) {
      setLoading(true)
    }
    setFetching(true)
    setError(false)
    try {
      const data = await api.get(`/api/clog-events/?month=${monthRef.current}`)
      if (myRequest !== requestId.current) return
      setEvents(Array.isArray(data) ? data : [])
      hasLoadedOnce.current = true
    } catch {
      if (myRequest === requestId.current) setError(true)
    } finally {
      if (myRequest === requestId.current) {
        setLoading(false)
        setRefreshing(false)
        setFetching(false)
      }
    }
  }

  const selectMonth = (value: string) => {
    monthRef.current = value
    setMonth(value)
    setPage(1)
    fetchEvents()
  }

  useFocusEffect(
    useCallback(() => {
      fetchEvents()
    }, [])
  )

  useLiveSocket<ClogEvent>(
    'ws/clog-events/',
    (incoming) => {
      if (user?.user_role === 'Barangay' && incoming.barangay !== user.barangay_id) {
        return
      }
      setEvents((prev) => {
        const exists = prev.some((e) => e.event_id === incoming.event_id)
        if (exists) return prev.map((e) => (e.event_id === incoming.event_id ? incoming : e))
        const inView = monthRef.current === 'All' || monthOfIso(incoming.detected_at) === monthRef.current
        return inView ? [incoming, ...prev] : prev
      })
    },
    () => fetchEvents()
  )

  const filteredEvents = events
    .filter(e => selectedTab === 'All' || e.severity === selectedTab)
    .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())

  const totalPages = Math.ceil(filteredEvents.length / PAGE_SIZE)
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredEvents.slice(start, start + PAGE_SIZE)
  }, [filteredEvents, page])

  const totalCount = events.length
  const detectedCount = events.filter(e => e.status === 'Detected').length
  const respondedCount = events.filter(e => e.status === 'Responded').length
  const resolvedCount = events.filter(e => e.status === 'Cleared' || e.status === 'Verified').length

  const handlePress = (event: ClogEvent) => {
    setSelectedEvent(event)
    router.push('/clog-details')
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
        <Text className="ml-5 text-[21px] font-bold text-center text-[#122A48]">Clog Events</Text>
        <AlertBellButton />
      </View>

      {/* severity tabs */}
      <View className="flex justify-center items-center">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 gap-2">
          {SEVERITY_TABS.map(tab => {
            const isActive = selectedTab === tab
            const count = tab === 'All' ? events.length : events.filter(e => e.severity === tab).length
            return (
              <Pressable
                key={tab}
                onPress={() => { setSelectedTab(tab); setPage(1) }}
                className={`px-4 py-2 rounded-full justify-center items-center ${
                  isActive ? 'bg-[#122A48]' : 'bg-[#F1F5F9]'
                }`}
              >
                <Text className={`text-[13px] font-semibold ${isActive ? 'text-white' : 'text-[#64748B]'}`}>
                  {tab} ({count})
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerClassName="p-4 gap-3 pb-5 pt-2"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchEvents(true)} tintColor="#122A48" />
        }
      >
        <View className='flex justify-center items-center'>
          <MonthFilter value={month} onChange={selectMonth}/>
        </View>
        
        {error && (
          <Text className="text-[#D81010] text-xs text-center mb-1">
            Couldn't load clog events. Pull down to try again.
          </Text>
        )}

        {/* summary cards */}
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white p-3.5 rounded-xl border border-[#F1F5F9]"
            style={{
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text className="text-[11px] text-[#64748B] font-semibold">Total Events</Text>
            <Text className="text-[22px] font-extrabold text-[#122A48] mt-1">{totalCount}</Text>
          </View>
          <View className="flex-1 bg-white p-3.5 rounded-xl border border-[#F1F5F9]"
            style={{
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text className="text-[11px] text-[#64748B] font-semibold">Detected</Text>
            <Text className="text-[22px] font-extrabold text-[#D81010] mt-1">{detectedCount}</Text>
          </View>
        </View>
        <View className="flex-row gap-3">
          <View className="flex-1 bg-white p-3.5 rounded-xl border border-[#F1F5F9]" 
            style={{
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text className="text-[11px] text-[#64748B] font-semibold">Responded</Text>
            <Text className="text-[22px] font-extrabold text-[#FF9705] mt-1">{respondedCount}</Text>
          </View>
          <View className="flex-1 bg-white p-3.5 rounded-xl border border-[#F1F5F9]" 
            style={{
              elevation: 2,
              shadowColor: '#000',
              shadowOpacity: 0.06,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <Text className="text-[11px] text-[#64748B] font-semibold">Resolved</Text>
            <Text className="text-[22px] font-extrabold text-[#1F9D55] mt-1">{resolvedCount}</Text>
          </View>
        </View>

        {/* list */}
        {filteredEvents.length === 0 ? (
          <Text className="text-[#94A3B8] text-sm text-center mt-8">
            No events found for {selectedTab} severity in {monthLabel(month)}.
          </Text>
        ) : (
          paginatedEvents.map(item => {
            const sevStyle = SEVERITY_STYLE[item.severity] ?? SEVERITY_STYLE.Low
            const locationName = item.barangay_details?.barangay_name ?? '—'
            const nodeName = item.node_details?.node_name ?? '—'
            const waterLevel = item.reading_details?.water_level
            const waterFlow = item.reading_details?.water_flow_rate

            return (
              <Pressable
                key={item.event_id}
                onPress={() => handlePress(item)}
                className="bg-white rounded-2xl p-4 border border-[#F1F5F9]"
                style={{
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                }}
              >
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="text-base font-extrabold text-[#122A48]">{locationName}</Text>
                    <Text className="text-xs text-[#94A3B8] mt-0.5">{nodeName}</Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-2xl" style={{ backgroundColor: sevStyle.bg }}>
                    <Text className="text-[10px] font-extrabold" style={{ color: sevStyle.text }}>
                      {item.severity}
                    </Text>
                  </View>
                </View>

                <View className="flex-row justify-between mt-2.5 pt-2.5 border-t border-[#F1F5F9]">
                  <View className="flex-[1.2]">
                    <Text className="text-[10px] text-[#94A3B8] font-medium">Detected At</Text>
                    <Text className="text-[11px] font-bold text-[#334155] mt-0.5" numberOfLines={1}>
                      {formatDate(item.detected_at)}
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-[10px] text-[#94A3B8] font-medium">Water Level</Text>
                    <Text className="text-xs font-bold text-[#334155] mt-0.5">
                      {waterLevel != null ? `${waterLevel} cm` : '--'}
                    </Text>
                  </View>
                  <View className="flex-1 items-end">
                    <Text className="text-[10px] text-[#94A3B8] font-medium">Water Flow</Text>
                    <Text className="text-xs font-bold text-[#334155] mt-0.5">
                      {waterFlow != null ? `${waterFlow} m/s` : '--'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            )
          })
        )}

        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </ScrollView>
    </SafeAreaView>
  )
}