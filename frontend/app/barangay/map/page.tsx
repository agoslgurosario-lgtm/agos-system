"use client"

// react
import { useCallback, useEffect, useMemo } from "react"

// charts
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

// icons
import { RadioTower, TriangleAlert, Waves, Droplets, CloudRain } from "lucide-react"

// auth / lib
import { fetchWithAuth } from "@/lib/auth"
import { currentMonthRange, rangeQuery } from "@/lib/dateRange"
import { formatWeightIn, pickWeightUnit } from "@/lib/formatWeight"
import { usePageCache } from "@/components/hooks/usePageCache"
import { usePolling } from "@/components/hooks/usePolling"
import { useWebSocket } from "@/lib/hooks/useWebSocket"

// components
import AgosMapWrapper from "@/components/Map/AgosMapWrapper"
import StatCard from "@/components/Analytics/StatCard"

// ---------- types (only what this page reads) ----------
type SensorNode = {
  node_id: number
  node_name: string
  latitude: number | null
  longitude: number | null
  status: string
  is_online: boolean
  is_force_sleeping: boolean
  condition: string | null
  water_level: number | null
  clog_pct: number | null
  barangay_details?: { barangay_name: string } | null
}

type ClogEvent = { node: number; status: string }

type WasteClassification = {
  classification_id: number
  estimated_volume: number
  recyclable_pct: number
  biodegradable_pct: number
  residual_pct: number
  special_waste_pct: number
}

type RainfallCondition = "None" | "Yellow" | "Orange" | "Red" | "Unknown"

// ---------- fetchers (the backend scopes all of these to the user's barangay) ----------
const API = process.env.NEXT_PUBLIC_API_URL

