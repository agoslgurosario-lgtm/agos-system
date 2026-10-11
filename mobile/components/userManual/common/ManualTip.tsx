import { Lightbulb } from "lucide-react-native";
import { ReactNode } from "react";
import { Text, View } from "react-native";

export default function ManualTip({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-2xl bg-[#EAF3F6] border border-[#D5E7EC] p-4 flex-row">
      <View className="w-9 h-9 rounded-xl bg-white items-center justify-center">
        <Lightbulb size={18} color="#2C8198" />
      </View>

      <View className="flex-1 ml-3">
        <Text className="text-[9px] font-bold text-[#2C8198]">TIP</Text>

        <Text className="text-[10px] leading-4 text-slate-600 mt-1">
          {children}
        </Text>
      </View>
    </View>
  );
}
