import { Text, View } from "react-native";
import { Severity } from "../../types/alert";
import { severityLabel } from "@/constants/reports";

interface Props {
  severity: Severity;
}

export default function SeverityBadge({ severity }: Props) {
  const colors = {
    Critical: {
      bg: "bg-red-100",
      text: "text-red-600",
    },

    High: {
      bg: "bg-orange-100",
      text: "text-orange-600",
    },

    Medium: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
    },

    Low: {
      bg: "bg-green-100",
      text: "text-green-700",
    },
  };

  return (
    <View className={`px-3 py-1 rounded-full ${colors[severity].bg}`}>
      <Text className={`text-xs font-semibold ${colors[severity].text}`}>
        {severityLabel(severity)}
      </Text>
    </View>
  );
}
