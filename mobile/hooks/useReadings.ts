import { useState, useCallback, useRef } from 'react'
import { useFocusEffect } from 'expo-router'
import { api } from '../lib/api'
import { useAuth } from '../lib/AuthContext'
import { useLiveSocket } from '../lib/useLiveSocket'
import { currentMonthValue } from '../lib/months'
import type { ReadingStatus, ReadingsPage, ReadingsSummary, SensorReading } from '../types/readings'

export type SeverityTab = 'All' | ReadingStatus

export const READINGS_PAGE_SIZE = 10

const EMPTY_SUMMARY: ReadingsSummary = { total: 0, normal: 0, warning: 0, critical: 0 }

export function useReadings() {
  const { user } = useAuth()

  const [readings, setReadings] = useState<SensorReading[]>([])
  const [summary, setSummary] = useState<ReadingsSummary>(EMPTY_SUMMARY)
  const [matchCount, setMatchCount] = useState(0) // rows matching the selected tab
  const [selectedTab, setSelectedTab] = useState<SeverityTab>('All')
  const [month, setMonth] = useState<string>(currentMonthValue())
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(false)

  // latest values for callbacks that outlive a render (focus + socket)
  const tabRef = useRef<SeverityTab>('All')
  const pageRef = useRef(1)
  const monthRef = useRef<string>(currentMonthValue())
  const hasLoadedOnce = useRef(false)
  const requestId = useRef(0) // drops responses from superseded requests

  const fetchReadings = useCallback(async (tab: SeverityTab, pageNum: number, isRefresh = false) => {
    const myRequest = ++requestId.current
    if (isRefresh) setRefreshing(true)
    else if (!hasLoadedOnce.current) setLoading(true)
    setFetching(true)
    setError(false)

    try {
      const params = new URLSearchParams({
        month: monthRef.current,
        page: String(pageNum),
        page_size: String(READINGS_PAGE_SIZE),
      })
      if (tab !== 'All') params.set('severity', tab)

      const data: ReadingsPage = await api.get(`/api/sensor-readings/?${params.toString()}`)
      if (myRequest !== requestId.current) return

      setReadings(data.results ?? [])
      setMatchCount(data.count ?? 0)
      if (data.summary) setSummary(data.summary)
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
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchReadings(tabRef.current, pageRef.current)
    }, [fetchReadings])
  )

  // The readings socket is shared with the map, so every barangay's readings arrive here.
  // Drop anything that isn't ours before it touches the list or the counts.
  useLiveSocket<SensorReading>(
    'ws/sensor-readings/',
    (incoming) => {
      if (incoming.reading_id == null) return

      // a brand-new reading only belongs to the current month (or All Time)
      if (monthRef.current !== 'All' && monthRef.current !== currentMonthValue()) return

      if (user?.user_role === 'Barangay') {
        const barangayId = incoming.node_details?.barangay_details?.barangay_id
        if (barangayId == null || barangayId !== user.barangay_id) return
      }

      const key = incoming.reading_status.toLowerCase() as 'normal' | 'warning' | 'critical'
      setSummary((prev) => ({ ...prev, total: prev.total + 1, [key]: prev[key] + 1 }))

      const matchesTab = tabRef.current === 'All' || tabRef.current === incoming.reading_status
      if (!matchesTab) return

      setMatchCount((c) => c + 1)
      if (pageRef.current === 1) {
        setReadings((prev) =>
          [incoming, ...prev.filter((r) => r.reading_id !== incoming.reading_id)].slice(0, READINGS_PAGE_SIZE)
        )
      }
    },
    () => fetchReadings(tabRef.current, pageRef.current)
  )

  const selectTab = (tab: SeverityTab) => {
    tabRef.current = tab
    pageRef.current = 1
    setSelectedTab(tab)
    setPage(1)
    fetchReadings(tab, 1)
  }

  const selectMonth = (value: string) => {
    monthRef.current = value
    pageRef.current = 1
    setMonth(value)
    setPage(1)
    fetchReadings(tabRef.current, 1)
  }

  const changePage = (nextPage: number) => {
    pageRef.current = nextPage
    setPage(nextPage)
    fetchReadings(tabRef.current, nextPage)
  }

  return {
    readings,
    summary,
    selectedTab,
    month,
    page,
    totalPages: Math.ceil(matchCount / READINGS_PAGE_SIZE),
    loading,
    refreshing,
    fetching,
    error,
    selectTab,
    selectMonth,
    changePage,
    refresh: () => fetchReadings(tabRef.current, pageRef.current, true),
  }
}