import { useEffect, useState } from 'react'
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../lib/api'
import { useClogEvent } from '../lib/ClogEventContext'

import { useLiveSocket } from '../lib/useLiveSocket'
import { ClogEvent } from '../types/clog-events'

function formatDate(iso?: string | null) {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--'
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date} ${time}`
}

const SEVERITY_STYLE: Record<string, { bg: string; text: string }> = {
  High:   { bg: '#FEE2E2', text: '#D81010' },
  Medium: { bg: '#FFF3E0', text: '#FF9705' },
  Low:    { bg: '#E7F7EE', text: '#1F9D55' },
}

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Detected:  { bg: '#FEE2E2', text: '#D81010', dot: '#D81010' },
  Responded: { bg: '#FFF3E0', text: '#FF9705', dot: '#FF9705' },
  Cleared:   { bg: '#E7F7EE', text: '#1F9D55', dot: '#1F9D55' },
  Verified:  { bg: '#E7F7EE', text: '#1F9D55', dot: '#1F9D55' },
}


export default function ClogDetails() {
  const { selectedEvent, setSelectedEvent } = useClogEvent()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [isOpeningReport, setIsOpeningReport] = useState(false)

  useEffect(() => {
    if (!selectedEvent) {
      router.replace('/clogs')
    }
  }, [selectedEvent])

  useLiveSocket<ClogEvent>(
    'ws/clog-events/',
    (incoming) => {
      if (selectedEvent && incoming.event_id === selectedEvent.event_id) {
        setSelectedEvent(incoming)
      }
    },
    () => {
      if (!selectedEvent) return
      api.get('/api/clog-events/').then((list) => {
        const match = Array.isArray(list) ? list.find((e: ClogEvent) => e.event_id === selectedEvent.event_id) : null
        if (match) setSelectedEvent(match)
      }).catch(() => {})
    }
  )

  if (!selectedEvent) return null

  const status = selectedEvent.status
  const isRespondedDone = status === 'Responded' || status === 'Cleared' || status === 'Verified'
  const isClearedDone = status === 'Cleared' || status === 'Verified'
  const sevStyle = SEVERITY_STYLE[selectedEvent.severity] ?? SEVERITY_STYLE.Low
  const statusStyle = STATUS_STYLE[status] ?? STATUS_STYLE.Detected

  const handleMarkAsResponded = async () => {
    setError('')
    setIsLoading(true)
    try {
      const updated = await api.patch(`/api/clog-events/${selectedEvent.event_id}/status/`, {
        status: 'Responded',
      })
      setSelectedEvent(updated)
    } catch (err: any) {
      setError(err?.error ?? 'Failed to update status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAsCleared = async () => {
    setError('')
    setIsLoading(true)
    try {
      const updated = await api.patch(`/api/clog-events/${selectedEvent.event_id}/status/`, {
        status: 'Cleared',
      })
      setSelectedEvent(updated)
    } catch (err: any) {
      setError(err?.error ?? 'Failed to update status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProceedToReport = async () => {
    setError('')
    setIsOpeningReport(true)
    try {
      // if a report already exists for this clog event, open it instead of creating a duplicate
      const res = await api.get('/api/canal-reports/mine/')
      const reports = res.results ?? res
      const existing = Array.isArray(reports)
        ? reports.find((r: { clog_event: number | null }) => r.clog_event === selectedEvent.event_id)
        : null

      if (existing?.is_submitted) {
        router.push({
          pathname: '/view-report',
          params: { id: String(existing.report_id) },
        } as any)
      } else if (existing) {
        router.push({
          pathname: '/new-report',
          params: { report_id: String(existing.report_id) },
        } as any)
      } else {
        router.push({
          pathname: '/new-report',
          params: { clog_event_id: String(selectedEvent.event_id) },
        } as any)
      }
    } catch (err: any) {
      setError(err?.detail ?? err?.error ?? 'Could not open the report form. Please try again.')
    } finally {
      setIsOpeningReport(false)
    }
  }

  return (
    <View className="flex-1 bg-[#FAFCFD]">
      <View className="px-4 pt-4 flex-row items-center mt-7 b">
        <Pressable onPress={() => router.back()} className="mr-2 flex gap-2 flex-row items-center">
          <MaterialCommunityIcons name="chevron-left" size={24} color="#122A48" />
          <Text className="text-base font-extrabold text-[#122A48]">Event Details</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="p-4 pb-10">
        <View className="bg-white rounded-3xl p-5 border border-[#F1F5F9]"
          style={{
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          {/* badges */}
          <View className="flex-row justify-between items-center">
            <View className="px-3 py-1 rounded-2xl" style={{ backgroundColor: sevStyle.bg }}>
              <Text className="text-[11px] font-extrabold tracking-wider" style={{ color: sevStyle.text }}>
                {selectedEvent.severity.toUpperCase()}
              </Text>
            </View>
            <View className="px-2.5 py-1 rounded-2xl flex-row items-center gap-1.5" style={{ backgroundColor: statusStyle.bg }}>
              <View className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusStyle.dot }} />
              <Text className="text-[11px] font-bold" style={{ color: statusStyle.text }}>{status}</Text>
            </View>
          </View>

          {/* title */}
          <View className="mt-3.5">
            <Text className="text-xl font-extrabold text-[#122A48]">
              {selectedEvent.barangay_details?.barangay_name ?? '—'}
            </Text>
            <Text className="text-xs text-[#94A3B8] mt-0.5 font-medium">
              {selectedEvent.node_details?.node_name ?? '—'}
            </Text>
          </View>

          {/* metric cards */}
          <View className="flex-row flex-wrap justify-between gap-3 mt-4">
            <View className="w-[48%] bg-white rounded-2xl p-3 flex-row items-center gap-2.5 border border-[#F1F5F9]"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#E0F2FE] items-center justify-center">
                <MaterialCommunityIcons name="widgets-outline" size={20} color="#1565BC" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-[#64748B] font-medium">Classification</Text>
                <Text className="text-xs font-extrabold text-[#122A48] mt-0.5" numberOfLines={1}>
                  {selectedEvent.classification_details?.dominant_waste_type ?? '—'}
                </Text>
              </View>
            </View>

            <View className="w-[48%] bg-white rounded-2xl p-3 flex-row items-center gap-2.5 border border-[#F1F5F9]"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#E0F2FE] items-center justify-center">
                <MaterialCommunityIcons name="chip" size={20} color="#1565BC" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-[#64748B] font-medium">Reading ID</Text>
                <Text className="text-xs font-extrabold text-[#122A48] mt-0.5" numberOfLines={1}>
                  {selectedEvent.reading_details?.reading_id ?? '—'}
                </Text>
              </View>
            </View>

            <View className="w-[48%] bg-white rounded-2xl p-3 flex-row items-center gap-2.5 border border-[#F1F5F9]"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#E0F2FE] items-center justify-center">
                <MaterialCommunityIcons name="water-outline" size={20} color="#1565BC" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-[#64748B] font-medium">Water Level</Text>
                <Text className="text-xs font-extrabold text-[#122A48] mt-0.5" numberOfLines={1}>
                  {selectedEvent.reading_details?.water_level != null
                    ? `${selectedEvent.reading_details.water_level} cm`
                    : '—'}
                </Text>
              </View>
            </View>

            <View className="w-[48%] bg-white rounded-2xl p-3 flex-row items-center gap-2.5 border border-[#F1F5F9]"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#E0F2FE] items-center justify-center">
                <MaterialCommunityIcons name="waves" size={20} color="#1565BC" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-[#64748B] font-medium">Water Flow</Text>
                <Text className="text-xs font-extrabold text-[#122A48] mt-0.5" numberOfLines={1}>
                  {selectedEvent.reading_details?.water_flow_rate != null
                    ? `${selectedEvent.reading_details.water_flow_rate} m/s`
                    : '—'}
                </Text>
              </View>
            </View>

            <View className="w-full bg-white rounded-2xl p-3 flex-row items-center gap-2.5 border border-[#F1F5F9]"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <View className="w-9 h-9 rounded-xl bg-[#E0F2FE] items-center justify-center">
                <MaterialCommunityIcons name="clock-outline" size={20} color="#1565BC" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] text-[#64748B] font-medium">Detected At</Text>
                <Text className="text-xs font-extrabold text-[#122A48] mt-0.5">
                  {formatDate(selectedEvent.detected_at)}
                </Text>
              </View>
            </View>
          </View>

          {/* timeline */}
          <View className="mt-5">
            <Text className="text-base font-extrabold text-[#122A48] mb-4">Timeline</Text>

            <View className="flex-row">
              <View className="items-center mr-3.5 w-6">
                <View className="w-6 h-6 rounded-full border-2 border-[#D81010] bg-white items-center justify-center">
                  <View className="w-2.5 h-2.5 rounded-full bg-[#D81010]" />
                </View>
                <View className={`w-0.5 flex-1 my-1 ${isRespondedDone ? 'bg-[#FF9705]' : 'bg-[#FECACA]'}`} />
              </View>
              <View className="pb-5">
                <Text className="text-sm font-extrabold text-[#122A48]">Detected</Text>
                <Text className="text-[11px] text-[#64748B] mt-0.5">{formatDate(selectedEvent.detected_at)}</Text>
                <Text className="text-[11px] text-[#64748B] mt-0.5">Detected by System</Text>
              </View>
            </View>

            <View className="flex-row">
              <View className="items-center mr-3.5 w-6">
                <View
                  className={`w-6 h-6 rounded-full border-2 bg-white items-center justify-center ${
                    isRespondedDone ? 'border-[#FF9705]' : 'border-[#CBD5E1]'
                  }`}
                >
                  {isRespondedDone && <View className="w-2.5 h-2.5 rounded-full bg-[#FF9705]" />}
                </View>
                <View className={`w-0.5 h-10 flex-1 my-1 ${isClearedDone ? 'bg-[#1F9D55]' : 'bg-[#E2E8F0]'}`} />
              </View>
              <View className="pb-5">
                <Text className="text-sm font-extrabold t ext-[#122A48]">Responded</Text>
                <Text className="text-[11px] text-[#64748B] mt-0.5">
                  {isRespondedDone ? 'Response team deployed' : 'Pending'}
                </Text>
                  {isRespondedDone && (
                    <Text className="text-[11px] text-[#64748B] mt-0.5">{formatDate(selectedEvent.responded_at)}</Text>
                  )}
                  {isRespondedDone && selectedEvent.responded_by_details && (
                    <Text className="text-[11px] text-[#64748B] mt-0.5">
                      by: {selectedEvent.responded_by_details.first_name} {selectedEvent.responded_by_details.last_name}
                    </Text>
                  )}
              </View>
            </View>

            <View className="flex-row ">
              <View className="items-center mr-3.5 w-6">
                <View
                  className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                    isClearedDone ? 'border-[#1F9D55] bg-[#E7F7EE]' : 'border-[#CBD5E1] bg-white'
                  }`}
                >
                  {isClearedDone && <MaterialCommunityIcons name="check" size={14} color="#1F9D55" />}
                </View>
              </View>
              <View>
                <Text className="text-sm font-extrabold text-[#122A48]">Cleared</Text>
                <Text className="text-[11px] text-[#64748B] mt-0.5">
                  {isClearedDone ? 'Clearing operation completed' : 'Pending'}
                </Text>
                  {isClearedDone && (
                    <Text className="text-[11px] text-[#64748B] mt-0.5">{formatDate(selectedEvent.resolved_at)}</Text>
                  )}
                  {isClearedDone && selectedEvent.cleared_by_details && (
                    <Text className="text-[11px] text-[#64748B] mt-0.5">
                      by: {selectedEvent.cleared_by_details.first_name} {selectedEvent.cleared_by_details.last_name}
                    </Text>
                  )}
              </View>
            </View>
          </View>

          {error ? <Text className="text-[#D81010] text-xs text-center mb-2">{error}</Text> : null}

          {/* action buttons */}
          <View className='pt-3'>
            {status === 'Detected' && (
              <Pressable
                onPress={handleMarkAsResponded}
                disabled={isLoading}
                className="bg-[#122A48] py-3.5 rounded-xl items-center mt-2"
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-sm">Mark as Responded</Text>
                )}
              </Pressable>
            )}

            {status === 'Responded' && (
              <Pressable onPress={handleMarkAsCleared} disabled={isLoading} className="bg-[#1F9D55] py-3.5 rounded-xl items-center mt-2">
                {isLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-sm">Mark as Cleared</Text>}
              </Pressable>
            )}

            {isClearedDone && (
              <Pressable
                onPress={handleProceedToReport}
                disabled={isOpeningReport}
                className="bg-[#1F9D55] py-3.5 rounded-xl items-center mt-2"
              >
                {isOpeningReport ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-sm">Proceed to Fill Report Form</Text>
                )}
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}