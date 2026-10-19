import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Alert, ClogAlertContext, WaterLevelAlertContext, WasteTypeRejectedContext, WasteTypeApprovedContext } from "../../types/alert";
import { ALERT_META, ALERT_STYLE, WATER_SEVERITY_STYLE, getWaterSeverity } from "../../constants/alerts";

interface Props {
  alert: Alert | null;
  visible: boolean;
  onClose: () => void;
}

function formatDetectedAt(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function ContextDetails({ alert }: { alert: Alert }) {
  const isWaterLevel = alert.alert_type === "Water_Level_Rising";
  const context = alert.alert_context as ClogAlertContext & WaterLevelAlertContext;

  const hasWaterData =
    context.water_level != null || context.water_flow_rate != null || context.water_flow;

  if (alert.alert_type === "Waste_Type_Rejected") {
    const c = alert.alert_context as WasteTypeRejectedContext;
    return (
      <View className="gap-2">
        <Text className="text-slate-500 text-[12px]">
          Waste type: <Text className="font-semibold text-slate-800">{c.waste_type ?? "—"}</Text>
        </Text>
        <Text className="text-slate-500 text-[12px]">
          Reason: <Text className="font-semibold text-slate-800">{c.reason ?? "—"}</Text>
        </Text>
        <Text className="text-slate-400 text-[11px] mt-1">
          You can add it again with a clearer name, or record it under one of the existing categories.
        </Text>
      </View>
    );
  }

  if (alert.alert_type === "Waste_Type_Approved") {
    const c = alert.alert_context as WasteTypeApprovedContext;
    return (
      <View className="gap-2">
        <Text className="text-slate-500 text-[12px]">
          Waste type: <Text className="font-semibold text-slate-800">{c.waste_type ?? "—"}</Text>
        </Text>
        {c.original_name && (
          <Text className="text-slate-500 text-[12px]">
            You entered: <Text className="font-semibold text-slate-800">{c.original_name}</Text>
          </Text>
        )}
        <Text className="text-slate-400 text-[11px] mt-1">
          It's now available when you add "Other" waste to a report.
        </Text>
      </View>
    );
  }

  if (isWaterLevel) {
    if (!hasWaterData) return null;
    const severity = getWaterSeverity(context);
    return (
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        <Text className="text-slate-500 text-[12px]">
          Severity:{" "}
          <Text className="font-semibold" style={{ color: WATER_SEVERITY_STYLE[severity].color }}>
            {severity}
          </Text>
        </Text>
        {context.water_level != null && (
          <Text className="text-slate-500 text-[12px]">
            Water Level: <Text className="font-semibold text-slate-800">{context.water_level} cm</Text>
          </Text>
        )}
        {context.water_flow_rate != null && (
          <Text className="text-slate-500 text-[12px]">
            Flow Rate:{" "}
            <Text className="font-semibold text-slate-800">
              {Number(context.water_flow_rate).toFixed(5)} m/s
            </Text>
          </Text>
        )}
        {context.water_flow && (
          <Text className="text-slate-500 text-[12px]">
            Flow: <Text className="font-semibold text-slate-800">{context.water_flow}</Text>
          </Text>
        )}
      </View>
    );
  }

  // Clog alert types
  return (
    <View className="gap-2">
      {hasWaterData && (
        <View className="flex-row flex-wrap gap-x-4 gap-y-1">
          {context.water_level != null && (
            <Text className="text-slate-500 text-[12px]">
              Water Level: <Text className="font-semibold text-slate-800">{context.water_level} cm</Text>
            </Text>
          )}
          {context.water_flow_rate != null && (
            <Text className="text-slate-500 text-[12px]">
              Flow Rate:{" "}
              <Text className="font-semibold text-slate-800">
                {Number(context.water_flow_rate).toFixed(5)} m/s
              </Text>
            </Text>
          )}
          {context.clog_pct != null && (
            <Text className="text-slate-500 text-[12px]">
              Clog: <Text className="font-semibold text-[#D81010]">{context.clog_pct}%</Text>
            </Text>
          )}
        </View>
      )}

      {context.dominant_waste_type && (
        <>
          <View className="flex-row flex-wrap gap-x-4 gap-y-1">
            <Text className="text-slate-500 text-[12px]">
              Dominant: <Text className="font-semibold text-slate-800">{context.dominant_waste_type}</Text>
            </Text>
            {context.estimated_volume != null && (
              <Text className="text-slate-500 text-[12px]">
                Est. Volume:{" "}
                <Text className="font-semibold text-slate-800">
                  {Number(context.estimated_volume).toFixed(2)} kg
                </Text>
              </Text>
            )}
            {context.confidence != null && (
              <Text className="text-slate-500 text-[12px]">
                Confidence:{" "}
                <Text className="font-semibold text-slate-800">{Math.round(context.confidence)}%</Text>
              </Text>
            )}
          </View>

          <View className="flex-row flex-wrap gap-x-3">
            {context.recyclable_pct != null && (
              <Text className="text-slate-500 text-[11px]">Recyclable: {context.recyclable_pct}%</Text>
            )}
            {context.biodegradable_pct != null && (
              <Text className="text-slate-500 text-[11px]">Biodegradable: {context.biodegradable_pct}%</Text>
            )}
            {context.residual_pct != null && (
              <Text className="text-slate-500 text-[11px]">Residual: {context.residual_pct}%</Text>
            )}
            {context.special_waste_pct != null && (
              <Text className="text-slate-500 text-[11px]">Special: {context.special_waste_pct}%</Text>
            )}
          </View>
        </>
      )}
    </View>
  );
}

export default function AlertModal({ alert, visible, onClose }: Props) {
  if (!alert) return null;

  const meta = ALERT_META[alert.alert_type];
  const style = ALERT_STYLE[alert.alert_type];

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 bg-black/35 justify-center items-center px-5">
        <View
          className="bg-white rounded-2xl w-full p-5"
          style={{
            elevation: 10,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 10,
            shadowOffset: {
              width: 0,
              height: 5,
            },
          }}
        >
          {/* HEADER */}

          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center flex-1 mr-2">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${style.badgeBg}`}>
                <Ionicons name={meta.icon} size={20} color={style.indicator} />
              </View>

              <Text className="ml-3 text-[15px] font-bold text-slate-800 flex-1" numberOfLines={2}>
                {meta.label}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              className="border border-slate-300 rounded-md p-1"
            >
              <Ionicons name="close" size={18} color="#64748B" />
            </Pressable>
          </View>

          <View className="border-b border-slate-200 my-5" />

          {/* INFORMATION */}

          <View className="gap-3">
            {alert.alert_type !== "Waste_Type_Rejected" && alert.alert_type !== "Waste_Type_Approved" && (
              <View className="flex-row justify-between">
                <Text className="text-slate-500">Node</Text>
                <Text className="font-semibold">{alert.node_name ?? "—"}</Text>
              </View>
            )}

            <View className="flex-row justify-between">
              <Text className="text-slate-500">Barangay</Text>
              <Text className="font-semibold">{alert.barangay_name ?? "—"}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-slate-500">
                {alert.alert_type === "Waste_Type_Rejected" || alert.alert_type === "Waste_Type_Approved" ? "Reviewed" : "Detected"}
              </Text>
              <Text className="font-semibold">{formatDetectedAt(alert.timestamp)}</Text>
            </View>
          </View>

          <View className="border-b border-slate-200 my-5" />

          {/* DETAILS */}

          <Text className="text-xs font-bold text-slate-400 mb-3">DETAILS</Text>

          <ContextDetails alert={alert} />
        </View>
      </View>
    </Modal>
  );
}