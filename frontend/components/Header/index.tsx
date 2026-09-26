"use client"

// icons
import { Menu } from 'lucide-react' 
import NotificationsDropdown from '@/components/Header/NotificationsDropdown'

import Link from 'next/link'

// react
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'


// lib
import { fetchWithAuth, getUserRole } from '@/lib/auth'
import { useDrawer } from '@/lib/drawer-context' 
import { resolveSoundUrl} from '@/lib/soundUtils'


const SEVERITY_MAP: Record<string, "critical" | "warning" | "info"> = {
  Critical_Clog: "critical",
  Moderate_Clog_Alert: "warning",
  Water_Level_Rising: "warning",
  Low_Clog_Alert: "info",
  Node_Offline: "info",
  Low_Battery: "info",
  Weak_Signal: "info",
  Sensor_Failure: "info",
}


// map pathnames to page titles
const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "User Management",
  "/admin/users/form": "User Management",
  "/admin/barangay": "Barangay Management",
  "/admin/barangay/form": "Barangay Management",
  "/admin/monitoring": "Monitoring",
  "/admin/alerts": "Alerts",
  "/admin/assign": "Node Assignment",
  "/admin/node": "Node Management",
  "/admin/hotspots": "Canal Hotspots Management",
  "/admin/history/clog-events": "Clog Events",
  "/admin/history/waste": "Waste Classification",
  "/admin/history/barangay-reports": "Barangay Reports",
  "/admin/history/barangay-reports/view-barangay-report": "Barangay Reports",
  "/admin/health": "Sensor Nodes Health",
  "/admin/audit": "System Audit Logs",
  "/admin/settings": "Settings",
  "/admin/manual": "Admin User Manual",
  "/menro/map": "Regional Map Monitoring",
  "/menro/alerts": "Alerts",
  "/menro/analytics": "Waste Analytics",
  "/menro/resources": "Resource Optimization",
  "/menro/hotspots": "Canal Hotspot Management",
  "/menro/barangay-reports": "Barangay Reports",
  "/menro/barangay-reports/view-barangay-report": "Barangay Reports",
  "/menro/manual": "MENRO User Manual",
}

// notification route per role
const alertRoutes: Record<string, string> = {
  Admin: "/admin/alerts",
  MENRO: "/menro/alerts",
  MENRO_Staff: "/menro/alerts",
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

  const lastSeenAlertId = useRef<number | null>(null)
  const soundConfigRef = useRef<AlertSoundConfig | null>(null)


  useEffect(() => {
    const role = getUserRole()
    if (role) setAlertHref(alertRoutes[role] ?? "#")
  }, [])

  useEffect(() => {
    async function fetchUnread() {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts/unread-count/`)
        if (!res.ok) return
        const data = await res.json()
        setUnreadCount(data.unread_count)
      } catch {
      }
    }

    fetchUnread()
    // poll every 30 seconds for live updates
    const interval = setInterval(fetchUnread, 60000)
    return () => clearInterval(interval)
  }, [])

  // Load sound settings once on mount
  useEffect(() => {
    async function loadSoundConfig() {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alert-sounds/config/`)
        if (res.ok) soundConfigRef.current = await res.json()
      } catch {}
    }

    loadSoundConfig()
  }, [])

  function playAlertSound(alertType: string) {
    const config = soundConfigRef.current
    if (!config || !config.sound_enabled) return

    const severity = SEVERITY_MAP[alertType] ?? "info"
    const soundValue =
      severity === "critical" ? config.critical_sound :
      severity === "warning" ? config.warning_sound :
      config.info_sound

    const audio = new Audio(resolveSoundUrl(soundValue))
    audio.play().catch(() => {
      // Browsers block autoplay until the user has interacted with the page at least once — expected, not an error
    })
  }

  // Poll for the newest alert, detect genuinely new ones, play a sound once per new alert
  useEffect(() => {
    async function checkNewAlert() {
      try {
        const res = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/alerts/?page_size=1`)
        if (!res.ok) return
        const data = await res.json()
        const latest = data.results?.[0]
        if (!latest) return

        if (lastSeenAlertId.current === null) {
          // First load: just remember it, don't play a sound for something that already existed
          lastSeenAlertId.current = latest.alert_id
          return
        }

        if (latest.alert_id > lastSeenAlertId.current) {
          lastSeenAlertId.current = latest.alert_id
          playAlertSound(latest.alert_type)
        }
      } catch {}
    }

    checkNewAlert()
    const interval = setInterval(checkNewAlert, 60000)
    return () => clearInterval(interval)
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

      {/* notification bell */}
      <NotificationsDropdown
        alertHref={alertHref}
        unreadCount={unreadCount}
        onUnreadCountChange={setUnreadCount}
      />

    </header>
  )
}