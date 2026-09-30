"use client"

import { useState } from "react"
import { FaWater, FaExclamationTriangle, FaPlug, FaBatteryQuarter, FaSignal, FaExclamationCircle, FaClipboardCheck, FaChevronRight, } from "react-icons/fa"

import { api } from "@/lib/api"
import { ALERT_STYLE } from "@/lib/constant"
import { AlertDetailDialog } from "@/components/Alerts/AlertDetailDialog"


type ClogContext = {
  dominant_waste_type?: string
  estimated_volume?: number
  confidence?: number
}

type WaterContext = {
  water_level?: number
  water_flow_rate?: number | null
  water_flow?: string
}

type HealthContext = {
  battery_voltage?: number
  signal_strength?: number
  sensor_continuity?: boolean
  health_status?: string
  checked_at?: string
}

type HighClogContext = {
  dominant_waste_type?: string
  recyclable_pct?: number
  biodegradable_pct?: number
  residual_pct?: number
  special_waste_pct?: number
  confidence?: number
  estimated_volume?: number
}

type ReportContext = {
  report_id?: number
  canal_name?: string | null
  severity?: string | null
  final_canal_condition?: string | null
  date_observed?: string | null
}

type AlertContext = ClogContext | WaterContext | HealthContext | ReportContext | Record<string, never>

export type Alert = {
  alert_id:      number
  alert_type:    string
  node_name:     string | null
  barangay_name: string | null
  timestamp:     string
  is_read:       boolean
  alert_context: AlertContext
}

function getBatteryLevel(voltage: number): string {
  if (voltage >= 4.1) return `Full (${voltage}V)`
  if (voltage >= 3.9) return `Good (${voltage}V)`
  if (voltage >= 3.7) return `Medium (${voltage}V)`
  if (voltage >= 3.5) return `Low (${voltage}V)`
  return `Critical (${voltage}V)`
}

function getSignalLevel(dbm: number): string {
  if (dbm >= -65) return `Excellent (${dbm}DBM)`
  if (dbm >= -75) return `Good (${dbm}DBM)`
  if (dbm >= -85) return `Fair (${dbm}DBM)`
  if (dbm >= -95) return `Weak (${dbm}DBM)`
  return `No Signal`
}


export const ALERT_META: Record<string, { label: string; Icon: React.ElementType }> = {
  Water_Level_Rising: { label: "Water Level Rising",    Icon: FaWater              },
  Critical_Clog:      { label: "Critical Clog Detected", Icon: FaExclamationTriangle },
  Low_Clog_Alert:      { label: "Low Clog Detected",      Icon: FaExclamationTriangle },
  Moderate_Clog_Alert: { label: "Moderate Clog Detected",  Icon: FaExclamationTriangle },
  Node_Offline:       { label: "Node Offline",           Icon: FaPlug               },
  Low_Battery:        { label: "Low Battery",            Icon: FaBatteryQuarter     },
  Weak_Signal:        { label: "Weak Signal",            Icon: FaSignal             },
  Sensor_Failure:     { label: "Sensor Failure",         Icon: FaExclamationCircle  },
  Report_Submitted:   { label: "Report Submitted",       Icon: FaClipboardCheck     },
}


// helpers
export function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}


