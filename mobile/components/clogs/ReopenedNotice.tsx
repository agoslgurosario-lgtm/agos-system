import React from "react";
import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface Props {
  status: "Detected" | "Responded" | "Cleared";
  compact?: boolean;
}

// shown on a clog event that came back because its report was voided
export function ReopenedNotice({ status, compact }: Props) {
  if (compact) {
    return (
      <View className="mt-2 flex-row items-center gap-1 self-start rounded-full bg-[#FEF3C7] px-2.5 py-1">
        <MaterialCommunityIcons name="history" size={12} color="#B45309" />
        <Text className="text-[10px] font-bold text-[#B45309]">Re-detected · earlier report voided</Text>
      </View>
    );
  }
  return (
    <View className="mt-3 flex-row gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
      <MaterialCommunityIcons name="history" size={16} color="#B45309" />
      <Text className="flex-1 text-[11px] leading-4 text-[#92400E]">
        {status === "Detected"
          ? "This is not a new clog event. It was detected again because its earlier report was voided. Respond to it again to make a new report."
          : "This clog event was reported again. Its earlier report was voided."}
      </Text>
    </View>
  );
}