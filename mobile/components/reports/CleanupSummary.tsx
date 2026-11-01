import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ChipSelect from "@/components/reports/ChipSelect";
import {
  WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS, optionLabel,
} from "@/constants/reports";
import type {
  CleanupPreviewPurok, WaterLevel, ObstructionCoverage, WaterFlowCondition,
} from "@/types/reports";

interface Props {
  puroks: CleanupPreviewPurok[];
  loading?: boolean;
  manual: {
    water: WaterLevel | null;
    obstruction: ObstructionCoverage | null;
    flow: WaterFlowCondition | null;
  };
  onManualChange: (patch: { waterLevel?: WaterLevel; obstructionCoverage?: ObstructionCoverage; waterFlowCondition?: WaterFlowCondition }) => void;
}

// options are ordered from mildest to worst, so the highest index is the worst value
function worst<T extends string>(opts: { value: T }[], vals: (T | null)[]): T | null {
  let best = -1;
  vals.forEach((v) => {
    if (!v) return;
    const i = opts.findIndex((o) => o.value === v);
    if (i > best) best = i;
  });
  return best < 0 ? null : opts[best].value;
}

function Tag({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: bg }}>
      <Text className="text-[10px] font-bold" style={{ color }}>{text}</Text>
    </View>
  );
}

function Locked({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1 w-1/3 pr-2">
      <Text className="mb-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">{label}</Text>
      <Text className="text-[13px] font-semibold text-[#122A48]">{value}</Text>
    </View>
  );
}

export function CleanupSummary({ puroks, loading, manual, onManualChange }: Props) {
  const [open, setOpen] = useState(false);

  if (loading && puroks.length === 0) {
    return <ActivityIndicator className="my-6" color="#16a34a" />;
  }
  if (puroks.length === 0) return null;

  const counted = puroks.filter((p) => p.has_sensor_data);
  const readings = counted.reduce((s, p) => s + p.reading_count, 0);

  return (
    <View>
      {counted.length > 0 ? (
        <View className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-[13px] font-bold text-[#122A48]">Barangay summary</Text>
            <Tag text="SENSOR" color="#15803d" bg="#dcfce7" />
          </View>
          <View className="flex-row flex-wrap">
            <Locked label="Water level" value={optionLabel(WATER_LEVEL_OPTIONS, worst(WATER_LEVEL_OPTIONS, counted.map((p) => p.overall_water_level)))} />
            <Locked label="Obstruction" value={optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, worst(OBSTRUCTION_COVERAGE_OPTIONS, counted.map((p) => p.overall_obstruction_coverage)))} />
            <Locked label="Water flow" value={optionLabel(WATER_FLOW_OPTIONS, worst(WATER_FLOW_OPTIONS, counted.map((p) => p.overall_water_flow_condition)))} />
          </View>
          <Text className="mt-1 text-[11px] text-[#64748b]">
            Based on {counted.length} of {puroks.length} puroks with sensor data · {readings} readings
          </Text>
        </View>
      ) : (
        <View className="rounded-xl border border-[#fde68a] bg-[#fffbeb] p-3">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-[13px] font-bold text-[#122A48]">Barangay summary</Text>
            <Tag text="MANUAL" color="#b45309" bg="#fef3c7" />
          </View>
          <Text className="mb-3 text-[11px] text-[#92400e]">
            No sensor data for this week. Enter the canal condition for the whole barangay.
          </Text>
          <ChipSelect label="Water level" required options={WATER_LEVEL_OPTIONS}
            value={manual.water} onChange={(v) => onManualChange({ waterLevel: v })} />
          <ChipSelect label="Obstruction coverage" required options={OBSTRUCTION_COVERAGE_OPTIONS}
            value={manual.obstruction} onChange={(v) => onManualChange({ obstructionCoverage: v })} />
          <ChipSelect label="Water flow" required options={WATER_FLOW_OPTIONS}
            value={manual.flow} onChange={(v) => onManualChange({ waterFlowCondition: v })} />
        </View>
      )}

      <TouchableOpacity onPress={() => setOpen((o) => !o)} className="mt-2.5 flex-row items-center gap-1 py-1">
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={18} color="#475569" />
        <Text className="text-[12px] font-semibold text-[#475569]">See per purok</Text>
      </TouchableOpacity>

      {open && (
        <View className="mt-1 rounded-xl border border-[#e2e8f0] bg-white">
          {puroks.map((p, i) => (
            <View key={p.purok} className={`px-3 py-2 ${i > 0 ? "border-t border-[#f1f5f9]" : ""}`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-[12px] font-bold text-[#122A48]">Purok {p.purok}</Text>
                {p.has_sensor_data ? (
                  <Text className="text-[12px] text-[#334155]">
                    {optionLabel(WATER_LEVEL_OPTIONS, p.overall_water_level)} · {optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, p.overall_obstruction_coverage)} · {optionLabel(WATER_FLOW_OPTIONS, p.overall_water_flow_condition)}
                  </Text>
                ) : (
                  <Text className="text-[12px] italic text-[#94a3b8]">
                    {p.node_names.length === 0 ? "No sensors" : "No readings this week"}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}