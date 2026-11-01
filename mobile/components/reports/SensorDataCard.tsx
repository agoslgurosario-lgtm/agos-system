import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { CanalMonitoringReport } from "@/types/reports";

type Summary = NonNullable<CanalMonitoringReport["node_summaries"]>[number];

function fmt(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

const num = (v: number | null, unit: string) => (v == null ? "—" : `${Math.round(v * 10) / 10}${unit}`);

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 w-1/2 pr-2">
      <Text className="mb-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">{label}</Text>
      <Text className="text-[12px] font-semibold text-[#122A48]">{value}</Text>
    </View>
  );
}

export function SensorDataCard({ summaries }: { summaries: Summary[] }) {
  return (
    <View>
      <View className="mb-3 mt-1 flex-row items-center gap-1.5">
        <MaterialCommunityIcons name="access-point" size={16} color="#16a34a" />
        <Text className="text-xs font-bold tracking-wide text-[#16a34a]">SENSOR DATA</Text>
      </View>
      {summaries.map((s, i) => (
        <View key={i} className="mb-3 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
          <Text className="mb-0.5 text-[13px] font-bold text-[#122A48]">{s.node_name}</Text>
          <Text className="mb-2 text-[11px] text-[#64748B]">
            {s.hotspot_name}{s.purok ? ` · Purok ${s.purok}` : ""}
          </Text>
          <View className="flex-row flex-wrap">
            <Item label="Readings" value={String(s.reading_count)} />
            <Item label="Peak clog" value={num(s.peak_clog_pct, "%")} />
            <Item label="Average clog" value={num(s.avg_clog_pct, "%")} />
            <Item label="Peak water level" value={s.peak_water_level_pct != null ? `${num(s.peak_water_level_pct, "%")} of depth` : num(s.peak_water_level_cm, " cm")} />
            <Item label="Worst water status" value={s.worst_water_status || "—"} />
            <Item label="Worst flow" value={`${s.worst_flow || "—"}${s.min_flow_rate != null ? ` (${num(s.min_flow_rate, " m/s")})` : ""}`} />
          </View>
          <Text className="text-[10px] text-[#94a3b8]">{fmt(s.window_start)} to {fmt(s.window_end)}</Text>
        </View>
      ))}
    </View>
  );
}