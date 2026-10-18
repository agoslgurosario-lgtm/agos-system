import { Pressable, Text, View } from "react-native";
import { Alert, ClogAlertContext, WasteTypeRejectedContext, WasteTypeApprovedContext } from "../../types/alert";
import { ALERT_META, ALERT_STYLE } from "../../constants/alerts";

interface Props {
  alert: Alert;
  onPress: () => void;
}

function formatRelativeTime(timestamp: string) {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export default function AlertCard({ alert, onPress }: Props) {
  const meta = ALERT_META[alert.alert_type];
  const style = ALERT_STYLE[alert.alert_type];
  const context = alert.alert_context as ClogAlertContext;
  const wasteCtx = alert.alert_context as WasteTypeRejectedContext & WasteTypeApprovedContext;
  const isWasteType =
    alert.alert_type === "Waste_Type_Rejected" || alert.alert_type === "Waste_Type_Approved";
  const isApproved = alert.alert_type === "Waste_Type_Approved";

  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl p-4 mb-4 border border-slate-100"
      style={{
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View className="flex-row">
        {/* Left Indicator */}

        <View
          style={{
            width: 4,
            borderRadius: 99,
            backgroundColor: style.indicator,
          }}
        />

        <View className="flex-1 ml-3">
          {/* Header */}
          <View className="flex-row justify-between items-center">
            <View className="flex-1 mr-2">
              <Text className="font-semibold text-[14px]" numberOfLines={1}>
                {meta.label}
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5">
                {alert.barangay_name ?? "—"}
              </Text>
            </View>

            {meta.tier && (
              <View className={`px-3 py-1 !rounded-full ${style.badgeBg}`}>
                <Text className={`text-[10px] font-semibold ${style.badgeText}`}>
                  {meta.tier}
                </Text>
              </View>
            )}
          </View>

          <View className="border-b border-slate-200 my-3" />

          {/* Details */}
          {isWasteType ? (
            <View>
              <Text className="text-[9px] text-slate-400 uppercase">WASTE TYPE</Text>
              <Text className="text-[12px] font-semibold mt-1">{wasteCtx.waste_type ?? "—"}</Text>
              <Text className="text-[11px] text-slate-500 mt-1" numberOfLines={2}>
                {isApproved
                  ? wasteCtx.original_name
                    ? `Approved as “${wasteCtx.waste_type}” (you entered “${wasteCtx.original_name}”)`
                    : "Approved. You can now use it in your reports."
                  : `Reason: ${wasteCtx.reason ?? "—"}`}
              </Text>
              <Text className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(alert.timestamp)}</Text>
            </View>
          ) : (
          <View className="flex-row justify-between">
            {/* Severity */}
            <View className="items-start">
              <Text className="text-[9px] text-slate-400 uppercase">
                SEVERITY
              </Text>

              {context.clog_pct != null ? (
                <View className={`mt-1 !rounded-full px-2 py-1 ${style.badgeBg}`}>
                  <Text className={`text-[10px] font-medium ${style.badgeText}`}>
                    {context.clog_pct}%
                  </Text>
                </View>
              ) : (
                <Text className="text-[11px] text-slate-400 mt-1">—</Text>
              )}
            </View>

            {/* Waste */}

            <View className="items-center">
              <Text className="text-[9px] text-slate-400 uppercase">
                WASTE TYPE
              </Text>

              <Text className="text-[11px] mt-1">
                {context.dominant_waste_type ?? "—"}
              </Text>
            </View>

            {/* Time */}

            <View className="items-end">
              <Text className="text-[9px] text-slate-400 uppercase">
                TIME
              </Text>

              <Text className="text-[11px] mt-1">
                {formatRelativeTime(alert.timestamp)}
              </Text>
            </View>
          </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}