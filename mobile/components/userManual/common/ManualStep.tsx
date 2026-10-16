import { Text, View } from "react-native";
import type { ReactNode } from "react";

type Props = {
  number: number;
  children: ReactNode;
};

export default function ManualStep({ number, children }: Props) {
  return (
    <View className="mb-3 flex-row items-start">
      {/* Number */}
      <View className="h-7 w-7 items-center justify-center rounded-full bg-[#123878]">
        <Text className="text-[11px] font-bold text-white">{number}</Text>
      </View>

      {/* Step text */}
      <Text className="ml-3 flex-1 pt-0.5 text-[11px] leading-4 text-slate-700">
        {children}
      </Text>
    </View>
  );
}
