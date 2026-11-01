import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, BackHandler } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { api } from "@/lib/api";
import { SEVERITY_COLORS, severityLabel } from "@/constants/reports";
import { ConfirmActionModal } from "@/components/reports/ConfirmActionModal";
import { fmtDay, periodLabel, STATUS_STYLE } from "@/components/reports/SubmitBanner";
import type { PeriodInfo, SubmissionPreview } from "@/types/submissions";

const fmtDateTime = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

const fmtMinutes = (m: number | null) => {
  if (m == null) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
};

function StatusBadge({ status, late }: { status: string; late?: boolean }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.Open;
  return (
    <View className="flex-row gap-1.5">
      <View className="rounded-xl px-2.5 py-1" style={{ backgroundColor: s.bg }}>
        <Text className="text-[11px] font-semibold" style={{ color: s.text }}>{status}</Text>
      </View>
      {late ? (
        <View className="rounded-xl bg-[#fef3c7] px-2.5 py-1">
          <Text className="text-[11px] font-semibold text-[#b45309]">Late</Text>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 w-1/2 pr-2">
      <Text className="mb-0.5 text-[10px] font-bold uppercase text-[#94a3b8]">{label}</Text>
      <Text className="text-[15px] font-bold text-[#122A48]">{value}</Text>
    </View>
  );
}

export default function SubmitReportsScreen() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PeriodInfo[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);      // a period's first day
  const [preview, setPreview] = useState<SubmissionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const d = await api.get("/api/canal-reports/periods/");
      setPeriods(d.periods);
    } catch {
      setError("Could not load the periods. Pull back and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const openPeriod = async (start: string) => {
    setSelected(start);
    setPreview(null);
    setLoading(true);
    setError("");
    try {
      setPreview(await api.get(`/api/canal-reports/submission-preview/?period=${start}`));
    } catch {
      setError("Could not load the preview.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (selected) openPeriod(selected); else loadPeriods();
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (selected) { setSelected(null); setPreview(null); loadPeriods(); return true; }
        return false;
      });
      return () => sub.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected])
  );

  const goBack = () => {
    if (selected) { setSelected(null); setPreview(null); loadPeriods(); }
    else router.back();
  };

  const submit = async () => {
    if (!preview) return;
    setSubmitting(true);
    try {
      await api.post("/api/canal-reports/submissions/", { period_start: preview.period_start });
      setConfirmOpen(false);
      Alert.alert("Submitted", "Your report was sent to MENRO. The included reports are now locked.");
      setSelected(null);
      setPreview(null);
      loadPeriods();
    } catch (err: any) {
      setConfirmOpen(false);
      Alert.alert("Can't submit", err?.detail ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f8fafc]" edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={goBack} className="p-1">
          <MaterialCommunityIcons name="arrow-left" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text className="-ml-7 text-base font-bold text-[#122A48]">
          {selected && preview ? periodLabel(preview) : "Submit to MENRO"}
        </Text>
        <View />
      </View>

      <ScrollView contentContainerClassName="px-4 pb-10">
        {loading ? <ActivityIndicator className="mt-10" color="#16a34a" /> : null}
        {error ? <Text className="mt-4 text-center text-xs text-[#dc2626]">{error}</Text> : null}

        {/* period list */}
        {!selected && !loading && periods ? (
          <View className="gap-3">
            <Text className="text-[12px] leading-5 text-[#64748b]">
              Reports are submitted once per half-month. Only verified reports are included. A missed deadline can still be
              submitted late until the next deadline passes.
            </Text>
            {periods.map((p) => (
              <View key={p.period_start} className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="text-[14px] font-bold text-[#122A48]">{periodLabel(p)}</Text>
                  <StatusBadge status={p.status} late={p.status === "Submitted" ? !!p.is_late : false} />
                </View>
                <Text className="text-[12px] text-[#64748b]">Due {fmtDay(p.due_date)}</Text>
                {p.status === "Submitted" ? (
                  <Text className="mt-1 text-[12px] text-[#64748b]">Submitted {fmtDateTime(p.submitted_at)}</Text>
                ) : p.status === "Missed" ? (
                  <Text className="mt-1 text-[12px] text-[#64748b]">Closed. Its verified reports go into your next submission.</Text>
                ) : (
                  <>
                    <Text className="mt-1 text-[12px] text-[#64748b]">
                      {p.verified_count} verified report{p.verified_count === 1 ? "" : "s"} ready
                      {p.status === "Overdue" ? ` · late submissions allowed until ${fmtDay(p.grace_end)}` : ""}
                    </Text>
                    <TouchableOpacity
                      onPress={() => openPeriod(p.period_start)}
                      className="mt-3 items-center rounded-xl bg-[#16a34a] py-2.5"
                    >
                      <Text className="text-[13px] font-bold text-white">Review & submit</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        ) : null}

        {/* preview of one period */}
        {selected && !loading && preview ? (
          <View className="gap-3">
            <View className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
              <View className="mb-1.5 flex-row items-center justify-between">
                <Text className="text-[14px] font-bold text-[#122A48]">{periodLabel(preview)}</Text>
                <StatusBadge status={preview.status} late={preview.would_be_late && preview.status !== "Missed"} />
              </View>
              <Text className="text-[12px] text-[#64748b]">Due {fmtDay(preview.due_date)}</Text>
              {preview.would_be_late && preview.status === "Overdue" ? (
                <Text className="mt-1 text-[12px] font-semibold text-[#c2410c]">
                  Submitting today is {preview.days_late} day{preview.days_late === 1 ? "" : "s"} late. Allowed until {fmtDay(preview.grace_end)}.
                </Text>
              ) : null}
            </View>

            {preview.blockers.map((b, i) => (
              <View key={`b${i}`} className="flex-row gap-2 rounded-xl bg-[#fee2e2] p-3">
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#b91c1c" />
                <Text className="flex-1 text-[12px] text-[#b91c1c]">{b}</Text>
              </View>
            ))}
            {preview.warnings.map((w, i) => (
              <View key={`w${i}`} className="flex-row gap-2 rounded-xl bg-[#fef3c7] p-3">
                <MaterialCommunityIcons name="information-outline" size={16} color="#b45309" />
                <Text className="flex-1 text-[12px] text-[#b45309]">{w}</Text>
              </View>
            ))}

            {/* totals */}
            <View className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
              <Text className="mb-2 text-xs font-bold tracking-wide text-[#16a34a]">SUMMARY</Text>
              <View className="flex-row flex-wrap">
                <Stat label="Reports" value={String(preview.totals.report_count)} />
                <Stat label="Waste collected" value={`${preview.totals.total_waste_kg} kg`} />
                <Stat label="Avg. response time" value={fmtMinutes(preview.totals.avg_response_minutes)} />
                <Stat
                  label="Severity"
                  value={
                    Object.entries(preview.totals.severity_counts).map(([k, v]) => `${severityLabel(k)} ${v}`).join(" · ") || "—"
                  }
                />
              </View>
              {preview.unverified_count > 0 ? (
                <Text className="mt-1 text-[11px] text-[#b45309]">
                  {preview.unverified_count} report{preview.unverified_count === 1 ? " is" : "s are"} not verified yet and won&apos;t be included.
                </Text>
              ) : null}
            </View>

            {/* the reports */}
            <View className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
              <Text className="mb-2 text-xs font-bold tracking-wide text-[#16a34a]">
                REPORTS INCLUDED ({preview.reports.length})
              </Text>
              {preview.reports.length === 0 ? (
                <Text className="text-[12px] text-[#94a3b8]">No verified reports for this period.</Text>
              ) : null}
              {preview.reports.map((r) => {
                const c = r.severity ? SEVERITY_COLORS[r.severity] : null;
                return (
                  <TouchableOpacity
                    key={r.report_id}
                    onPress={() => router.push({ pathname: "/view-report", params: { id: String(r.report_id) } } as any)}
                    className="flex-row items-center justify-between border-b border-[#f1f5f9] py-2.5"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-[13px] font-semibold text-[#122A48]">
                        {r.purok ? `Purok ${r.purok}` : "Report"}{r.node_name ? ` · ${r.node_name}` : ""}
                      </Text>
                      <Text className="text-[11px] text-[#64748b]">
                        {fmtDateTime(r.date_responded)} · {r.waste_collected_amount ?? 0} {r.waste_collected_unit}
                      </Text>
                      {r.carried_over ? <Text className="text-[11px] font-semibold text-[#6d28d9]">Carried over from an earlier period</Text> : null}
                    </View>
                    {c ? (
                      <View className="rounded-xl px-2.5 py-1" style={{ backgroundColor: c.bg }}>
                        <Text className="text-[11px] font-semibold" style={{ color: c.text }}>{severityLabel(r.severity)}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* signatories */}
            <View className="rounded-xl border border-[#e2e8f0] bg-white p-3.5">
              <Text className="mb-2 text-xs font-bold tracking-wide text-[#16a34a]">SIGNATORIES</Text>
              {Object.keys(preview.signatories).length === 0 ? (
                <Text className="text-[12px] text-[#94a3b8]">No active signatories.</Text>
              ) : (
                Object.entries(preview.signatories).map(([pos, name]) => (
                  <View key={pos} className="flex-row justify-between py-1">
                    <Text className="text-[12px] text-[#64748b]">{pos}</Text>
                    <Text className="text-[12px] font-semibold text-[#122A48]">{name}</Text>
                  </View>
                ))
              )}
            </View>

            <TouchableOpacity
              onPress={() => setConfirmOpen(true)}
              disabled={!preview.can_submit}
              className="mt-1 flex-row items-center justify-center gap-2 rounded-xl bg-[#16a34a] py-3.5"
              style={!preview.can_submit ? { opacity: 0.4 } : undefined}
            >
              <MaterialCommunityIcons name="send-check-outline" size={18} color="white" />
              <Text className="text-sm font-bold text-white">Submit to MENRO</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      <ConfirmActionModal
        visible={confirmOpen}
        loading={submitting}
        title="Submit to MENRO?"
        icon="send-check-outline"
        message={
          preview
            ? `Send ${preview.totals.report_count} verified report${preview.totals.report_count === 1 ? "" : "s"} for ${periodLabel(preview)} to MENRO.` +
              (preview.would_be_late ? ` This submission will be marked late (${preview.days_late} day${preview.days_late === 1 ? "" : "s"}).` : "") +
              " Once submitted, the reports are locked and can't be edited."
            : ""
        }
        confirmLabel="Submit"
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
      />
    </SafeAreaView>
  );
}