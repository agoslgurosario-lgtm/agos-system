import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import type { PeriodInfo } from "@/types/submissions";

export const fmtDay = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const periodLabel = (p: Pick<PeriodInfo, "period_start" | "period_end">) =>
  `${fmtDay(p.period_start)} - ${new Date(p.period_end + "T00:00:00").getDate()}`;

export const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Open:      { bg: "#e0f2fe", text: "#0369a1" },
  Overdue:   { bg: "#ffedd5", text: "#c2410c" },
  Missed:    { bg: "#f1f5f9", text: "#64748b" },
  Submitted: { bg: "#dcfce7", text: "#166534" },
};

export default function SubmitBanner() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodInfo[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      api.get("/api/canal-reports/periods/")
        .then((d: { periods: PeriodInfo[] }) => setPeriods(d.periods))
        .catch(() => setPeriods(null));
    }, [])
  );

  if (!periods || periods.length === 0) return null;

  // periods are newest first; look for the oldest one that is waiting
  const target =
    [...periods].reverse().find((p) => p.can_submit && p.verified_count > 0) ?? periods[0];
  const s = STATUS_STYLE[target.status];
  const hasReports = target.verified_count > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push("/submit-reports" as any)}
      className="mb-4 rounded-xl border border-[#e2e8f0] bg-white p-3.5"
      style={{ elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <MaterialCommunityIcons name="send-check-outline" size={18} color="#16a34a" />
          <Text className="text-sm font-bold text-[#122A48]">Submit to MENRO</Text>
        </View>
        <View className="rounded-xl px-2.5 py-1" style={{ backgroundColor: s.bg }}>
          <Text className="text-[11px] font-semibold" style={{ color: s.text }}>{target.status}</Text>
        </View>
      </View>
      <Text className="text-[13px] font-semibold text-[#122A48]">
        {periodLabel(target)} · due {fmtDay(target.due_date)}
      </Text>
      <Text className="mt-0.5 text-[12px] text-[#64748b]">
        {target.status === "Submitted"
          ? "Submitted. Nothing is waiting."
          : hasReports
            ? `${target.verified_count} verified report${target.verified_count === 1 ? "" : "s"} ready to submit`
            : "No verified reports yet for this period"}
      </Text>
      <View className="mt-2.5 flex-row items-center gap-1">
        <Text className="text-[12px] font-semibold text-[#15803d]">{hasReports ? "Review & submit" : "View periods"}</Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#15803d" />
      </View>
    </TouchableOpacity>
  );
}