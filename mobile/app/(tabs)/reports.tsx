import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { api } from "@/lib/api";
import { CanalMonitoringReport } from "@/types/reports";
import { SEVERITY_COLORS, severityLabel } from "@/constants/reports";
import AlertBellButton from "@/components/alerts/AlertBellButton";
import SubmitBanner from "@/components/reports/SubmitBanner";
import PerformanceCard from "@/components/reports/PerformanceCard";
import Pagination from "@/components/alerts/Pagination";
import ReportFilterSheet, { type SeverityFilter, type StatusFilter } from "@/components/reports/ReportFilterSheet";

import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Shadow } from "react-native-shadow-2";

import { exportPdf } from "@/lib/exportPdf";


const PAGE_SIZE = 5;

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
        {severityLabel(severity)}
      </Text>
    </View>
  );
}

const STATUS_BADGE: Record<string, { label: string; bg: string; text: string }> = {
  Draft:                { label: "In progress",          bg: "#fef3c7", text: "#b45309" },  // amber
  Awaiting_Post_Report: { label: "Awaiting post-report", bg: "#e0f2fe", text: "#0369a1" },  // blue
  Ready_To_Verify:      { label: "Ready to verify",      bg: "#dcfce7", text: "#166534" },  // green
  Verified:             { label: "Verified",             bg: "#ede9fe", text: "#6d28d9" },  // violet
  Voided:               { label: "Voided",               bg: "#f1f5f9", text: "#64748b" },  // grey
}

function InProgressBadge({ status }: { status?: string }) {
  const s = STATUS_BADGE[status ?? "Draft"] ?? STATUS_BADGE.Draft;
  return (
    <View className="shrink-0 self-start rounded-xl px-2.5 py-1" style={{ backgroundColor: s.bg }}>
      <Text className="text-[11px] font-semibold" style={{ color: s.text }}>{s.label}</Text>
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
  const [page, setPage] = useState(1);

  // filters (same sheet pattern as the Sensor Nodes screen)
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [filterVisible, setFilterVisible] = useState(false);
  const filtersActive = severityFilter !== "All" || statusFilter !== "All";
  const prevCount = useRef(0);

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

  const inProgressCount = reports.filter((r) => !r.is_submitted).length;

  // a report with no severity yet (still in progress) can't match a severity filter
  const filteredReports = reports.filter((r) => {
    if (severityFilter !== "All" && r.severity !== severityFilter) return false;
    if (statusFilter !== "All" && r.status !== statusFilter) return false;
    return true;
  });

  const sortedReports = [...filteredReports].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const totalPages = Math.max(1, Math.ceil(sortedReports.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageReports = sortedReports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [severityFilter, statusFilter]);

  useEffect(() => {
    if (prevCount.current > 0 && reports.length > prevCount.current) setPage(1);
    prevCount.current = reports.length;
  }, [reports.length]);

  const needsReview = (r: CanalMonitoringReport) =>
    !r.is_submitted && (r.status === "Ready_To_Verify" || r.status === "Verified");

  const goToReport = (report: CanalMonitoringReport) => {
    if (report.is_submitted || needsReview(report)) {
      router.push({ pathname: "/view-report", params: { id: String(report.report_id) } } as any);
    } else {
      router.push({ pathname: "/new-report", params: { report_id: String(report.report_id) } } as any);
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
        contentContainerClassName="p-4 pb-28"
      >
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <Pressable onPress={() => setFilterVisible(true)} hitSlop={10} className="relative">
            <Ionicons name="filter-outline" size={22} color="#334155" />
            {filtersActive && (
              <View className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#D81010]" />
            )}
          </Pressable>

          <Text className="flex-1 text-center text-lg font-bold text-[#122A48]" numberOfLines={2}>
            Canal Monitoring Reports
          </Text>

          <AlertBellButton />
        </View>

        {error ? <Text className="mb-3 text-xs text-[#dc2626]">{error}</Text> : null}

        <SubmitBanner />

        <PerformanceCard />

        <Text className="mb-3 text-sm font-semibold text-[#122A48]">Recent Reports</Text>

        <View className="gap-3">
          {reports.length === 0 && (
            <Text className="mt-5 text-center text-[13px] text-[#94a3b8]">
              No reports yet. Tap "Add report" to file one.
            </Text>
          )}

          {reports.length > 0 && sortedReports.length === 0 && (
            <Text className="mt-5 text-center text-[13px] text-[#94a3b8]">
              No reports match these filters.
            </Text>
          )}

          {pageReports.map((report) => {
            const isDraft = !report.is_submitted && !needsReview(report);
            const isReview = needsReview(report);
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
                      name={isDraft || isReview ? "clipboard-text-outline" : "checkbox-marked-circle-outline"}
                      size={20}
                      color={isDraft || isReview ? "#d97706" : "#16a34a"}
                      style={{ marginTop: 2 }}
                    />
                    <Text className="flex-1 shrink text-sm font-semibold leading-5 text-[#122A48]">
                      {report.report_scope === "Barangay" ? "Weekly cleanup" : report.purok ? `Purok ${report.purok}` : "Untitled report"}
                    </Text>
                  </View>
                  {isDraft || isReview ? <InProgressBadge status={report.status} /> : <SeverityBadge severity={report.severity} />}
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

                <View className="mb-3 h-px bg-[#f1f5f9]" />

                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation(); goToReport(report); }}
                    className={`flex-1 flex-row items-center justify-center gap-1 rounded-md py-1.5 ${
                      isDraft || report.status === "Ready_To_Verify" ? "bg-[#15803d]" : "border border-[#cbd5e1]"
                    }`}
                  >
                    <MaterialCommunityIcons
                      name={isDraft ? "pencil-outline" : report.status === "Ready_To_Verify" ? "shield-check-outline" : "eye-outline"}
                      size={14}
                      color={isDraft || report.status === "Ready_To_Verify" ? "white" : "#475569"}
                    />
                    <Text className={`text-xs font-semibold ${isDraft || report.status === "Ready_To_Verify" ? "text-white" : "text-[#475569] font-medium"}`}>
                      {isDraft ? "Continue report" : report.status === "Ready_To_Verify" ? "Review & verify" : "View"}
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

        <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
      </ScrollView>

      <ReportFilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        severity={severityFilter}
        status={statusFilter}
        onApply={(sev, st) => { setSeverityFilter(sev); setStatusFilter(st); }}
      />

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