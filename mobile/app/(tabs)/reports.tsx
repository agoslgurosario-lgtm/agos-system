import React, { useState, useCallback, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { CanalMonitoringReport } from "@/types/reports";
import { SEVERITY_COLORS } from "@/constants/reports";
import AlertBellButton from "@/components/alerts/AlertBellButton";

import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Shadow } from "react-native-shadow-2";

import { exportPdf } from "@/lib/exportPdf";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View
      className="flex-1 rounded-xl border border-[#f1f5f9] bg-white p-3.5"
      style={{
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Text className="mb-1.5 text-xs font-medium text-[#122A48]">
        {label}
      </Text>
      <Text className="text-xl font-bold text-[#122A48]">
        {value}
      </Text>
    </View>
  );
}

function SeverityBadge({ severity }: { severity: CanalMonitoringReport["severity"] }) {
  if (!severity) return null;
  const colors = SEVERITY_COLORS[severity];

  return (
    <View
      className="shrink-0 self-start rounded-xl px-2.5 py-1"
      style={{ backgroundColor: colors.bg }}
    >
      <Text className="text-[11px] font-semibold" style={{ color: colors.text }}>
        {severity}
      </Text>
    </View>
  );
}

function InProgressBadge() {
  return (
    <View className="shrink-0 self-start rounded-xl bg-[#fef3c7] px-2.5 py-1">
      <Text className="text-[11px] font-semibold text-[#b45309]">In progress</Text>
    </View>
  );
}

