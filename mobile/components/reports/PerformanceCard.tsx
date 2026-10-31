import React, { useCallback, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { api } from "@/lib/api";

type PeriodStats = {
  period_start: string;
  period_end: string;
  label: string;
  reports: number;
  total_waste_kg: number;
  avg_response_minutes: number | null;
};

type Summary = {
  current: PeriodStats;
  previous: PeriodStats;
  trend: PeriodStats[];
  submissions: { on_time: number; late: number; missed: number; total: number };
};

const ONE_DECIMAL = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
const fmtKg = (v: number) => `${v.toLocaleString("en-US", ONE_DECIMAL)} kg`;
const fmtCompact = (v: number) => (v >= 10000 ? `${(v / 1000).toFixed(1)}k` : v.toLocaleString("en-US", ONE_DECIMAL));

const fmtMinutes = (m: number | null) => {
  if (m == null) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  return r ? `${h} h ${r} min` : `${h} h`;
};

// goodWhenDown: true for response time (faster is better); leave out for counts, which stay neutral
function Delta({ diff, text, goodWhenDown }: { diff: number | null; text: string; goodWhenDown?: boolean }) {
  if (diff === null) return null;
  if (diff === 0) return <Text className="mt-0.5 text-[10px] text-[#94a3b8]">same as last</Text>;
  const up = diff > 0;
  const color = goodWhenDown === undefined ? "#64748b" : up === goodWhenDown ? "#dc2626" : "#16a34a";
  return (
    <View className="mt-0.5 flex-row items-center">
      <MaterialCommunityIcons name={up ? "arrow-up" : "arrow-down"} size={11} color={color} />
      <Text className="text-[10px]" style={{ color }}> {text} vs last</Text>
    </View>
  );
}

function Stat({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <View className="flex-1">
      <Text className="text-[10px] font-semibold uppercase text-[#94a3b8]">{label}</Text>
      <Text className="mt-0.5 text-[16px] font-bold text-[#122A48]" numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {children}
    </View>
  );
}

const SHELL = "mb-4 rounded-xl border border-[#e2e8f0] bg-white p-3.5";
const SHADOW = { elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } };

export default function PerformanceCard() {
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      api.get("/api/canal-reports/summary/")
        .then((d: Summary) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading && !data) {
    return (
      <View className={`${SHELL} items-center py-8`} style={SHADOW}>
        <ActivityIndicator color="#2F6FED" />
      </View>
    );
  }
  if (!data) return null;

  // nothing finished in any of the last 6 periods
  if (!data.trend.some((t) => t.reports > 0)) {
    return (
      <View className={SHELL} style={SHADOW}>
        <View className="mb-1.5 flex-row items-center gap-1.5">
          <MaterialCommunityIcons name="chart-line" size={18} color="#16a34a" />
          <Text className="text-sm font-bold text-[#122A48]">Your performance</Text>
        </View>
        <Text className="text-[12px] leading-5 text-[#64748b]">
          No finished reports yet. Once you verify your first report, your waste collected, response time and submission record will show up here.
        </Text>
      </View>
    );
  }

  const cur = data.current;
  const prev = data.previous;
  const hasPrev = prev.reports > 0;   // without a last period there is nothing to compare with
  const reportsDiff = hasPrev ? cur.reports - prev.reports : null;
  const wasteDiff = hasPrev ? Math.round((cur.total_waste_kg - prev.total_waste_kg) * 10) / 10 : null;
  const respDiff = cur.avg_response_minutes != null && prev.avg_response_minutes != null
    ? cur.avg_response_minutes - prev.avg_response_minutes
    : null;

  const max = Math.max(...data.trend.map((t) => t.total_waste_kg), 1);
  const { on_time, late, missed, total } = data.submissions;
  const allOnTime = total > 0 && on_time === total;

  return (
    <View className={SHELL} style={SHADOW}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <MaterialCommunityIcons name="chart-line" size={18} color="#16a34a" />
          <Text className="text-sm font-bold text-[#122A48]">Your performance</Text>
        </View>
        <Text className="text-[11px] font-semibold text-[#64748b]">{cur.label}</Text>
      </View>

      <View className="flex-row gap-3">
        <Stat label="Reports" value={String(cur.reports)}>
          <Delta diff={reportsDiff} text={String(Math.abs(reportsDiff ?? 0))} />
        </Stat>
        <Stat label="Waste" value={fmtKg(cur.total_waste_kg)}>
          <Delta diff={wasteDiff} text={fmtKg(Math.abs(wasteDiff ?? 0))} />
        </Stat>
        <Stat label="Avg response" value={fmtMinutes(cur.avg_response_minutes)}>
          <Delta diff={respDiff} text={fmtMinutes(Math.abs(respDiff ?? 0))} goodWhenDown />
        </Stat>
      </View>

      <View className="mt-3 flex-row items-end justify-between">
        {data.trend.map((t, i) => {
          const isCurrent = i === data.trend.length - 1;
          return (
            <View key={t.period_start} className="flex-1 items-center justify-end" style={{ height: 70 }}>
              <Text className="mb-0.5 text-[9px] font-semibold" style={{ color: isCurrent ? "#16a34a" : "#64748b" }}>
                {fmtCompact(t.total_waste_kg)}
              </Text>
              <View
                style={{
                  width: 14,
                  height: Math.max(3, (t.total_waste_kg / max) * 36),
                  borderRadius: 3,
                  backgroundColor: isCurrent ? "#16a34a" : "#cbd5e1",
                }}
              />
              <Text className="mt-0.5 text-[9px] text-[#94a3b8]">{t.label.split("-")[0]}</Text>
            </View>
          );
        })}
      </View>
      <Text className="mt-1 text-[10px] text-[#94a3b8]">Waste collected (kg) per period. Green is this period, still in progress.</Text>

      <View className="mt-3 flex-row items-center justify-between rounded-lg bg-[#f8fafc] px-3 py-2">
        <View className="flex-1 pr-2">
          <Text className="text-[12px] text-[#475569]">
            {total === 0 ? "No closed periods yet" : `${on_time} of ${total} periods on time`}
          </Text>
          {total > 0 && (
            <Text className="text-[10px] text-[#94a3b8]">
              Last {total} closed period{total === 1 ? "" : "s"}
              {late > 0 ? ` · ${late} late` : ""}
              {missed > 0 ? ` · ${missed} missed` : ""}
            </Text>
          )}
        </View>
        {total > 0 && (
          <View className="rounded-xl px-2 py-1" style={{ backgroundColor: allOnTime ? "#dcfce7" : "#ffedd5" }}>
            <Text className="text-[10px] font-semibold" style={{ color: allOnTime ? "#166534" : "#c2410c" }}>
              {allOnTime ? "All on time" : "Needs attention"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}