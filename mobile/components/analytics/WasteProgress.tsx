import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface Props {
  type: string;
  percent: number;
  color: string;
  icon: string;
}

export default function WasteProgress({ type, percent, color, icon }: Props) {
  const renderIcon = () => {
    switch (icon) {
      case "leaf":
        return <Ionicons name="leaf-outline" size={16} color="#4CAF50" />;

      case "recycle":
        return <MaterialCommunityIcons name="recycle" size={16} color="#3B82F6" />;

      case "trash":
        return <Ionicons name="trash-outline" size={16} color="#6B7280" />;

      default:
        return <Ionicons name="cube-outline" size={16} color="#B45309" />;
    }
  };

  return (
    <View className="flex-row items-center mb-4">
      <View className="w-6">{renderIcon()}</View>

      <Text className="w-28 text-[12px] text-slate-700">{type}</Text>

      <View className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <View
          style={{
            width: `${percent}%`,
            backgroundColor: color,
            height: "100%",
          }}
        />
      </View>

      <Text className="ml-3 w-12 text-right text-[12px] text-slate-600">
        {percent}%
      </Text>
    </View>
  );
}