const fetchNodes = async (): Promise<SensorNode[]> => {
  const res = await fetchWithAuth(`${API}/api/sensor-nodes/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

// Obstructed canal = a node with a clog event still in "Detected" (nobody responded yet).
// Counted per node, same as mobile. month=All so an older open one still counts
// (without it the backend only returns the current month).
const fetchObstructedCount = async (): Promise<number> => {
  const res = await fetchWithAuth(`${API}/api/clog-events/?status=Detected&month=All`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  const events: ClogEvent[] = data.results ?? data
  return new Set(events.map(e => e.node)).size
}

const fetchWaste = async (): Promise<WasteClassification[]> => {
  const { from, to } = currentMonthRange()
  const res = await fetchWithAuth(`${API}/api/waste-classifications/?${rangeQuery(from, to)}`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.results ?? data
}

const fetchRainfall = async (): Promise<RainfallCondition> => {
  const res = await fetchWithAuth(`${API}/api/rainfall-condition/`)
  if (!res.ok) throw new Error()
  const data = await res.json()
  return data.condition ?? "Unknown"
}

// ---------- flood risk badge ----------
const FLOOD_RISK: Record<RainfallCondition, { label: string; note: string; badge: string }> = {
  None:    { label: "Normal",  note: "No significant rainfall in your barangay.",  badge: "bg-[#58D07159] text-[#2C7B3C]" },
  Yellow:  { label: "Yellow",  note: "Light to moderate rain. Monitor the canals.", badge: "bg-[#FFE45E66] text-[#8A6D00]" },
  Orange:  { label: "Orange",  note: "Heavy rain. Flooding is possible.",           badge: "bg-[#D8921059] text-[#D48A00]" },
  Red:     { label: "Red",     note: "Intense rain. Serious flooding is likely.",   badge: "bg-[#D8101059] text-[#D81010]" },
  Unknown: { label: "Unknown", note: "No recent rainfall data for your barangay.",  badge: "bg-gray-100 text-gray-500" },
}

export default function BarangayMapPage() {
  const nodesCache    = usePageCache("barangayMap:nodes",    fetchNodes,         [] as SensorNode[],             { autoFetch: false })
  const clogsCache    = usePageCache("barangayMap:obstructed", fetchObstructedCount, 0,                          { autoFetch: false })
  const wasteCache    = usePageCache("barangayMap:waste",    fetchWaste,         [] as WasteClassification[],    { autoFetch: false })
  const rainfallCache = usePageCache("barangayMap:rainfall", fetchRainfall,      "Unknown" as RainfallCondition, { autoFetch: false })

  const nodes = nodesCache.data
  const waste = wasteCache.data
  const loading = nodesCache.loading || wasteCache.loading

  const refetchAll = useCallback(async () => {
    await Promise.allSettled([
      nodesCache.refetch(),
      clogsCache.refetch(),
      wasteCache.refetch(),
      rainfallCache.refetch(),
    ])
  }, [])

  useEffect(() => { refetchAll() }, [])
  usePolling(refetchAll, 30000)

  // live water level / clog updates, same handler the admin dashboard uses
  useWebSocket({
    path: "/ws/sensor-readings/",
    onMessage: (reading) => {
      nodesCache.setData(prev => prev.map(node =>
        node.node_id === reading.node_details.node_id
          ? { ...node, water_level: reading.water_level, clog_pct: reading.clog_pct, condition: reading.overall_status ?? reading.reading_status, is_online: true }
          : node
      ))
    },
  })

  // ---------- summary cards (definitions must match mobile) ----------
  const onlineNodes   = nodes.filter(n => n.is_online && !n.is_force_sleeping && n.status !== "Maintenance")
  const criticalNodes = onlineNodes.filter(n => n.condition === "Critical").length
  const levels        = onlineNodes.map(n => n.water_level).filter((v): v is number => v != null)
  const avgLevel      = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : null

  // ---------- map markers (same condition rules as the admin dashboard map) ----------
  const markers = useMemo(() =>
    nodes
      .filter(n => n.latitude != null && n.longitude != null)
      .map(n => ({
        latitude:  n.latitude!,
        longitude: n.longitude!,
        label:     `${n.node_name} – ${n.barangay_details?.barangay_name ?? ""}`,
        sublabel:  `Water: ${n.water_level ?? "—"}cm | Clog: ${n.clog_pct ?? "—"}%`,
        condition:
          n.status === "Maintenance"            ? "Maintenance" :
          (n.is_force_sleeping || !n.is_online) ? "Sleep" :
          (n.condition ?? "Normal"),
      })),
    [nodes]
  )

  // ---------- waste composition (same math as the MENRO analytics page) ----------
  const share = (key: keyof WasteClassification) =>
    waste.reduce((sum, w) => sum + (w.estimated_volume || 0) * (Number(w[key]) || 0) / 100, 0)

  const totalWaste = waste.reduce((sum, w) => sum + (w.estimated_volume || 0), 0)
  const hasWaste = totalWaste > 0
  const compositionData = [
    { name: "Recyclable Waste",    value: share("recyclable_pct"),    color: "#7ED99B" },
    { name: "Biodegradable Waste", value: share("biodegradable_pct"), color: "#7CB3E8" },
    { name: "Residual Waste",      value: share("residual_pct"),      color: "#E8B27C" },
    { name: "Special Waste",       value: share("special_waste_pct"), color: "#E87C7C" },
  ]
  const unit = pickWeightUnit([totalWaste])
  const [totalValue, totalUnit] = formatWeightIn(totalWaste, unit).split(" ")

  const risk = FLOOD_RISK[rainfallCache.data] ?? FLOOD_RISK.Unknown

  return (
    // fills the layout's <main>; min-h keeps it usable on small laptops (main scrolls then)
    <div className="flex h-full min-h-[640px] flex-col gap-3 text-[#122A48]">
      {/* title */}
      <p className="shrink-0 text-[15px] font-bold min-[2560px]:text-lg">Barangay Summary</p>

      {/* summary cards: natural height */}
      <div className="grid w-full shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Monitoring Points"
          value={loading ? "—" : nodes.length}
          note="Sensor nodes in your barangay"
          icon={<RadioTower size={20} color="#2C7B3C" />}
          bg="bg-[#CDE3DE]"
        />
        <StatCard
          label="Critical Nodes"
          value={loading ? "—" : criticalNodes}
          note="Online nodes at critical level"
          icon={<TriangleAlert size={20} color="#D81010" />}
          bg="bg-[#FFE5E5]"
        />
        <StatCard
          label="Obstructed Canals"
          value={clogsCache.loading ? "—" : clogsCache.data}
          note="Canals with a clog awaiting response"
          icon={<Waves size={20} color="#D48A00" />}
          bg="bg-[#EED7AA]"
        />
        <StatCard
          label="Average Water Level"
          value={avgLevel != null ? `${avgLevel.toFixed(1)} cm` : "—"}
          note={avgLevel != null ? "Across online nodes" : "No online nodes right now"}
          icon={<Droplets size={20} color="#1565BC" />}
          bg="bg-[#1565BC29]"
        />
      </div>

      {/* map column + waste composition: takes ALL the remaining height */}
      <div className="flex min-h-0 w-full flex-1 gap-2">
        {/* map + flood risk */}
        <div className="flex min-h-0 min-w-0 flex-[3] flex-col gap-2">
          <div className="flex min-h-[300px] flex-1 flex-col rounded-lg border border-[#C6C6C8] bg-[#FAFCFD]">
            <div className="shrink-0 p-2">
              <p className="text-sm font-bold min-[2560px]:text-base">Canal Network Map</p>
            </div>
            {/* absolute inset-0 inside a relative flex-1 box = map always fills whatever height is left */}
            <div className="relative flex-1 overflow-hidden rounded-b-lg">
              <div className="absolute inset-0">
                {/* only mount once nodes are in, so the map centers on the real markers */}
                {!loading && (
                  <AgosMapWrapper
                    key={markers.length}
                    markers={markers}
                    zoom={15}
                    showMarkerPopups={true}
                  />
                )}
              </div>
            </div>
          </div>

          {/* overall flood risk */}
          <div className="flex shrink-0 items-center justify-between gap-3 rounded-lg border border-[#C6C6C8] bg-[#FAFCFD] p-3 shadow-[0_5px_4px_-4px_rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#1565BC29] p-2">
                <CloudRain size={20} color="#1565BC" />
              </div>
              <div>
                <p className="text-sm font-bold min-[2560px]:text-base">Overall Flood Risk Level</p>
                <p className="text-xs text-[#727272] min-[2560px]:text-sm">{risk.note}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium min-[2560px]:text-sm ${risk.badge}`}>
              {risk.label}
            </span>
          </div>
        </div>

        {/* waste composition (MENRO analytics style), stretches to the map column's height */}
        <div className="flex min-h-0 min-w-[260px] flex-1 flex-col rounded-lg border border-[#C6C6C8] bg-[#FAFCFD]">
          <div className="w-full shrink-0 p-2">
            <p className="text-sm font-bold min-[2560px]:text-base">Waste Composition</p>
            <p className="text-[11px] text-[#727272] min-[2560px]:text-xs">This month</p>
          </div>

          <hr />

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-4">
            {/* donut scales with screen height, never gets taller than the card allows */}
            <div className="relative aspect-square h-[clamp(140px,24vh,300px)] max-h-full shrink">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={hasWaste ? compositionData : [{ name: "No data", value: 1, color: "#E5E5E6" }]}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="66%"
                    outerRadius="98%"
                    paddingAngle={hasWaste ? 2 : 0}
                    stroke="none"
                  >
                    {(hasWaste ? compositionData : [{ color: "#E5E5E6" }]).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                {hasWaste ? (
                  <>
                    <span className="text-2xl font-bold min-[2560px]:text-4xl">{totalValue}</span>
                    <span className="text-xs text-[#122A48]/70 min-[2560px]:text-sm">{totalUnit.toUpperCase()}</span>
                  </>
                ) : (
                  <span className="px-4 text-xs text-[#727272] min-[2560px]:text-sm">No waste data this month</span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3">
              {compositionData.map(entry => {
                const pct = hasWaste ? (entry.value / totalWaste) * 100 : 0
                return (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs min-[2560px]:text-sm">
                      {entry.name} <span className="font-semibold">{pct.toFixed(1)}%</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}