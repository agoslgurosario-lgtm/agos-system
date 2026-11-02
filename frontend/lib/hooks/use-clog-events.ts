"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { fetchWithAuth } from "@/lib/auth"
import { usePolling } from "@/components/hooks/usePolling"
import type { ClogEvent, ClogSummary, SeverityFilter } from "@/types/clog-event"

export const PAGE_SIZE = 10

const EMPTY_SUMMARY: ClogSummary = {
  total: 0, detected: 0, responded: 0, resolved: 0, critical: 0, moderate: 0, low: 0,
}

type Entry = { events: ClogEvent[]; total: number; summary: ClogSummary }
const cache = new Map<string, Entry>()

export function useClogEvents() {
  const [severity, setSeverity] = useState<SeverityFilter>("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [page, setPage] = useState(1)

  const [entry, setEntry] = useState<Entry>({ events: [], total: 0, summary: EMPTY_SUMMARY })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const reqRef = useRef(0) // ignore out-of-order responses
  const key = `${severity}|${from}|${to}|${page}`

  const load = useCallback(async (silent = false) => {
    const req = ++reqRef.current

    if (!silent) {
      const hit = cache.get(key)
      if (hit) { setEntry(hit); setLoading(false) } // instant
      else setLoading(true)
    }
    setError(false)

    // TODO: adjust the endpoint and param names to your Django API
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
      with_summary: "1",
    })
    if (severity !== "all") params.set("severity", severity)
    if (from) params.set("from", from)
    if (to) params.set("to", to)

    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/clog-events/?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      const next: Entry = {
        events: data.results ?? [],
        total: data.count ?? 0,
        summary: data.summary ?? EMPTY_SUMMARY,
      }
      cache.set(key, next)
      if (req !== reqRef.current) return
      setEntry(next)
    } catch {
      if (req === reqRef.current) setError(true)
    } finally {
      if (req === reqRef.current) setLoading(false)
    }
  }, [key, page, severity, from, to])

  useEffect(() => { load() }, [load])

  // backstop refresh, same pattern as the health page
  usePolling(async () => { await load(true) }, 30000)

  const changeSeverity = (v: SeverityFilter) => { setSeverity(v); setPage(1) }
  const changeRange = (f: string, t: string) => { setFrom(f); setTo(t); setPage(1) }

  return {
    ...entry,
    loading, error,
    page, setPage,
    severity, changeSeverity,
    from, to, changeRange,
  }
}