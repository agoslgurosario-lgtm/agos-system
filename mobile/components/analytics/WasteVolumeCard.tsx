import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { weightParts, WeightUnit } from "../../lib/formatWeight";

interface Props {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  unit: WeightUnit;
}

export default function WasteVolumeCard({ title, value, subtitle, icon, unit }: Props) {
  const weight = weightParts(value, unit);
  const renderIcon = () => {
    switch (icon) {
      case "leaf":
        return <Ionicons name="leaf-outline" size={18} color="#4CAF50" />;

      case "recycle":
        return <MaterialCommunityIcons name="recycle" size={18} color="#3B82F6" />;

      case "trash":
        return <Ionicons name="trash-outline" size={18} color="#6B7280" />;

      default:
        return <Ionicons name="cube-outline" size={18} color="#D97706" />;
    }
  };

  return (
    <View
      className="bg-white rounded-2xl p-4 flex-1"
      style={{
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        elevation: 4,
      }}
    >
      <View className="flex-row items-center">
        {renderIcon()}

        <Text className="ml-2 text-[12px] text-slate-700">{title}</Text>
      </View>

      <Text className="text-2xl font-bold text-slate-800 mt-2">
        ~ {weight.value} {weight.unit === "kg" ? "Kg" : "g"}
      </Text>

      <Text className="text-[11px] text-slate-400 mt-1">{subtitle}</Text>
    </View>
  );
}
