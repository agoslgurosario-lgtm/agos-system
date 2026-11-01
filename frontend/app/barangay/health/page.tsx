"use client"

import { useEffect, useState } from "react"
import { Radar, BatteryMedium, Signal, ScanSearch } from "lucide-react"
import { HealthHistoryTable } from "@/components/HealthHistory"
import { fetchWithAuth } from "@/lib/auth"

// hooks
import { usePolling } from "@/components/hooks/usePolling"
import { usePageCache } from "@/components/hooks/usePageCache"
import { useWebSocket } from "@/lib/hooks/useWebSocket"


type NodeLite = { node_id: number; node_name: string; status: string; is_online: boolean }
type LatestLog = {
  node_details: { node_id: number }
  battery_voltage: number | null
  signal_strength: number | null
  sensor_continuity: boolean | null
}
type SummaryData = { nodes: NodeLite[]; latest: LatestLog[] }

const fetchSummaryRaw = async (): Promise<SummaryData> => {
  const [nRes, hRes] = await Promise.all([
    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/sensor-nodes/`),
    fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL}/api/system-health/history/?with_summary=1&page_size=1`),
  ])
  if (!nRes.ok || !hRes.ok) throw new Error()
  const n = await nRes.json()
  const h = await hRes.json()
  return { nodes: n.results ?? n, latest: h.latest ?? [] }
}

export default function BarangayHealth() {
  const summary = usePageCache("barangay-health:summary", fetchSummaryRaw, { nodes: [], latest: [] } as SummaryData)
  const { nodes, latest } = summary.data

  // the socket is the live path; polling is just a backstop (it also keeps "online" fresh)
  usePolling(async () => { await summary.refetch() }, 30000)

  useWebSocket({
    path: "/ws/node-health/",
    onMessage: (log: LatestLog) => {
      const id = log?.node_details?.node_id
      if (id == null) return
      summary.setData(prev => ({
        ...prev,
        latest: [log, ...prev.latest.filter(l => l.node_details.node_id !== id)],
      }))
    },
  })

  const totalOnline = nodes.filter(n => n.status !== "Maintenance" && n.is_online).length

  const batteries = latest.filter(l => l.battery_voltage != null).map(l => l.battery_voltage!)
  const avgBattery = batteries.length
    ? `${(batteries.reduce((a, b) => a + b, 0) / batteries.length).toFixed(1)}V`
    : "—"

  const signals = latest.filter(l => l.signal_strength != null).map(l => l.signal_strength!)
  const avgSignal = signals.length
    ? `${Math.round(signals.reduce((a, b) => a + b, 0) / signals.length)} dBm`
    : "—"

  const sensorsFailing = latest.filter(l => l.sensor_continuity === false).length

  const cards = [
    { icon: <Radar size={17} color="#2C7B3C" />, bg: "bg-[#B2FBC1]", value: totalOnline, label: "Online Nodes" },
    { icon: <BatteryMedium size={17} color="#E4B600" />, bg: "bg-[#F0FBB2]", value: avgBattery, label: "Average Battery" },
    { icon: <Signal size={17} color="#582579" />, bg: "bg-[#E5EAFF]", value: avgSignal, label: "Average Signal" },
    { icon: <ScanSearch size={17} color="#D81010" />, bg: "bg-[#D8101059]", value: sensorsFailing, label: "Sensors Failing" },
  ]

  return (
    <div className="flex flex-col min-h-full">
      <p className="text-[#122A48] font-bold text-[15px] mb-2">Sensor Nodes Health</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full text-[#122A48]">
        {cards.map(card => (
          <div
            key={card.label}
            className="rounded-lg border-2 border-[#C6C6C8] h-17 w-full flex items-center p-6 gap-3 bg-[#FAFCFD] shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]"
          >
            <div className={`${card.bg} rounded-lg p-2`}>{card.icon}</div>
            <div className="flex flex-col">
              <span className="text-xl font-bold leading-tight">{card.value}</span>
              <p className="text-xs">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <HealthHistoryTable nodes={nodes} />
    </div>
  )
}