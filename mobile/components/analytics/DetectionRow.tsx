import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { DetectionSeverity, DetectionStatus } from "../../types/analytics";

interface Props {
  node: string;
  location: string;
  severity: DetectionSeverity;
  status: DetectionStatus;
  volume: number | null;
}

const SEVERITY_STYLE: Record<DetectionSeverity, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  High: { icon: "warning", color: "#EF4444" },
  Moderate: { icon: "alert-circle", color: "#EAB308" },
  Low: { icon: "alert-circle-outline", color: "#3B82F6" },
  None: { icon: "checkmark-circle", color: "#22C55E" },
};

function describeSeverity(severity: DetectionSeverity, volume: number | null) {
  if (severity === "None") return "No detection";
  return `${severity} volume${volume != null ? ` (${volume.toFixed(2)}kg)` : ""}`;
}

export default function DetectionRow({ node, location, severity, status, volume }: Props) {
  const { icon, color } = SEVERITY_STYLE[severity];

  return (
    <View className="flex-row items-center py-3 border-b border-slate-100">
      <Ionicons name={icon} size={16} color={color} />

      <View className="flex-1 ml-3">
        <Text className="text-[13px] font-medium text-slate-700">
          {node} – {location}
        </Text>

        <Text className="text-[11px] text-slate-500 mt-1">
          {describeSeverity(severity, volume)}
        </Text>
      </View>

      <View
        className={`px-3 py-1 rounded-full ${
          status === "Detected" ? "bg-red-100" : "bg-green-100"
        }`}
      >
        <Text
          className={`text-[10px] font-medium ${
            status === "Detected" ? "text-red-600" : "text-green-600"
          }`}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}