import { ReactNode } from "react";
import { Text, View } from "react-native";

type Props = {
  icon: ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
};

export default function ManualInfoCard({
  icon,
  title,
  value,
  subtitle,
  accentColor = "#203D70",
}: Props) {
  return (
    <View className="rounded-3xl bg-[#F8FAFC] border border-slate-200 p-4">
      <View className="flex-row items-center">
        <View
          className="w-11 h-11 rounded-xl items-center justify-center"
          style={{
            backgroundColor: `${accentColor}15`,
          }}
        >
          {icon}
        </View>

        <View className="flex-1 ml-3">
          <Text className="text-[10px] text-slate-400">{title}</Text>

          <Text
            className="text-[24px] font-bold mt-0.5"
            style={{
              color: accentColor,
            }}
          >
            {value}
          </Text>
        </View>
      </View>

      {subtitle && (
        <Text className="text-[10px] text-slate-500 mt-3">{subtitle}</Text>
      )}
    </View>
  );
}
