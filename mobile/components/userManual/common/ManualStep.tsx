import { Text, View } from "react-native";

type Props = {
  number: number;
  text: string;
};

export default function ManualStep({ number, text }: Props) {
  return (
    <View className="flex-row items-start mb-3">
      {/* Number */}
      <View className="w-7 h-7 rounded-full bg-[#123878] items-center justify-center">
        <Text className="text-[11px] font-bold text-white">{number}</Text>
      </View>

      {/* Step text */}
      <Text className="flex-1 ml-3 text-[11px] leading-4 text-slate-700 pt-0.5">
        {text}
      </Text>
    </View>
  );
}
