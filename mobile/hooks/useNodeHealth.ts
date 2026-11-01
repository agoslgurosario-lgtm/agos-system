import { useState, useCallback, useRef } from 'react'
import { useFocusEffect } from 'expo-router'
import { api } from '../lib/api'
import { currentMonthRange } from '../lib/dateRange'
import type { NodeHealthLog } from '../types/health'

export type HealthTab = 'All' | 'Normal' | 'Warning' | 'Critical'
export const HEALTH_PAGE_SIZE = 10

export function useNodeHealth(nodeId: number) {
  const [latest, setLatest] = useState<NodeHealthLog | null>(null)
  const [logs, setLogs] = useState<NodeHealthLog[]>([])
  const [matchCount, setMatchCount] = useState(0)
  const [summary, setSummary] = useState({ total: 0, normal: 0, warning: 0, critical: 0 })
  const [tab, setTab] = useState<HealthTab>('All')
  const [range, setRange] = useState(currentMonthRange())
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState(false)

  const tabRef = useRef<HealthTab>('All')
  const rangeRef = useRef(currentMonthRange())
  const pageRef = useRef(1)
  const requestId = useRef(0) // drops responses from superseded requests
  const loadedOnce = useRef(false)

  const fetchAll = useCallback(async (isRefresh = false) => {
    const mine = ++requestId.current
    if (isRefresh) setRefreshing(true)
    else if (!loadedOnce.current) setLoading(true)
    setFetching(true)
    setError(false)

    try {
      const params = new URLSearchParams({
        page: String(pageRef.current),
        page_size: String(HEALTH_PAGE_SIZE),
      })
      if (tabRef.current !== 'All') params.set('status', tabRef.current)
      const { from, to } = rangeRef.current
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const [list, newest] = await Promise.all([
        api.get(`/api/system-health/node/${nodeId}/?${params.toString()}`),
        api.get(`/api/system-health/node/${nodeId}/?page_size=1`), // latest check, ignores filters
      ])
      if (mine !== requestId.current) return

      setLogs(list.results ?? [])
      setMatchCount(list.count ?? 0)
      if (list.summary) setSummary(list.summary)
      setLatest((newest.results ?? [])[0] ?? null)
      loadedOnce.current = true
    } catch {
      if (mine === requestId.current) setError(true)
    } finally {
      if (mine === requestId.current) {
        setLoading(false)
        setRefreshing(false)
        setFetching(false)
      }
    }
  }, [nodeId])

  useFocusEffect(useCallback(() => { fetchAll() }, [fetchAll]))

  const selectTab = (t: HealthTab) => {
    tabRef.current = t; pageRef.current = 1
    setTab(t); setPage(1); fetchAll()
  }
  const selectRange = (from: string, to: string) => {
    rangeRef.current = { from, to }; pageRef.current = 1
    setRange({ from, to }); setPage(1); fetchAll()
  }
  const changePage = (p: number) => {
    pageRef.current = p
    setPage(p); fetchAll()
  }

  return {
    latest, logs, matchCount, summary, tab, range, page,
    totalPages: Math.ceil(matchCount / HEALTH_PAGE_SIZE),
    loading, refreshing, fetching, error,
    selectTab, selectRange, changePage,
    refresh: () => fetchAll(true),
  }
}