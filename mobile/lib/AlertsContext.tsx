import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react'
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { api, BASE_URL, getAccessToken } from './api'
import { useAuth } from './AuthContext'
import { resolveSoundSource } from './soundUtils'

type AlertsContextType = {
  unreadCount: number
  refreshUnreadCount: () => Promise<void>
}

type AlertSoundConfig = {
  sound_enabled: boolean
  critical_sound: string
  warning_sound: string
  info_sound: string
}

// same mapping used on web (frontend/components/Header/index.tsx) — keep in sync
const SEVERITY_MAP: Record<string, 'critical' | 'warning' | 'info'> = {
  Critical_Clog: 'critical',
  Moderate_Clog_Alert: 'warning',
  Water_Level_Rising: 'warning',
  Low_Clog_Alert: 'info',
  Node_Offline: 'info',
  Low_Battery: 'info',
  Weak_Signal: 'info',
  Sensor_Failure: 'info',
  Waste_Type_Rejected: 'info',
}

const SEVERITY_RANK: Record<string, number> = { critical: 3, warning: 2, info: 1 }

const AlertsContext = createContext<AlertsContextType | undefined>(undefined)

const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000
const SAFETY_POLL_INTERVAL_MS = 60000 // backstop in case the socket silently drops
const SOUND_CONFIG_POLL_INTERVAL_MS = 30000

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(BASE_RECONNECT_DELAY_MS)
  const safetyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const soundConfigRef = useRef<AlertSoundConfig | null>(null)
  const seenAlertIdsRef = useRef<Set<number>>(new Set())
  const pendingAlertTypesRef = useRef<string[]>([])
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshUnreadCount = useCallback(async () => {
    try {
      const data = await api.get('/api/alerts/unread-count/')
      setUnreadCount(data.unread_count ?? 0)
    } catch {
      // network hiccup, keep showing the last known count
    }
  }, [])

  // let alert sounds play even if the phone's silent switch is on (iOS)
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) {
      soundConfigRef.current = null
      return
    }

    let cancelled = false
    async function loadSoundConfig() {
      try {
        const data = await api.get('/api/alert-sounds/config/')
        if (!cancelled) soundConfigRef.current = data
      } catch {
      }
    }

    loadSoundConfig()
    const interval = setInterval(loadSoundConfig, SOUND_CONFIG_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [user])
  
  const playAlertSound = useCallback((severity: 'critical' | 'warning' | 'info') => {
    const config = soundConfigRef.current
    if (!config || !config.sound_enabled) return

    const soundValue =
      severity === 'critical' ? config.critical_sound :
      severity === 'warning' ? config.warning_sound :
      config.info_sound

    try {
      const player = createAudioPlayer(resolveSoundSource(soundValue))
      player.play()
      // alert sounds are capped at 10s server-side, so this is a generous safety cleanup
      setTimeout(() => player.remove(), 12000)
    } catch {
    }
  }, [])

  const queueAlertSound = useCallback((alert: { alert_id?: number; alert_type?: string }) => {
    if (alert.alert_id != null) {
      if (seenAlertIdsRef.current.has(alert.alert_id)) return // same alert delivered twice
      seenAlertIdsRef.current.add(alert.alert_id)
    }
    pendingAlertTypesRef.current.push(alert.alert_type ?? '')
    if (flushTimerRef.current) return

    flushTimerRef.current = setTimeout(() => {
      const types = pendingAlertTypesRef.current
      pendingAlertTypesRef.current = []
      flushTimerRef.current = null

      const top = types
        .map((t) => SEVERITY_MAP[t] ?? 'info')
        .sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])[0]
      playAlertSound(top)
    }, 400)
  }, [playAlertSound])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    let disposed = false

    refreshUnreadCount()
    safetyPollRef.current = setInterval(refreshUnreadCount, SAFETY_POLL_INTERVAL_MS)

    const connect = () => {
      if (disposed) return
      const wsBase = BASE_URL.replace(/^http/, 'ws')
      const ws = new WebSocket(`${wsBase}/ws/alerts/`)
      wsRef.current = ws

      ws.onopen = async () => {
        const token = await getAccessToken()
        ws.send(JSON.stringify({ type: 'auth', token }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        if (data.type === 'auth_error') {
          ws.close()
          return
        }
        if (data.type === 'auth_success') {
          reconnectDelayRef.current = BASE_RECONNECT_DELAY_MS
          refreshUnreadCount() // catch up on anything missed while disconnected
          return
        }
        refreshUnreadCount()
        queueAlertSound(data)
      }

      ws.onclose = () => {
        if (disposed) return // closed on purpose: don't reconnect
        wsRef.current = null
        reconnectTimeoutRef.current = setTimeout(connect, reconnectDelayRef.current)
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY_MS)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      disposed = true
      wsRef.current?.close()
      wsRef.current = null
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (safetyPollRef.current) clearInterval(safetyPollRef.current)
    }
  }, [user, refreshUnreadCount, queueAlertSound])

  return (
    <AlertsContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlertsContext() {
  const ctx = useContext(AlertsContext)
  if (!ctx) throw new Error('useAlertsContext must be used inside an AlertsProvider')
  return ctx
}