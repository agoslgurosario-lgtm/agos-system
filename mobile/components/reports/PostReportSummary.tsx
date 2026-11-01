import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS, optionLabel, severityLabel,
} from "@/constants/reports";

export type SystemData = {
  available?: boolean;
  reading_count?: number;
  peak_clog_pct?: number | null;
  avg_clog_pct?: number | null;
  peak_water_level_cm?: number | null;
  peak_water_level_pct?: number | null;
  overall_water_level?: string | null;
  overall_obstruction_coverage?: string | null;
  overall_water_flow_condition?: string | null;
};

type Props = {
  barangay: string;
  purok: number | null;
  detectedAt: Date | null;
  severity: string | null;
  personnel: string;
  respondedAt: Date | null;
  action: string;
  condition: { waterLevel: string | null; obstruction: string | null; flow: string | null };
  system: SystemData | null;
  systemLoading: boolean;
  completed: boolean;
};

function formatDateTime(d: Date | null) {
  if (!d || isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2.5">
      <Text className="mb-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">{label}</Text>
      <Text className="text-[13px] font-semibold text-[#122A48]">{value || "—"}</Text>
    </View>
  );
}

function Title({ icon, text }: { icon: string; text: string }) {
  return (
    <View className="mb-3 mt-1 flex-row items-center gap-1.5">
      <MaterialCommunityIcons name={icon as any} size={16} color="#16a34a" />
      <Text className="text-xs font-bold tracking-wide text-[#16a34a]">{text}</Text>
    </View>
  );
}

export function PostReportSummary(p: Props) {
  // before completion, show what the sensors will record; afterwards, what was saved
  const fromSensors = !p.completed && p.system?.available;
  const water = fromSensors ? p.system!.overall_water_level ?? null : p.condition.waterLevel;
  const obstruction = fromSensors ? p.system!.overall_obstruction_coverage ?? null : p.condition.obstruction;
  const flow = fromSensors ? p.system!.overall_water_flow_condition ?? null : p.condition.flow;

  return (
    <View>
      <Title icon="clipboard-text-clock-outline" text="RESPONSE (FROM THE PRE-REPORT)" />
      <View className="mb-1 flex-row gap-3">
        <View className="flex-1"><Row label="Barangay" value={p.barangay} /></View>
        <View className="flex-1"><Row label="Purok" value={p.purok ? `Purok ${p.purok}` : ""} /></View>
      </View>
      <View className="mb-1 flex-row gap-3">
        <View className="flex-[2]"><Row label="Detected by system" value={formatDateTime(p.detectedAt)} /></View>
        <View className="flex-1"><Row label="Severity" value={severityLabel(p.severity)} /></View>
      </View>
      <Row label="Responded" value={formatDateTime(p.respondedAt)} />
      <Row label="Assigned personnel" value={p.personnel} />
      <Row label="Action" value={p.action} />

      <View className="my-3 h-px bg-[#f1f5f9]" />

      <Title icon="access-point" text="CANAL CONDITION (FROM THE SENSORS)" />
      {p.systemLoading ? (
        <ActivityIndicator color="#16a34a" />
      ) : (
        <>
          <View className="mb-1 flex-row gap-3">
            <View className="flex-1"><Row label="Water level" value={optionLabel(WATER_LEVEL_OPTIONS, water)} /></View>
            <View className="flex-1"><Row label="Obstruction" value={optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, obstruction)} /></View>
          </View>
          <Row label="Water flow" value={optionLabel(WATER_FLOW_OPTIONS, flow)} />

          {p.system?.available ? (
            <Text className="mb-1 text-[11px] text-[#64748B]">
              Based on {p.system.reading_count} reading{p.system.reading_count === 1 ? "" : "s"} while the clog was open
              {p.system.peak_clog_pct != null ? ` · peak clog ${Math.round(p.system.peak_clog_pct)}%` : ""}
              {p.system.peak_water_level_pct != null ? ` · peak water level ${Math.round(p.system.peak_water_level_pct)}% of canal depth` : ""}
            </Text>
          ) : (
            <Text className="mb-1 text-[11px] text-[#dc2626]">No sensor readings were found for this event.</Text>
          )}
          <Text className="text-[11px] text-[#94a3b8]">
            {p.completed
              ? "Saved from the node's sensors when the post-report was completed."
              : "Taken from the node's sensors. These are recorded when you complete the post-report and can't be edited."}
          </Text>
        </>
      )}

      <View className="mb-3 mt-3 h-px bg-[#f1f5f9]" />
    </View>
  );
}