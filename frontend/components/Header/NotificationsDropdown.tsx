"use client"

// react 
import { useEffect, useState, useRef } from "react"

// icons
import { FaBell } from "react-icons/fa"

// lib
import { api } from "@/lib/api"
import { ALERT_STYLE } from "@/lib/constant"

import { ALERT_META, formatTime, type Alert } from "@/components/Alerts/AlertCard"
import { AlertDetailDialog } from "@/components/Alerts/AlertDetailDialog"


interface NotificationsDropdownProps {
  alertHref: string
  unreadCount: number
  onUnreadCountChange: (count: number) => void
}

export default function NotificationsDropdown({ alertHref, unreadCount, onUnreadCountChange, }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    async function loadAlerts() {
      setLoading(true)
      setError(false)
      try {
        const data = await api.get(`/api/alerts/?page_size=5`)
        if (!cancelled) setAlerts(data.results ?? [])
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadAlerts()
    return () => { cancelled = true }
  }, [open, reloadTick])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (dialogOpen) return 
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open, dialogOpen])

  const handleRowClick = async (alert: Alert) => {
    setSelectedAlert(alert)
    setDialogOpen(true)
    if (alert.is_read) return

    setAlerts(prev => prev.map(a => a.alert_id === alert.alert_id ? { ...a, is_read: true } : a))
    onUnreadCountChange(Math.max(0, unreadCount - 1))

    try {
      await api.post(`/api/alerts/${alert.alert_id}/read/`, {})
    } catch {
      setAlerts(prev => prev.map(a => a.alert_id === alert.alert_id ? { ...a, is_read: false } : a))
      onUnreadCountChange(unreadCount)
    }
  }

  const handleMarkAllRead = async () => {
    const previousAlerts = alerts
    const previousCount = unreadCount
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    onUnreadCountChange(0)
    try {
      await api.post(`/api/alerts/mark-all-read/`, {})
    } catch {
      setAlerts(previousAlerts)
      onUnreadCountChange(previousCount)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setOpen(prev => !prev)} className="relative inline-flex items-center cursor-pointer">
        <FaBell size={17} color="white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-[#EDEDED] z-50 overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3">
            <p className="font-bold text-sm text-[#122A48]">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs font-semibold text-[#1565BC] hover:underline cursor-pointer">
                Mark all as read
              </button>
            )}
          </div>
          <hr />

          <div className="max-h-80 overflow-y-auto">
            {loading && alerts.length === 0 ? (
              <p className="text-center text-xs text-[#727272] py-8">Loading…</p>
            ) : error && alerts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="text-center text-sm font-medium text-[#D81010]">Couldn&apos;t load notifications.</p>
                <button onClick={() => setReloadTick(t => t + 1)} className="text-xs font-semibold text-[#1565BC] hover:underline cursor-pointer">Retry</button>
              </div>
            ) : alerts.length === 0 ? (
              <p className="text-center text-sm font-medium text-[#727272] py-8">You&apos;re all caught up.</p>
            ) : (
              alerts.map(alert => {
                const style = ALERT_STYLE[alert.alert_type] ?? ALERT_STYLE.default
                const meta  = ALERT_META[alert.alert_type] ?? { label: alert.alert_type.replace(/_/g, " "), Icon: FaBell }
                const Icon  = meta.Icon
                return (
                  <div key={alert.alert_id} onClick={() => handleRowClick(alert)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-[#F2F2F2] last:border-b-0 cursor-pointer hover:bg-[#FAFCFD] ${alert.is_read ? "opacity-60" : ""}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${style.icon}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p className="font-bold text-[11px] text-[#122A48] leading-tight">{meta.label.toUpperCase()}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[11px] text-[#727272]">{formatTime(alert.timestamp)}</span>
                          {!alert.is_read && <span className={`w-1.5 h-1.5 rounded-full ${style.icon.split(" ")[1]}`} />}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#727272] mt-0.5 truncate">
                        {alert.barangay_name ?? "—"}{alert.node_name ? ` · ${alert.node_name}` : ""}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <hr />
          <a href={alertHref} className="block text-center text-xs font-semibold text-[#1565BC] py-2.5 hover:bg-[#FAFCFD]">
            See all alerts
          </a>
        </div>
      )}

      <AlertDetailDialog alert={selectedAlert} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}