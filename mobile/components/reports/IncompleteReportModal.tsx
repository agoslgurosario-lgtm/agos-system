import React from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface IncompleteReportModalProps {
  visible: boolean;
  missingFields: string[];
  onClose: () => void;
}

export function IncompleteReportModal({ visible, missingFields, onClose }: IncompleteReportModalProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-[#0f172a]/60 px-6" onPress={onClose}>
        <Pressable
          className="w-full rounded-3xl border border-[#f1f5f9] bg-white p-5"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="mb-3 items-center">
            <View className="mb-2.5 h-11 w-11 items-center justify-center rounded-full bg-[#fef3c7]">
              <MaterialCommunityIcons name="clipboard-alert-outline" size={22} color="#d97706" />
            </View>
            <Text className="text-base font-extrabold text-[#0f172a]">Report incomplete</Text>
            <Text className="mt-0.5 text-center text-xs text-[#64748b]">
              {missingFields.length} required {missingFields.length === 1 ? "field is" : "fields are"} still missing.
            </Text>
          </View>

          <ScrollView
            className="mb-4 rounded-xl bg-[#f8fafc]"
            style={{ maxHeight: 224 }}
            contentContainerClassName="px-3.5 py-2.5"
            showsVerticalScrollIndicator={false}
          >
            {missingFields.map((field) => (
              <View key={field} className="flex-row items-center gap-2 py-1">
                <View className="h-1.5 w-1.5 rounded-full bg-[#d97706]" />
                <Text className="text-[13px] text-[#334155]">{field}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={onClose} className="items-center rounded-xl bg-[#16a34a] py-3">
            <Text className="text-[13px] font-bold text-white">Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}