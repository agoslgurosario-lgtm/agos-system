import React from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  loading: boolean;
  wasteKg: number;
  photoCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function CompletePostModal({ visible, loading, wasteKg, photoCount, onClose, onConfirm }: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => !loading && onClose()}>
      <Pressable className="flex-1 items-center justify-center bg-black/40 px-6" onPress={() => !loading && onClose()}>
        <Pressable className="w-full rounded-2xl bg-white p-5" onPress={(e) => e.stopPropagation()}>
          <View className="mb-3 h-12 w-12 items-center justify-center self-center rounded-full bg-[#E7F7EE]">
            <MaterialCommunityIcons name="clipboard-check-outline" size={26} color="#16a34a" />
          </View>
          <Text className="mb-1 text-center text-base font-bold text-[#122A48]">Complete post-report?</Text>
          <Text className="mb-3 text-center text-[12px] leading-5 text-[#64748B]">
            Your waste details and photos will be saved, and the canal condition will be taken from the node&apos;s
            sensors. You can still review the compiled report afterwards.
          </Text>

          <View className="mb-4 rounded-xl bg-[#F1F5F9] px-3 py-2.5">
            <Text className="text-[12px] text-[#334155]">Waste collected: <Text className="font-bold">{wasteKg.toFixed(2)} kg</Text></Text>
            <Text className="text-[12px] text-[#334155]">Photos attached: <Text className="font-bold">{photoCount}</Text></Text>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onClose} disabled={loading} className="flex-1 items-center rounded-xl border border-[#E2E8F0] py-3">
              <Text className="text-sm font-semibold text-[#475569]">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} disabled={loading} className="flex-1 items-center rounded-xl bg-[#16a34a] py-3" style={loading ? { opacity: 0.7 } : undefined}>
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-sm font-bold text-white">Complete</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}