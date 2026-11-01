import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View, RefreshControl, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AlertBellButton from "@/components/alerts/AlertBellButton";

import DetectionRow from "../../components/analytics/DetectionRow";
import WasteProgress from "../../components/analytics/WasteProgress";
import WasteVolumeCard from "../../components/analytics/WasteVolumeCard";
import DateRangeFilter from "../../components/common/DateRangeFilter";
import { currentMonthRange } from "../../lib/dateRange";

import { useAnalytics } from "../../hooks/useAnalytics";
import { buildWasteVolumes, buildComposition, buildDetections } from "../../lib/analytics";
import { pickWeightUnit } from "../../lib/formatWeight";

export default function AnalyticsScreen() {
  const [range, setRange] = useState(currentMonthRange());

  const { classifications, liveClassifications, nodes, loading, refreshing, error, refetch } = useAnalytics(range.from, range.to);
  
  const wasteVolumes = useMemo(() => buildWasteVolumes(classifications), [classifications]);
  const volumeUnit = pickWeightUnit(wasteVolumes.map((v) => v.value));
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

        {/* Date range */}
        <View className="items-center mb-4">
          <DateRangeFilter from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
        </View>

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
                <WasteVolumeCard {...wasteVolumes[0]} unit={volumeUnit} />
                <View className="w-3" />
                <WasteVolumeCard {...wasteVolumes[1]} unit={volumeUnit} />
              </View>

              <View className="h-3" />

              <View className="flex-row">
                <WasteVolumeCard {...wasteVolumes[2]} unit={volumeUnit} />
                <View className="w-3" />
                <WasteVolumeCard {...wasteVolumes[3]} unit={volumeUnit} />
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

    </SafeAreaView>
  );
}