import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Modal, Pressable,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  loading: boolean;
  fromClogEvent: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

export function VoidReportModal({ visible, loading, fromClogEvent, onClose, onConfirm }: Props) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);

  const valid = reason.trim().length >= 5;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => !loading && onClose()}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => !loading && onClose()}>
          <Pressable className="w-full rounded-2xl bg-white p-5" onPress={(e) => e.stopPropagation()}>
            <View className="mb-3 h-12 w-12 items-center justify-center self-center rounded-full bg-[#FEE2E2]">
              <MaterialCommunityIcons name="file-cancel-outline" size={24} color="#dc2626" />
            </View>
            <Text className="mb-1 text-center text-base font-bold text-[#122A48]">Void this report?</Text>
            <Text className="mb-4 text-center text-[12px] leading-5 text-[#64748B]">
              {fromClogEvent
                ? "The report will be removed from your list and won't be sent to MENRO. The clog event comes back as Detected so you can respond and report on it again."
                : "The report will be removed from your list and won't be sent to MENRO. This can't be undone."}
            </Text>

            <Text className="mb-1 text-[11px] font-bold text-[#64748B]">REASON *</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Wrong personnel listed"
              placeholderTextColor="#94A3B8"
              maxLength={500}
              multiline
              editable={!loading}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#122A48]"
              style={{ minHeight: 64, textAlignVertical: "top" }}
            />
            <Text className="mb-4 mt-1 text-[11px] text-[#94A3B8]">At least 5 characters.</Text>

            <View className="flex-row gap-3">
              <TouchableOpacity onPress={onClose} disabled={loading} className="flex-1 items-center rounded-xl border border-[#E2E8F0] py-3">
                <Text className="text-sm font-semibold text-[#475569]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onConfirm(reason.trim())}
                disabled={!valid || loading}
                className="flex-1 items-center rounded-xl bg-[#dc2626] py-3"
                style={!valid || loading ? { opacity: 0.5 } : undefined}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-sm font-bold text-white">Void report</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}