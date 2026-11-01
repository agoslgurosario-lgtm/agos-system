import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  loading: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  icon?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({ visible, loading, title, message, confirmLabel, icon = "shield-check-outline", onClose, onConfirm }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => !loading && onClose()}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => !loading && onClose()}>
        <Pressable className="w-full rounded-2xl bg-white p-5" onPress={(e) => e.stopPropagation()}>
          <View className="mb-3 h-12 w-12 items-center justify-center self-center rounded-full bg-[#E7F7EE]">
            <MaterialCommunityIcons name={icon as any} size={26} color="#16a34a" />
          </View>
          <Text className="mb-1 text-center text-base font-bold text-[#122A48]">{title}</Text>
          <Text className="mb-5 text-center text-[12px] leading-5 text-[#64748B]">{message}</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onClose} disabled={loading} className="flex-1 items-center rounded-xl border border-[#E2E8F0] py-3">
              <Text className="text-sm font-semibold text-[#475569]">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} disabled={loading} className="flex-1 items-center rounded-xl bg-[#16a34a] py-3" style={loading ? { opacity: 0.7 } : undefined}>
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-sm font-bold text-white">{confirmLabel}</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}