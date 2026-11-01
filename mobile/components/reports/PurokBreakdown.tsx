import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS, WATER_FLOW_OPTIONS, optionLabel,
} from "@/constants/reports";
import type { ReportPurokRow } from "@/types/reports";

export function PurokBreakdown({ rows }: { rows: ReportPurokRow[] }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen((o) => !o)} className="flex-row items-center gap-1 py-1">
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={18} color="#475569" />
        <Text className="text-[12px] font-semibold text-[#475569]">See per purok</Text>
      </TouchableOpacity>

      {open && (
        <View className="mt-1 rounded-xl border border-[#e2e8f0] bg-white">
          {rows.map((r, i) => (
            <View
              key={r.purok}
              className={`flex-row items-center justify-between px-3 py-2 ${i > 0 ? "border-t border-[#f1f5f9]" : ""}`}
            >
              <Text className="text-[12px] font-bold text-[#122A48]">Purok {r.purok}</Text>
              {r.included ? (
                <Text className="text-[12px] text-[#334155]">
                  {optionLabel(WATER_LEVEL_OPTIONS, r.overall_water_level)} · {optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, r.overall_obstruction_coverage)} · {optionLabel(WATER_FLOW_OPTIONS, r.overall_water_flow_condition)}
                </Text>
              ) : (
                <Text className="text-[12px] italic text-[#94a3b8]">
                  {r.node_count === 0 ? "No sensors" : "No readings this week"}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}