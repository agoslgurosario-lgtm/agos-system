import { useState, useCallback, useRef } from 'react'
import { useFocusEffect } from 'expo-router'
import { api } from '../lib/api'
import type { SensorNodeApi } from '../types/map'

const POLL_MS = 60000

export function useNodes() {
  const [nodes, setNodes] = useState<SensorNodeApi[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const loadedOnce = useRef(false)

  const fetchNodes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else if (!loadedOnce.current) setLoading(true)
    setError(false)
    try {
      const data = await api.get('/api/sensor-nodes/')
      setNodes(data.results ?? data)
      loadedOnce.current = true
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // load when the tab is focused, keep fresh while it's open
  useFocusEffect(
    useCallback(() => {
      fetchNodes()
      const t = setInterval(() => fetchNodes(), POLL_MS)
      return () => clearInterval(t)
    }, [fetchNodes])
  )

  return { nodes, loading, refreshing, error, refresh: () => fetchNodes(true) }
}