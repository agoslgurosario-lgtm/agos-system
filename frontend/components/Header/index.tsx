"use client"

// icons
import { Menu } from 'lucide-react'
import NotificationsDropdown from '@/components/Header/NotificationsDropdown'

import Link from 'next/link'

// react
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'


// lib
import { fetchWithAuth, getUserRole } from '@/lib/auth'
import { useDrawer } from '@/lib/drawer-context' 
import { resolveSoundUrl} from '@/lib/soundUtils'
import { useWebSocket } from '@/lib/hooks/useWebSocket'


const SEVERITY_MAP: Record<string, "critical" | "warning" | "info"> = {
  Critical_Clog: "critical",
  Moderate_Clog_Alert: "warning",
  Water_Level_Rising: "warning",
  Low_Clog_Alert: "info",
  Node_Offline: "info",
  Low_Battery: "info",
  Weak_Signal: "info",
  Sensor_Failure: "info",
  Report_Submitted: "info",
}

const SILENT_ALERT_TYPES = new Set(["Report_Submitted"])

const SEVERITY_RANK: Record<string, number> = { critical: 3, warning: 2, info: 1 }

type AlertLite = { alert_id: number; alert_type: string }


// map pathnames to page titles
const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "User Management",
  "/admin/users/form": "User Management",
  "/admin/barangay": "Barangay Management",
  "/admin/barangay/form": "Barangay Management",
  "/admin/signatories": "Signatory Management",
  "/admin/monitoring": "Monitoring",
  "/admin/alerts": "Alerts",
  "/admin/assign": "Node Assignment",
  "/admin/node": "Node Management",
  "/admin/hotspots": "Canal Hotspots Management",
  "/admin/history/clog-events": "Clog Events",
  "/admin/history/waste": "Waste Classification",
  "/admin/history/barangay-reports": "Barangay Reports",
  "/admin/history/barangay-reports/view-barangay-report": "Barangay Reports",
  "/admin/history/report-analytics": "Report Analytics",
  "/admin/health": "Sensor Nodes Health",
  "/admin/audit": "System Audit Logs",
  "/admin/settings": "Settings",
  "/admin/maintenance-logs": "Maintenance Logs",
  "/admin/manual": "Admin User Manual",
  "/menro/map": "Regional Map Monitoring",
  "/menro/alerts": "Alerts",
  "/menro/analytics": "Waste Analytics",
  "/menro/resources": "Resource Optimization",
  "/menro/hotspots": "Canal Hotspot Management",
  "/menro/barangay-reports": "Barangay Reports",
  "/menro/barangay-reports/view-barangay-report": "Barangay Reports",
  "/menro/report-analytics": "Report Analytics",
  "/menro/manual": "MENRO User Manual",
  "/barangay/map": "Map Monitoring",
  "/barangay/alerts": "Alerts",
  "/barangay/analytics": "Waste Analytics",
  "/barangay/readings": "Sensor Readings",
  "/barangay/clog-events": "Clog Events",
  "/barangay/health": "Node Health",
  "/barangay/barangay-reports": "Barangay Reports",
  "/barangay/user-manual": "Help",
}

// notification route per role
const alertRoutes: Record<string, string> = {
  Admin: "/admin/alerts",
  MENRO: "/menro/alerts",
  MENRO_Staff: "/menro/alerts",
  Barangay: "/barangay/alerts",
}

type AlertSoundConfig = {
  sound_enabled: boolean
  critical_sound: string
  warning_sound: string
  info_sound: string
}