export function  ContextRow({ alertType, ctx }: { alertType: string; ctx: AlertContext }) {
  if (alertType === "Report_Submitted") {
    const c = ctx as ReportContext
    return (
      <>
        {c.canal_name && <p>Canal: <span className="font-semibold">{c.canal_name}</span></p>}
        {c.severity && <p>Severity: <span className="font-semibold">{c.severity}</span></p>}
        {c.final_canal_condition && (
          <p>Final Condition: <span className="font-semibold">{c.final_canal_condition.replace(/_/g, " ")}</span></p>
        )}
      </>
    )
  }

  if (alertType === "Critical_Clog") {
    const c = ctx as WaterContext & HighClogContext & { clog_pct?: number }
    return (
      <div className="flex flex-col gap-1 text-xs text-[#727272]">
        {/* water data row */}
        <div className="flex flex-wrap gap-x-4">
          {c.water_level != null && (
            <span>Water Level: <span className="font-semibold text-[#122A48]">{c.water_level} cm</span></span>
          )}
          {c.water_flow_rate != null && (
            <span>Flow Rate: <span className="font-semibold text-[#122A48]">{Number(c.water_flow_rate).toFixed(5)} m/s</span></span>
          )}
          {c.water_flow && (
            <span>Flow: <span className="font-semibold text-[#122A48]">{c.water_flow}</span></span>
          )}
          {c.clog_pct != null && (
            <span>Clog: <span className="font-semibold text-[#D81010]">{c.clog_pct}%</span></span>
          )}
        </div>

        {/* waste data row — only if classification exists */}
        {c.dominant_waste_type && (
          <>
            <div className="flex flex-wrap gap-x-4">
              <span>Dominant: <span className="font-semibold text-[#122A48]">{c.dominant_waste_type}</span></span>
              {c.estimated_volume != null && (
                <span>Est. Volume: <span className="font-semibold text-[#122A48]">{Number(c.estimated_volume).toFixed(2)} kg</span></span>
              )}
              {c.confidence != null && (
                <span>Confidence: <span className="font-semibold text-[#122A48]">{Math.round(c.confidence)}%</span></span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 text-xs">
              {c.recyclable_pct != null && <span>Recyclable: {c.recyclable_pct}%</span>}
              {c.biodegradable_pct != null && <span>Biodegradable: {c.biodegradable_pct}%</span>}
              {c.residual_pct != null && <span>Residual: {c.residual_pct}%</span>}
              {c.special_waste_pct != null && <span>Special: {c.special_waste_pct}%</span>}
            </div>
          </>
        )}
      </div>
    )
  }

  if (alertType === "Water_Level_Rising") {
    const c = ctx as WaterContext
    if (c.water_level == null) return null
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#727272]">
        <span>
          Water Level:{" "}
          <span className="font-semibold text-[#122A48]">{c.water_level} cm</span>
        </span>
        {c.water_flow_rate != null && (
          <span>
            Flow Rate:{" "}
            <span className="font-semibold text-[#122A48]">{Number(c.water_flow_rate).toFixed(5)} m/s</span>
          </span>
        )}
        {c.water_flow && (
          <span>
            Flow: <span className="font-semibold text-[#122A48]">{c.water_flow}</span>
          </span>
        )}
      </div>
    )
  }

  if (alertType === "Low_Clog_Alert" || alertType === "Moderate_Clog_Alert") {
    const c = ctx as HighClogContext
    if (!c.dominant_waste_type) return null
    return (
      <div className="flex flex-col gap-1 text-xs text-[#727272]">
        <div className="flex flex-wrap gap-x-4">
          {c.dominant_waste_type && (
            <span>
              Dominant: <span className="font-semibold text-[#122A48]">{c.dominant_waste_type}</span>
            </span>
          )}
          {c.estimated_volume != null && (
            <span>
              Est. Volume: <span className="font-semibold text-[#122A48]">{c.estimated_volume} kg</span>
            </span>
          )}
          {c.confidence != null && (
            <span>
              Confidence: <span className="font-semibold text-[#122A48]">{Math.round(c.confidence)}%</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 text-xs">
          {c.recyclable_pct != null && <span>Recyclable: {c.recyclable_pct}%</span>}
          {c.biodegradable_pct != null && <span>Biodegradable: {c.biodegradable_pct}%</span>}
          {c.residual_pct != null && <span>Residual: {c.residual_pct}%</span>}
          {c.special_waste_pct != null && <span>Special: {c.special_waste_pct}%</span>}
        </div>
      </div>
    )
  }

  if (["Node_Offline", "Low_Battery", "Weak_Signal", "Sensor_Failure"].includes(alertType)) {
    const c = ctx as HealthContext
    if (!Object.keys(c).length) return null
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#727272]">
        {alertType === "Low_Battery" && c.battery_voltage != null && (
          <span>
            Battery: <span className="font-semibold text-[#122A48]">{getBatteryLevel(c.battery_voltage)}</span>
          </span>
        )}
        {alertType === "Weak_Signal" && c.signal_strength != null && (
          <span>
            Signal: <span className="font-semibold text-[#122A48]">{getSignalLevel(c.signal_strength)}</span>
          </span>
        )}
        {alertType === "Sensor_Failure" && c.sensor_continuity != null && (
          <span>
            Sensor: <span className={`font-semibold ${c.sensor_continuity ? "text-[#347D43]" : "text-[#CC251F]"}`}>
              {c.sensor_continuity ? "Connected" : "Disconnected"}
            </span>
          </span>
        )}
        {alertType === "Node_Offline" && (
          <>
            {c.battery_voltage != null && (
              <span>Battery: <span className="font-semibold text-[#122A48]">{getBatteryLevel(c.battery_voltage)}</span></span>
            )}
            {c.signal_strength != null && (
              <span>Signal: <span className="font-semibold text-[#122A48]">{getSignalLevel(c.signal_strength)}</span></span>
            )}
          </>
        )}
      </div>
    )
  }

  return null
}

interface AlertCardProps {
  alert:   Alert
  onRead?: (id: number) => void
}


export function AlertCard({ alert, onRead }: AlertCardProps) {
  const [isRead, setIsRead] = useState(alert.is_read)
  const [dialogOpen, setDialogOpen] = useState(false)

  const style  = ALERT_STYLE[alert.alert_type] ?? ALERT_STYLE.default
  const meta   = ALERT_META[alert.alert_type]  ?? { label: alert.alert_type.replace(/_/g, " "), Icon: FaExclamationCircle }
  const { Icon } = meta

  const handleClick = async () => {
    setDialogOpen(true)  // ← open dialog on click

    if (isRead) return
    try {
      await api.post(`/api/alerts/${alert.alert_id}/read/`, {})
      setIsRead(true)
      onRead?.(alert.alert_id)
    } catch {
      // silently fail
    }
  }

  return (
    <>
      <div
        onClick={handleClick}
        className={`
          rounded-lg p-4 bg-[#FAFCFD]
          border ${style.border}
          ${style.shadow}
          cursor-pointer transition-opacity
          ${isRead ? "opacity-60" : "opacity-100"}
          hover:opacity-90
        `}
      >
        <div className="flex items-start gap-3">

          {/* icon badge */}
          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${style.icon}`}>
            <Icon size={16} />
          </div>

          {/* content */}
          <div className="flex-1 min-w-0">

            {/* top row: label + time + unread dot */}
            <div className="flex justify-between items-start gap-2">
              <p className="font-bold text-xs text-[#122A48] leading-tight">{meta.label.toUpperCase()}</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-[#727272]">{formatTime(alert.timestamp)}</span>
                {!isRead && (
                  <span className={`w-2 h-2 rounded-full ${style.icon.split(" ")[1]}`} />
                )}
              </div>
            </div>

            {/* barangay + chevron */}
            <div className="flex justify-between items-center mt-0.5">
              <p className="font-semibold text-xs text-[#122A48]">
                {alert.barangay_name ?? "—"}
              </p>
              <FaChevronRight size={11} className="text-[#727272] shrink-0" />
            </div>

            {/* node name */}
            {alert.node_name && (
              <p className="text-xs text-[#727272] mt-0.5">{alert.node_name}</p>
            )}

            {/* contextual data */}
            <div className="mt-1.5">
              <ContextRow alertType={alert.alert_type} ctx={alert.alert_context} />
            </div>

            {/* date */}
            <p className="text-xs text-[#727272] mt-1.5">
              Detected on {formatDate(alert.timestamp)}
            </p>
          </div>

        </div>
      </div>

      {/* Detail Dialog */}
      <AlertDetailDialog alert={alert} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}