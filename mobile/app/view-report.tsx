import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { api } from "@/lib/api";
import { exportPdf } from "@/lib/exportPdf";
import type { CanalMonitoringReport, FinalCanalCondition } from "@/types/reports";
import {
  SEVERITY_COLORS, WATER_LEVEL_OPTIONS, OBSTRUCTION_COVERAGE_OPTIONS,
  WATER_FLOW_OPTIONS, FINAL_CONDITION_OPTIONS, optionLabel,
} from "@/constants/reports";
import { PhotoPreviewModal } from "@/components/reports/PhotoPreviewModal";


const WASTE_ROWS: { key: keyof CanalMonitoringReport; label: string }[] = [
  { key: "waste_plastic_kg", label: "Plastic" },
  { key: "waste_food_wrapper_kg", label: "Food Wrapper" },
  { key: "waste_paper_cardboard_kg", label: "Paper / Cardboard" },
  { key: "waste_glass_kg", label: "Glass" },
  { key: "waste_organic_kg", label: "Organic" },
  { key: "waste_metal_kg", label: "Metal" },
  { key: "waste_foam_kg", label: "Foam" },
  { key: "waste_textile_kg", label: "Clothes / Textiles" },
  { key: "waste_ewaste_kg", label: "E-waste" },
];

const FINAL_CONDITION_COLORS: Record<FinalCanalCondition, string> = {
  Clear: "#15803d",
  Partially_Clear: "#b45309",
  Still_Obstructed: "#b91c1c",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function DetailLabelValue({ label, value, flex = 1, valueColor = "#122A48", }: {
  label: string;
  value: string;
  flex?: number;
  valueColor?: string;
}) {
  return (
    <View className="mb-3" style={{ flex }}>
      <Text className="mb-1 text-[10px] font-bold uppercase text-[#94a3b8]">
        {label}
      </Text>
      <Text className="text-[13px] font-bold" style={{ color: valueColor }}>
        {value || "—"}
      </Text>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View className="mb-3 mt-1 flex-row items-center gap-1.5">
      <MaterialCommunityIcons name={icon as any} size={16} color="#16a34a" />
      <Text className="text-xs font-bold tracking-wide text-[#16a34a]">
        {title}
      </Text>
    </View>
  );
}

function WasteRow({ label, kg }: { label: string; kg: number }) {
  return (
    <View className="flex-row items-center justify-between border-b border-[#f1f5f9] py-2">
      <Text className="text-[13px] text-[#475569]">{label}</Text>
      <Text className="text-[13px] font-bold text-[#122A48]">{kg.toFixed(2)} kg</Text>
    </View>
  );
}

export default function ViewReportScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const [report, setReport] = useState<CanalMonitoringReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [preview, setPreview] = useState<{ photos: { uri: string }[]; index: number } | null>(null);

  useEffect(() => {
    if (!params.id) {
      setIsLoading(false);
      setLoadError(true);
      return;
    }
    api
      .get(`/api/canal-reports/${params.id}/`)
      .then((data: CanalMonitoringReport) => {
        // an unsubmitted report belongs in the form, not the read-only view
        if (!data.is_submitted) {
          router.replace({
            pathname: "/new-report",
            params: { report_id: String(data.report_id) },
          } as any);
          return;
        }
        setReport(data);
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setIsLoading(false);
      });
  }, [params.id, router]);

  const handleExport = async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await exportPdf(
        `/api/canal-reports/${report.report_id}/export/`,
        `${report.barangay_details?.barangay_name ?? "barangay"}-Canal-Report-${report.report_id}.pdf`
      );
    } catch {
      Alert.alert("Export failed", "Could not generate the PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f8fafc]">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  if (!report || loadError) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f8fafc]">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-sm text-[#64748b]">Report not found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-3">
          <Text className="font-semibold text-[#1d4ed8]">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const bannerColors = report.severity
    ? SEVERITY_COLORS[report.severity]
    : { bg: "#e2e8f0", text: "#475569" };

  const coordinates =
    report.latitude != null && report.longitude != null
      ? `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`
      : "";

  const wasteRows = [
    ...WASTE_ROWS.map((row) => ({ label: row.label, kg: Number(report[row.key] ?? 0) })),
    {
      label: report.waste_other_label ? `Other (${report.waste_other_label})` : "Other",
      kg: report.waste_other_kg ?? 0,
    },
  ].filter((row) => row.kg > 0);

  const photosBy = (category: string) => report.media.filter((m) => m.media_category === category);
  const photoGroups = [
    { label: "Before Cleanup", items: photosBy("Before_Clearing") },
    { label: "After Cleanup", items: photosBy("After_Clearing") },
    { label: "Additional Evidence", items: photosBy("Additional_Evidence") },
  ].filter((group) => group.items.length > 0);

  const filedBy = report.reported_by_details
    ? `${report.reported_by_details.first_name} ${report.reported_by_details.last_name}`
    : "";

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-[#122A48] -ml-7">Report Details</Text>
        <View></View>
      </View>

      <View
        className="flex-row items-center justify-between px-4 py-2.5"
        style={{ backgroundColor: bannerColors.bg }}
      >
        <View className="flex-row items-center gap-1.5">
          <MaterialCommunityIcons name="alert-circle-outline" size={18} color={bannerColors.text} />
          <Text className="text-[13px] font-bold" style={{ color: bannerColors.text }}>
            {report.severity ? `${report.severity} severity` : "Submitted"}
          </Text>
        </View>
        <Text className="text-xs font-semibold" style={{ color: bannerColors.text }}>
          {formatDateTime(report.date_observed)}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="px-3.5 pt-3 pb-6">
        <View
          className="rounded-2xl border border-[#f1f5f9] bg-white p-4"
          style={{
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        >
          {/* SITE */}
          <SectionHeader icon="map-marker-radius-outline" title="MONITORING SITE" />
          <DetailLabelValue label="CANAL NAME / ID" value={report.canal_name ?? ""} />
          <View className="flex-row">
            <DetailLabelValue label="BARANGAY" value={report.barangay_details?.barangay_name ?? ""} />
            <DetailLabelValue label="MUNICIPALITY" value="Rosario, La Union" />
          </View>
          <DetailLabelValue label="GPS COORDINATES" value={coordinates} />
          <DetailLabelValue label="NEAREST LANDMARK" value={report.nearest_landmark} />

          <View className="my-3 h-px bg-[#f1f5f9]" />

          {/* DETECTION SUMMARY */}
          <SectionHeader icon="clipboard-alert-outline" title="DETECTION SUMMARY" />
          <View className="flex-row">
            <DetailLabelValue label="DATE / TIME OBSERVED" value={formatDateTime(report.date_observed)} flex={2} />
            <DetailLabelValue
              label="SEVERITY"
              value={report.severity ?? ""}
              valueColor={bannerColors.text}
            />
          </View>

          <View className="my-3 h-px bg-[#f1f5f9]" />

          {/* CANAL CONDITION */}
          <SectionHeader icon="waves" title="CANAL CONDITION" />
          <View className="flex-row">
            <DetailLabelValue label="WATER LEVEL" value={optionLabel(WATER_LEVEL_OPTIONS, report.water_level)} />
            <DetailLabelValue
              label="OBSTRUCTION"
              value={optionLabel(OBSTRUCTION_COVERAGE_OPTIONS, report.obstruction_coverage)}
            />
          </View>
          <DetailLabelValue label="WATER FLOW" value={optionLabel(WATER_FLOW_OPTIONS, report.water_flow_condition)} />

          <View className="my-3 h-px bg-[#f1f5f9]" />

          {/* WASTE COMPOSITION */}
          <SectionHeader icon="trash-can-outline" title="WASTE COMPOSITION" />
          <View className="mb-3">
            {wasteRows.length > 0 ? (
              wasteRows.map((row) => <WasteRow key={row.label} label={row.label} kg={row.kg} />)
            ) : (
              <Text className="text-[13px] text-[#94a3b8]">No waste breakdown recorded.</Text>
            )}
          </View>

          <View className="my-3 h-px bg-[#f1f5f9]" />

          {/* BARANGAY RESPONSE */}
          <SectionHeader icon="account-hard-hat-outline" title="BARANGAY RESPONSE" />
          <DetailLabelValue label="ASSIGNED PERSONNEL" value={report.assigned_personnel ?? ""} />
          <DetailLabelValue label="DATE / TIME RESPONDED" value={formatDateTime(report.date_responded)} />
          <DetailLabelValue label="ACTION TAKEN" value={report.action_taken ?? ""} />
          <View className="flex-row">
            <DetailLabelValue
              label="WASTE COLLECTED"
              value={report.waste_collected_amount != null ? `${report.waste_collected_amount} kg` : ""}
            />
            <DetailLabelValue
              label="FINAL CANAL CONDITION"
              value={optionLabel(FINAL_CONDITION_OPTIONS, report.final_canal_condition)}
              valueColor={
                report.final_canal_condition ? FINAL_CONDITION_COLORS[report.final_canal_condition] : "#122A48"
              }
            />
          </View>
          {report.remarks ? <DetailLabelValue label="REMARKS" value={report.remarks} /> : null}
          <DetailLabelValue label="FILED BY" value={filedBy} />

          {photoGroups.length > 0 && (
            <>
              <View className="my-3 h-px bg-[#f1f5f9]" />
              <SectionHeader icon="paperclip" title="PHOTOS" />
              <View className="mb-3 gap-2.5">
                {photoGroups.map((group) => (
                  <View key={group.label}>
                    <Text className="mb-1.5 text-[11px] font-semibold text-[#122A48]">{group.label}</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {group.items.map((m, i) => (
                        <TouchableOpacity
                          key={m.media}
                          activeOpacity={0.85}
                          onPress={() =>
                            setPreview({
                              photos: group.items.map((x) => ({ uri: x.file_url ?? "" })),
                              index: i,
                            })
                          }
                        >
                          <Image
                            source={{ uri: m.file_url ?? undefined }}
                            className="h-20 w-20 rounded-[10px]"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          <View className="mt-4">
            <TouchableOpacity
              onPress={handleExport}
              disabled={isExporting}
              className="flex-row items-center justify-center gap-1.5 rounded-[10px] bg-[#16a34a] py-3"
              style={isExporting ? { opacity: 0.6 } : undefined}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialCommunityIcons name="tray-arrow-up" size={18} color="white" />
              )}
              <Text className="text-[13px] font-semibold text-white">
                {isExporting ? "Exporting..." : "Export to PDF"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PhotoPreviewModal
        visible={preview !== null}
        photos={preview?.photos ?? []}
        initialIndex={preview?.index ?? 0}
        onClose={() => setPreview(null)}
      />
    </SafeAreaView>
  );
}