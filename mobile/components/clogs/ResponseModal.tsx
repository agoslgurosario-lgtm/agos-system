import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Alert, Platform,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import type { ClogEvent } from "@/types/clog-events";
import { ReopenedNotice } from "./ReopenedNotice";
import { PersonnelField, PersonnelPanel, namesFromText, namesToText } from "@/components/reports/PersonnelPicker";


interface Props {
  visible: boolean;
  event: ClogEvent;
  respondedAt: string;
  onClose: () => void;
  onSaved: (event: ClogEvent) => void;
  onContinue: (reportId: number) => void;
}

function formatDateTime(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export function ResponseModal({ visible, event, respondedAt, onClose, onSaved, onContinue }: Props) {
  const [personnel, setPersonnel] = useState("");
  const [action, setAction] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ personnel?: string; action?: string; general?: string; when?: string }>({});
  const [reportId, setReportId] = useState<number | null>(null);   // set once saved
  const [when, setWhen] = useState<Date>(new Date(respondedAt));
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [picking, setPicking] = useState(false);   // personnel panel shown inside this modal (no second Modal: unreliable on iOS)

  // fresh form every time it opens
  useEffect(() => {
    if (visible) {
      setPersonnel(""); setAction(""); setErrors({}); setReportId(null); setSaving(false);
      setWhen(new Date(respondedAt)); setPickerMode(null); setTempDate(null); setPicking(false);
    }
  }, [visible]);

  const saved = reportId !== null;
  const hasInput = personnel.trim() !== "" || action.trim() !== "";

  const requestClose = () => {
    if (saving) return;
    if (saved || !hasInput) { onClose(); return; }
    Alert.alert("Discard response?", "Nothing has been saved yet. The event stays unresponded.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: onClose },
    ]);
  };

  // date first, then time
  const handlePick = (e: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setPickerMode(null);
    if (e.type !== "set" || !selected) {
      setTempDate(null);
      return;
    }
    if (pickerMode === "date") {
      setTempDate(selected);
      setTimeout(() => setPickerMode("time"), 0);
    } else {
      const combined = new Date(tempDate ?? when);
      combined.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setWhen(combined);
      setTempDate(null);
      setErrors((p) => ({ ...p, when: undefined, general: undefined }));
      if (Platform.OS === "ios") setPickerMode(null);
    }
  };

  const submit = async () => {
    const e: typeof errors = {};
    if (!personnel.trim()) e.personnel = "List the personnel assigned to the response.";
    if (!action.trim()) e.action = "Describe the action to be taken.";
    if (when.getTime() < new Date(event.detected_at).getTime()) e.when = "The response time can't be before the clog was detected.";
    else if (when.getTime() > Date.now() + 2 * 60 * 1000) e.when = "The response time can't be in the future.";
    setErrors(e);
    if (Object.keys(e).length) return;

    setSaving(true);
    try {
      const res = await api.post(`/api/clog-events/${event.event_id}/respond/`, {
        assigned_personnel: personnel.trim(),
        action_taken: action.trim(),
        responded_at: when.toISOString(),
      });
      onSaved(res.event);
      setReportId(res.report_id);
    } catch (err: any) {
      setErrors({
        personnel: err?.assigned_personnel,
        action: err?.action_taken,
        when: err?.responded_at,
        general: err?.error ?? err?.detail ??
          (err?.assigned_personnel || err?.action_taken || err?.responded_at ? undefined : "Could not save the response. Please try again."),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={requestClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <Pressable className="flex-1 justify-end bg-black/35" onPress={requestClose}>
          <Pressable className="max-h-[92%] rounded-t-3xl bg-white px-5 pb-8 pt-3" onPress={(e) => e.stopPropagation()}>
            <View className="mb-4 h-1 w-10 self-center rounded-full bg-[#E2E8F0]" />

            {saved ? (
              <View className="items-center py-2">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-full bg-[#E7F7EE]">
                  <MaterialCommunityIcons name="check" size={30} color="#1F9D55" />
                </View>
                <Text className="mb-1 text-base font-bold text-[#122A48]">Response recorded</Text>
                <Text className="mb-5 text-center text-[12px] leading-5 text-[#64748B]">
                  The clog event is now marked as responded. Continue to the report now, or come back to it later from the event or the Reports tab.
                </Text>
                <TouchableOpacity onPress={() => onContinue(reportId!)} className="mb-2 w-full items-center rounded-xl bg-[#1F9D55] py-3.5">
                  <Text className="text-sm font-bold text-white">Continue to Report</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose} className="w-full items-center rounded-xl border border-[#E2E8F0] py-3.5">
                  <Text className="text-sm font-semibold text-[#475569]">Later</Text>
                </TouchableOpacity>
              </View>
            ) : picking ? (
              <ScrollView keyboardShouldPersistTaps="handled">
                <PersonnelPanel
                  names={namesFromText(personnel)}
                  onChange={(n) => { setPersonnel(namesToText(n)); setErrors((p) => ({ ...p, personnel: undefined, general: undefined })); }}
                  onDone={() => setPicking(false)}
                />
              </ScrollView>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text className="mb-1 text-base font-bold text-[#122A48]">Response Details</Text>
                <Text className="mb-4 text-[11px] leading-4 text-[#94A3B8]">
                  Nothing is saved until you submit. Responding also marks this clog event as cleared.
                </Text>
                {event.reopened_at ? (
                  <View className="mb-3 -mt-1">
                    <ReopenedNotice status="Detected" />
                  </View>
                ) : null}

                <Text className="mb-1 text-[11px] font-bold text-[#64748B]">DATE & TIME RESPONDED *</Text>
                <TouchableOpacity
                  onPress={() => setPickerMode("date")}
                  disabled={saving}
                  className={`flex-row items-center gap-2 rounded-xl border bg-[#F8FAFC] px-3 py-2.5 ${errors.when ? "border-[#dc2626]" : "border-[#E2E8F0]"}`}
                >
                  <MaterialCommunityIcons name="calendar-clock" size={16} color="#64748B" />
                  <Text className="flex-1 text-[13px] font-semibold text-[#122A48]">{formatDateTime(when)}</Text>
                  <MaterialCommunityIcons name="pencil-outline" size={14} color="#94A3B8" />
                </TouchableOpacity>
                <Text className="mb-3 mt-1 text-[11px] text-[#94A3B8]">
                  {errors.when ? (
                    <Text className="text-[#dc2626]">{errors.when}</Text>
                  ) : event.reopened_at && event.previous_responded_at ? (
                    "Starts at your original response time. Change it if that was wrong."
                  ) : (
                    "Change this if you responded earlier than now."
                  )}
                </Text>
                {pickerMode && (
                  <DateTimePicker
                    value={tempDate ?? when}
                    mode={pickerMode}
                    is24Hour={false}
                    minimumDate={new Date(event.detected_at)}
                    maximumDate={new Date()}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handlePick}
                  />
                )}

                <View className="mb-3">
                  <PersonnelField
                    names={namesFromText(personnel)}
                    onRemove={(n) => setPersonnel(namesToText(namesFromText(personnel).filter((x) => x !== n)))}
                    onOpen={() => setPicking(true)}
                    error={errors.personnel}
                  />
                </View>

                <Text className="mb-1 text-[11px] font-bold text-[#64748B]">ACTION TAKEN *</Text>
                <TextInput
                  value={action}
                  onChangeText={(t) => { setAction(t); setErrors((p) => ({ ...p, action: undefined, general: undefined })); }}
                  placeholder="e.g. Manual clearing of plastic waste at the canal inlet"
                  placeholderTextColor="#94A3B8"
                  maxLength={2000}
                  multiline
                  className={`rounded-xl border bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#122A48] ${errors.action ? "border-[#dc2626]" : "border-[#E2E8F0]"}`}
                  style={{ minHeight: 80, textAlignVertical: "top" }}
                />
                {errors.action ? <Text className="mb-1 mt-1 text-[11px] text-[#dc2626]">{errors.action}</Text> : <View className="mb-3" />}

                {errors.general ? <Text className="mb-2 text-center text-[12px] font-medium text-[#dc2626]">{errors.general}</Text> : null}

                <View className="mt-2 flex-row gap-3">
                  <TouchableOpacity onPress={requestClose} disabled={saving} className="flex-1 items-center rounded-xl border border-[#E2E8F0] py-3.5">
                    <Text className="text-sm font-semibold text-[#475569]">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={submit} disabled={saving} className="flex-1 items-center rounded-xl bg-[#122A48] py-3.5" style={saving ? { opacity: 0.7 } : undefined}>
                    {saving ? <ActivityIndicator color="white" /> : <Text className="text-sm font-bold text-white">Submit Response</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}