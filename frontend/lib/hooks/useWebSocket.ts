import { useEffect, useRef, useCallback } from "react"

type UseWebSocketOptions = {
  path: string
  onMessage: (data: any) => void
  enabled?: boolean
}

const BASE_RECONNECT_DELAY_MS = 1000
const MAX_RECONNECT_DELAY_MS = 30000
const STABLE_AFTER_MS = 10000
const TOKEN_TTL_MS = 60 * 1000

// shared by every socket on the page, so 6 sockets = 1 token request
let cachedToken: { value: string; at: number } | null = null
let inflight: Promise<{ token?: string; status: number }> | null = null

export function clearWsTokenCache() {
  cachedToken = null
}

async function getWsToken(): Promise<{ token?: string; status: number }> {
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_TTL_MS) {
    return { token: cachedToken.value, status: 200 }
  }
  if (!inflight) {
    inflight = fetch("/api/auth/ws-token/", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return { status: res.status }
        const { token } = await res.json()
        cachedToken = { value: token, at: Date.now() }
        return { token, status: 200 }
      })
      .catch(() => ({ status: 0 }))
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

export function useWebSocket({ path, onMessage, enabled = true }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null)
  const stableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(BASE_RECONNECT_DELAY_MS)
  const stoppedRef = useRef(false) // set on 401: not logged in, don't retry
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    if (!enabled || stoppedRef.current) return

    const wsBase = (process.env.NEXT_PUBLIC_WS_URL ?? "").replace(/^http/, "ws")
    const ws = new WebSocket(`${wsBase}${path}`)
    wsRef.current = ws

    ws.onopen = async () => {
      const { token, status } = await getWsToken()
      if (wsRef.current !== ws || ws.readyState !== WebSocket.OPEN) return
      if (!token) {
        if (status === 401) stoppedRef.current = true
        ws.close()
        return
      }
      ws.send(JSON.stringify({ type: "auth", token }))
    }

    ws.onmessage = (event) => {
      let data: any
      try {
        data = JSON.parse(event.data)
      } catch {
        return
      }

      if (data.type === "auth_error") {
        clearWsTokenCache()
        ws.close()
        return
      }
      if (data.type === "auth_success") {
        stableTimerRef.current = setTimeout(() => {
          reconnectDelayRef.current = BASE_RECONNECT_DELAY_MS
        }, STABLE_AFTER_MS)
        return
      }

      onMessageRef.current(data)
    }

    ws.onclose = () => {
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current)

      const intentional = wsRef.current !== ws
      if (wsRef.current === ws) wsRef.current = null
      if (intentional || !enabled || stoppedRef.current) return

      const jitter = 0.5 + Math.random() // 0.5x to 1.5x
      reconnectTimeoutRef.current = setTimeout(connect, reconnectDelayRef.current * jitter)
      reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, MAX_RECONNECT_DELAY_MS)
    }

    ws.onerror = () => {
      ws.close()
    }
  }, [path, enabled])

  useEffect(() => {
    stoppedRef.current = false
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (stableTimerRef.current) clearTimeout(stableTimerRef.current)
      const ws = wsRef.current
      wsRef.current = null
      ws?.close()
    }
  }, [connect])
}