function formatObserved(report: CanalMonitoringReport) {
  if (!report.date_observed) return "No date yet";
  const d = new Date(report.date_observed);
  if (isNaN(d.getTime())) return "No date yet";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ReportsListScreen() {
  const router = useRouter();
  const hasLoadedOnce = useRef(false);
  const insets = useSafeAreaInsets()

  const [reports, setReports] = useState<CanalMonitoringReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [exportingId, setExportingId] = useState<number | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }
    setError("");
    try {
      const res = await api.get("/api/canal-reports/mine/");
      setReports(res.results ?? res);
      hasLoadedOnce.current = true;
    } catch (err: any) {
      setError(err?.detail ?? "Failed to load reports.");
    } finally {
      isRefresh ? setRefreshing(false) : setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalReports = reports.length;
  const submittedCount = reports.filter((r) => r.is_submitted).length;
  const inProgressCount = reports.filter((r) => !r.is_submitted).length;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonthCount = reports.filter(
    (r) => r.is_submitted && (r.date_observed ?? "").startsWith(currentMonth)
  ).length;

  const sortedReports = [...reports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const goToReport = (report: CanalMonitoringReport) => {
    if (!report.is_submitted) {
      router.push({
        pathname: "/new-report",
        params: { report_id: String(report.report_id) },
      } as any);
    } else {
      router.push({
        pathname: "/view-report",
        params: { id: String(report.report_id) },
      } as any);
    }
  };

  const handleExport = async (report: CanalMonitoringReport) => {
    setExportingId(report.report_id);
    try {
      await exportPdf(
        `/api/canal-reports/${report.report_id}/export/`,
        `${report.barangay_details?.barangay_name ?? "barangay"}-Canal-Report-${report.report_id}.pdf`
      );
    } catch {
      Alert.alert("Export failed", "Could not generate the PDF. Please try again.");
    } finally {
      setExportingId(null);
    }
  };

  if (isLoading || refreshing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-3">
        <ActivityIndicator color="#2F6FED" />
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={["top"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#122A48" />
        }
        contentContainerClassName="p-4 pb-8"
      >
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <Text className="flex-1 text-lg font-bold text-[#122A48]" numberOfLines={2}>
            Canal Monitoring Reports
          </Text>

          <AlertBellButton />
        </View>

        {error ? <Text className="mb-3 text-xs text-[#dc2626]">{error}</Text> : null}

        <View className="mb-5 gap-2.5">
          <View className="flex-row gap-2.5">
            <MetricCard label="Total reports" value={totalReports} />
            <MetricCard label="Submitted" value={submittedCount} />
          </View>
          <View className="flex-row gap-2.5">
            <MetricCard label="In progress" value={inProgressCount} />
            <MetricCard label="This month" value={thisMonthCount} />
          </View>
        </View>

        <Text className="mb-3 text-sm font-semibold text-[#122A48]">Recent Reports</Text>

        <View className="gap-3">
          {sortedReports.length === 0 && (
            <Text className="mt-5 text-center text-[13px] text-[#94a3b8]">
              No reports yet. Tap "Add report" to file one.
            </Text>
          )}

          {sortedReports.map((report) => {
            const isDraft = !report.is_submitted;
            const filesCount = report.media?.length ?? 0;
            const collected = report.waste_collected_amount;

            return (
              <TouchableOpacity
                key={report.report_id}
                activeOpacity={0.9}
                onPress={() => goToReport(report)}
                style={{
                  elevation: 2,
                  shadowColor: "#000",
                  shadowOpacity: 0.06,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                }}
                className="rounded-xl border border-[#e2e8f0] bg-white p-3.5"
              >
                <View className="mb-2.5 flex-row items-start justify-between gap-2">
                  <View className="flex-1 flex-row items-center gap-2">
                    <MaterialCommunityIcons
                      name={isDraft ? "clipboard-text-outline" : "checkbox-marked-circle-outline"}
                      size={20}
                      color={isDraft ? "#d97706" : "#16a34a"}
                      style={{ marginTop: 2 }}
                    />
                    <Text className="flex-1 shrink text-sm font-semibold leading-5 text-[#122A48]">
                      {report.canal_name || "Untitled canal"}
                    </Text>
                  </View>
                  {isDraft ? <InProgressBadge /> : <SeverityBadge severity={report.severity} />}
                </View>

                <View className="mb-2 flex-row flex-wrap items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <MaterialCommunityIcons name="calendar-outline" size={14} color="#64748b" />
                    <Text className="text-[11px] text-[#64748b]">{formatObserved(report)}</Text>
                  </View>
                  {collected != null && (
                    <View className="flex-row items-center gap-1">
                      <MaterialCommunityIcons name="scale-balance" size={14} color="#64748b" />
                      <Text className="text-[11px] text-[#64748b]">
                        {collected} kg
                      </Text>
                    </View>
                  )}
                  <View className="flex-row items-center gap-1">
                    <MaterialCommunityIcons name="paperclip" size={14} color="#64748b" />
                    <Text className="text-[11px] text-[#64748b]">
                      {filesCount} {filesCount === 1 ? "file" : "files"}
                    </Text>
                  </View>
                </View>

                {report.nearest_landmark ? (
                  <View className="mb-2 flex-row items-center gap-1">
                    <MaterialCommunityIcons name="map-marker-outline" size={14} color="#94a3b8" />
                    <Text className="flex-1 text-[11px] text-[#94a3b8]" numberOfLines={1}>
                      {report.nearest_landmark}
                    </Text>
                  </View>
                ) : null}

                <View className="mb-3 h-px bg-[#f1f5f9]" />

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      goToReport(report);
                    }}
                    className={`flex-1 flex-row items-center justify-center gap-1 rounded-md py-1.5 ${
                      isDraft ? "bg-[#15803d]" : "border border-[#cbd5e1]"
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={isDraft ? "pencil-outline" : "eye-outline"}
                      size={14}
                      color={isDraft ? "white" : "#475569"}
                    />
                    <Text className={`text-xs font-semibold ${isDraft ? "text-white" : "text-[#475569] font-medium"}`}>
                      {isDraft ? "Continue report" : "View"}
                    </Text>
                  </TouchableOpacity>

                  {/* Export only on submitted reports — the backend PDF needs date_observed, which a draft may not have yet */}
                  {!isDraft && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleExport(report);
                      }}
                      disabled={exportingId === report.report_id}
                      className="flex-1 flex-row items-center justify-center gap-1 rounded-md border border-[#cbd5e1] py-1.5"
                      style={exportingId === report.report_id ? { opacity: 0.6 } : undefined}
                    >
                      {exportingId === report.report_id ? (
                        <ActivityIndicator size="small" color="#475569" />
                      ) : (
                        <MaterialCommunityIcons name="tray-arrow-up" size={14} color="#475569" />
                      )}
                      <Text className="text-xs font-medium text-[#475569]">
                        {exportingId === report.report_id ? "Exporting..." : "Export"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ position: "absolute", bottom: 20 + insets.bottom, right: 20 }}>
        <Shadow
          distance={8}
          startColor="#0000001A"
          offset={[0, 4]}
          style={{ borderRadius: 16 }}
        >
          <TouchableOpacity
            onPress={() => router.push("/new-report" as any)}
            className="flex-row items-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 py-3.5"
          >
            <MaterialCommunityIcons name="plus" size={20} color="white" />
            <Text className="text-[13px] font-semibold text-white">Add report</Text>
          </TouchableOpacity>
        </Shadow>
      </View>
    </SafeAreaView>
  );
}