export default function Header() {
  const pathname = usePathname()
  const [alertHref, setAlertHref] = useState("#")
  const [unreadCount, setUnreadCount] = useState(0)
  const { setDrawerOpen } = useDrawer()

  const seenAlertIds = useRef<Set<number>>(new Set())
  const pendingAlerts = useRef<AlertLite[]>([])
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const soundConfigRef = useRef<AlertSoundConfig | null>(null)

  useEffect(() => {
    const role = getUserRole()
    if (role) setAlertHref(alertRoutes[role] ?? "#")
  }, [])

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts/unread-count/`)
      if (!res.ok) return
      const data = await res.json()
      setUnreadCount(data.unread_count)
    } catch {}
  }, [])

  useEffect(() => {
    fetchUnread()
    const interval = setInterval(fetchUnread, 60000) // backstop; the websocket refreshes it live
    return () => clearInterval(interval)
  }, [fetchUnread])

  // Sound settings: load on mount and again whenever the page changes
  // (so changes saved in Settings apply when you come back)
  const loadSoundConfig = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alert-sounds/config/`)
      if (res.ok) {
        const cfg = await res.json()
        soundConfigRef.current = cfg
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadSoundConfig()
  }, [pathname, loadSoundConfig])

  function playSeverity(severity: "critical" | "warning" | "info") {
    const config = soundConfigRef.current
    if (!config || !config.sound_enabled) return

    const soundValue =
      severity === "critical" ? config.critical_sound :
      severity === "warning" ? config.warning_sound :
      config.info_sound

    const audio = new Audio(resolveSoundUrl(soundValue))
    audio.play().catch(() => {
      // browsers block sound until the user has clicked on the page once; nothing to do
    })
  }

  // Play ONE sound for a batch of new alerts: the most severe one.
  async function notifyNewAlerts(alerts: AlertLite[]) {
    const fresh = alerts.filter(a => !seenAlertIds.current.has(a.alert_id))
    if (fresh.length === 0) return
    fresh.forEach(a => seenAlertIds.current.add(a.alert_id))

    const audible = fresh.filter(a => !SILENT_ALERT_TYPES.has(a.alert_type))
    if (audible.length === 0) return

    if (!soundConfigRef.current) await loadSoundConfig()

    const top = audible
      .map(a => SEVERITY_MAP[a.alert_type] ?? "info")
      .sort((a, b) => SEVERITY_RANK[b] - SEVERITY_RANK[a])[0]
    playSeverity(top)
  }

  // Alerts that arrive within a moment of each other are grouped into one sound.
  function queueAlert(alert: AlertLite) {
    pendingAlerts.current.push(alert)
    if (flushTimer.current) return
    flushTimer.current = setTimeout(() => {
      const batch = pendingAlerts.current
      pendingAlerts.current = []
      flushTimer.current = null
      notifyNewAlerts(batch)
    }, 400)
  }

  // Live: every new alert is pushed over the websocket as soon as it's created.
  useWebSocket({
    path: "/ws/alerts/",
    onMessage: (alert) => {
      if (alert?.alert_id == null) return
      // small delay so the alert is committed before we count it
      setTimeout(fetchUnread, 500)
      queueAlert({ alert_id: alert.alert_id, alert_type: alert.alert_type })
    },
  })
  
  useEffect(() => {
    let first = true

    async function sync() {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts/?page_size=20`)
        if (!res.ok) return
        const data = await res.json()
        const list = (data.results ?? data) as AlertLite[]

        if (first) {
          list.forEach(a => seenAlertIds.current.add(a.alert_id))
          first = false
          return
        }
        notifyNewAlerts(list)
      } catch {}
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') sync()
    }

    sync()
    const interval = setInterval(sync, 120000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const title = pageTitles[pathname] ?? "AGOS"

  return (
    <header className="bg-[linear-gradient(90deg,#132A49_0%,#1565BC_46%,#2C7B3C_100%)] px-6 h-14 flex justify-between items-center shadow-[0_35px_60px_-15px_rgba(0,0,0,0.4)]">

      {/* nav drawer */}
      <div className="flex items-center gap-3">
        {/* hamburger for mobile*/}
        <button
          className="md:hidden text-white"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={22} />
        </button>

        {/* page title */}
        <h1 className='text-base font-bold text-white'>{title}</h1>
      </div>

      <NotificationsDropdown
        alertHref={alertHref}
        unreadCount={unreadCount}
        onUnreadCountChange={setUnreadCount}
      />

    </header>
  )
}