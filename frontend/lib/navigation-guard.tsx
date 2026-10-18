"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"
import type { MouseEvent } from "react"

// return true to block the navigation
type Blocker = (href: string) => boolean

type GuardContextValue = {
  setBlocker: (blocker: Blocker | null) => void
  guardClick: (href: string) => (e: MouseEvent<HTMLElement>) => void
  disableGuard: () => void
}

const GuardContext = createContext<GuardContextValue>({
  setBlocker: () => {},
  guardClick: () => () => {},
  disableGuard: () => {},
})

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const blockerRef = useRef<Blocker | null>(null)
  const bypassRef = useRef(false)

  const setBlocker = useCallback((blocker: Blocker | null) => {
    blockerRef.current = blocker
    if (blocker) bypassRef.current = false
  }, [])

  const guardClick = useCallback(
    (href: string) => (e: MouseEvent<HTMLElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      if (bypassRef.current) return
      if (blockerRef.current?.(href)) e.preventDefault()
    },
    []
  )

  const disableGuard = useCallback(() => {
    bypassRef.current = true
  }, [])

  // refresh / close tab
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!blockerRef.current || bypassRef.current) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [])

  const value = useMemo(() => ({ setBlocker, guardClick, disableGuard }), [setBlocker, guardClick, disableGuard])

  return <GuardContext.Provider value={value}>{children}</GuardContext.Provider>
}

export const useNavigationGuard = () => useContext(GuardContext)

export function useUnsavedChangesGuard(dirty: boolean, onBlocked: (href: string) => void) {
  const { setBlocker } = useNavigationGuard()

  const onBlockedRef = useRef(onBlocked)
  useEffect(() => {
    onBlockedRef.current = onBlocked
  })

  useEffect(() => {
    if (!dirty) {
      setBlocker(null)
      return
    }
    setBlocker((href) => {
      onBlockedRef.current(href)
      return true
    })
    return () => setBlocker(null)
  }, [dirty, setBlocker])
}