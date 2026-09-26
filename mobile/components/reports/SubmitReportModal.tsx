import React from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SEVERITY_COLORS } from "@/constants/reports";
import type { ReportSeverity } from "@/types/reports";

interface SubmitReportModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  summary: {
    location: string;
    canalName: string;
    severity: ReportSeverity | null;
    dateObserved: Date | null;
    responder: string;
    wasteCollectedKg: number;
    photoCount: number;
  };
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-xs text-[#64748b]">{label}</Text>
      <View className="flex-1 items-end">{children}</View>
    </View>
  );
}

export function SubmitReportModal({ visible, onClose, onConfirm, isSubmitting = false, summary }: SubmitReportModalProps) {
  const severityColors = summary.severity ? SEVERITY_COLORS[summary.severity] : null;

  const observed = summary.dateObserved
    ? summary.dateObserved.toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
      })
    : "—";

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={isSubmitting ? undefined : onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-[#0f172a]/60 px-5"
        onPress={isSubmitting ? undefined : onClose}
      >
        <Pressable
          className="w-full rounded-3xl border border-[#f1f5f9] bg-white p-5"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-4 items-center">
            <View className="mb-2.5 h-12 w-12 items-center justify-center rounded-full bg-[#dcfce7]">
              <MaterialCommunityIcons name="file-check-outline" size={26} color="#16a34a" />
            </View>
            <Text className="text-lg font-extrabold text-[#0f172a]">Confirm Submission</Text>
            <Text className="mt-0.5 text-center text-xs text-[#64748b]">
              Review the summary before submitting.
            </Text>
          </View>

          <View className="mb-3 gap-2 rounded-[14px] border border-[#e2e8f0] bg-[#f8fafc] p-3.5">
            <SummaryRow label="Canal">
              <Text className="text-xs font-bold text-[#0f172a]" numberOfLines={1}>
                {summary.canalName || "N/A"}
              </Text>
            </SummaryRow>

            <SummaryRow label="Barangay">
              <Text className="text-xs font-semibold text-[#334155]">{summary.location || "N/A"}</Text>
            </SummaryRow>

            <SummaryRow label="Severity">
              {severityColors && summary.severity ? (
                <View className="rounded-lg px-2 py-0.5" style={{ backgroundColor: severityColors.bg }}>
                  <Text className="text-[11px] font-bold" style={{ color: severityColors.text }}>
                    {summary.severity}
                  </Text>
                </View>
              ) : (
                <Text className="text-xs text-[#334155]">—</Text>
              )}
            </SummaryRow>

            <SummaryRow label="Observed">
              <Text className="text-xs font-semibold text-[#334155]">{observed}</Text>
            </SummaryRow>

            <SummaryRow label="Responder">
              <Text className="text-xs font-semibold text-[#334155]" numberOfLines={1}>
                {summary.responder || "N/A"}
              </Text>
            </SummaryRow>

            <SummaryRow label="Waste collected">
              <Text className="text-xs font-bold text-[#16a34a]">{summary.wasteCollectedKg.toFixed(2)} kg</Text>
            </SummaryRow>

            <SummaryRow label="Photos">
              <Text className="text-xs font-semibold text-[#334155]">{summary.photoCount} file(s)</Text>
            </SummaryRow>
          </View>

          <Text className="mb-4 text-center text-[11px] text-[#94a3b8]">
            Once submitted, this report goes to MENRO and can no longer be edited.
          </Text>

          <View className="flex-row gap-2.5">
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              className={`flex-1 items-center rounded-xl border border-[#cbd5e1] py-3 ${isSubmitting ? "opacity-50" : ""}`}
            >
              <Text className="text-[13px] font-semibold text-[#475569]">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={isSubmitting}
              className={`flex-1 items-center justify-center rounded-xl bg-[#16a34a] py-3 ${isSubmitting ? "opacity-70" : ""}`}
            >
              {isSubmitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-[13px] font-bold text-white">Confirm & Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}