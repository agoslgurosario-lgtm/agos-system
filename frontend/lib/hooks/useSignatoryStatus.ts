"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchWithAuth } from "@/lib/auth"

const API = process.env.NEXT_PUBLIC_API_URL

// GET /api/canal-reports/signatory-status/  ->  { complete: boolean, missing: string[] }
export type SignatoryStatus = {
  loading: boolean
  complete: boolean      // true only when the backend says all four positions are filled
  missing: string[]
  error: boolean
  refresh: () => void
}

export function useSignatoryStatus(): SignatoryStatus {
  const [state, setState] = useState({ loading: true, complete: false, missing: [] as string[], error: false })

  const load = useCallback(() => {
    setState(s => ({ ...s, loading: true }))
    fetchWithAuth(`${API}/api/canal-reports/signatory-status/`)
      .then(async res => {
        if (!res.ok) throw new Error()
        const data = await res.json()
        setState({ loading: false, complete: !!data.complete, missing: data.missing ?? [], error: false })
      })
      // if the check itself fails, stay blocked; the server enforces the rule anyway
      .catch(() => setState({ loading: false, complete: false, missing: [], error: true }))
  }, [])

  useEffect(() => { load() }, [load])

  return { ...state, refresh: load }
}
