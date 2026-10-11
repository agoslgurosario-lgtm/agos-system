import { Text, View } from "react-native";

type Props = {
  color: string;
  title: string;
  description: string;
};

export default function ManualLegend({ color, title, description }: Props) {
  return (
    <View className="flex-row items-center mb-4">
      <View
        className="w-4 h-4 rounded-full mr-3"
        style={{ backgroundColor: color }}
      />

      <View className="flex-1">
        <Text className="text-[11px] font-bold text-slate-700">{title}</Text>

        <Text className="text-[9px] text-slate-400 mt-0.5">{description}</Text>
      </View>
    </View>
  );
}
