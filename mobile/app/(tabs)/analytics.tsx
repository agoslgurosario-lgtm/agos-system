import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, RefreshControl, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AlertBellButton from "@/components/alerts/AlertBellButton";

import DetectionRow from "../../components/analytics/DetectionRow";
import WasteProgress from "../../components/analytics/WasteProgress";
import WasteVolumeCard from "../../components/analytics/WasteVolumeCard";
import MonthSelector from "../../components/analytics/MonthSelector";

import { useAnalytics } from "../../hooks/useAnalytics";
import { buildWasteVolumes, buildComposition, buildDetections } from "../../lib/analytics";

function currentMonthValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
}

export default function AnalyticsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue());
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);

  const { classifications, liveClassifications, nodes, loading, refreshing, error, refetch } = useAnalytics(selectedMonth);

  const wasteVolumes = useMemo(() => buildWasteVolumes(classifications), [classifications]);
  const composition = useMemo(() => buildComposition(classifications), [classifications]);
  const detections = useMemo(
    () => buildDetections(liveClassifications, nodes),
    [liveClassifications, nodes]
  );

  return (
    <SafeAreaView className="flex-1 bg-[#EEF3F8]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => refetch(true)} tintColor="#122A48" />
        }
      >
        {/* Header */}
        <View className="flex-row justify-between items-center mb-3 -mt-2">
          <View style={{ width: 22 }} />

          <Text className="text-[21px] font-bold text-[#122A48]">Waste Analytics</Text>

          <View className="flex-row items-center gap-3">
            <AlertBellButton />
          </View>
        </View>

        {/* Month label */}
        <Pressable
          onPress={() => setMonthPickerVisible(true)}
          className="self-center mb-4 px-4 py-2 rounded-full bg-white border border-slate-300"
        >
          <Text className="text-[12px] font-medium text-slate-600">
            {monthLabel(selectedMonth)}
          </Text>
        </Pressable>

        {error && (
          <View className="items-center py-10">
            <Text className="text-[#D81010] font-semibold text-sm mb-3">
              Failed to load analytics. Please try again.
            </Text>
            <Pressable onPress={() => refetch()} className="border border-slate-300 rounded-lg px-4 py-2">
              <Text className="text-slate-600 text-sm">Retry</Text>
            </Pressable>
          </View>
        )}

        {(loading || refreshing) && !error && (
          <>
            <View className="items-center justify-center p-10 flex flex-col gap-3">
              <ActivityIndicator color="#2F6FED" />
              <Text>Loading...</Text>
            </View>
          </>
        )}

        {!loading && !refreshing && !error && (
          <>
            {/* Waste Volume */}
            <View className="bg-white rounded-2xl p-4 mb-5"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text className="font-semibold text-slate-700 mb-4">Estimated waste volume</Text>

              <View className="flex-row">
                <WasteVolumeCard {...wasteVolumes[0]} />
                <View className="w-3" />
                <WasteVolumeCard {...wasteVolumes[1]} />
              </View>

              <View className="h-3" />

              <View className="flex-row">
                <WasteVolumeCard {...wasteVolumes[2]} />
                <View className="w-3" />
                <WasteVolumeCard {...wasteVolumes[3]} />
              </View>
            </View>

            {/* Detection */}
            <View className="bg-white rounded-2xl p-4 mb-5"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text className="font-semibold text-slate-700 mb-2">Solid debris detection</Text>

              {detections.length === 0 ? (
                <Text className="text-slate-400 text-[12px] py-4 text-center">
                  No sensor nodes found.
                </Text>
              ) : (
                <ScrollView
                  style={{ maxHeight: 220 }}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {detections.map((item) => (
                    <DetectionRow key={item.node_id} {...item} />
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Classification */}
            <View className="bg-white rounded-2xl p-4 mb-5"
              style={{
                elevation: 2,
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <Text className="font-semibold text-slate-700 mb-4">Classified waste type</Text>

              {composition.map((item) => (
                <WasteProgress key={item.type} {...item} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <MonthSelector
        visible={monthPickerVisible}
        onClose={() => setMonthPickerVisible(false)}
        selectedMonth={selectedMonth}
        onSelect={setSelectedMonth}
      />
    </SafeAreaView>
  );
}