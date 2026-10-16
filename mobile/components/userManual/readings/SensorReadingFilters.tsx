import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Filter } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function SensorReadingFilters({ expanded, onPress }: Props) {
  const [visibleImageIndex, setVisibleImageIndex] = useState<number | null>(
    null,
  );

  const filterImages = [
    require("../../../assets/images/userManual/readings/status-filter.jpg"),
    require("../../../assets/images/userManual/readings/month-filter.jpg"),
  ];

  return (
    <>
      <ManualSection
        number={4}
        title="READING FILTERS"
        description="Learn how to filter sensor readings by status and recording month."
        icon={<Filter size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        {/* Introduction */}
        <View className="mt-5 px-5">
          <Text className="mb-4 text-sm leading-6 text-slate-600">
            The filtering options help users find sensor readings based on their
            status classification or the month in which the readings were
            recorded.
          </Text>

          {/* Status Filter Screenshot */}
          <Text className="mb-3 text-sm font-bold text-[#203D70]">
            A. FILTER BY STATUS
          </Text>

          <Pressable
            onPress={() => setVisibleImageIndex(0)}
            className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <Image
              source={filterImages[0]}
              resizeMode="contain"
              className="h-[420px] w-full"
              style={{ backgroundColor: "#F8FAFC" }}
            />

            <View className="border-t border-slate-100 px-4 py-3">
              <Text className="text-center text-xs font-semibold text-slate-700">
                Sensor Reading Status Filters
              </Text>
              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap the image to enlarge.
              </Text>
            </View>
          </Pressable>

          {/* Status Filter Instructions */}
          <ManualStep number={1}>
            <Text>
              Locate the status filter tabs at the top of the Sensor Readings
              screen.
            </Text>
          </ManualStep>
          <ManualStep number={2}>
            <Text>
              Select All to view all readings, Normal for normal readings,
              Warning for readings that require attention, or Critical for
              critical readings.
            </Text>
          </ManualStep>

          <View className="mt-6 border-t border-slate-100 pt-5">
            <Text className="mb-3 text-sm font-bold text-[#203D70]">
              B. FILTER BY MONTH
            </Text>
          </View>

          {/* Month Filter Screenshot */}
          <Pressable
            onPress={() => setVisibleImageIndex(1)}
            className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <Image
              source={filterImages[1]}
              resizeMode="contain"
              className="h-[620px] w-full"
              style={{ backgroundColor: "#F8FAFC" }}
            />

            <View className="border-t border-slate-100 px-4 py-3">
              <Text className="text-center text-xs font-semibold text-slate-700">
                Filter by Month
              </Text>
              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap the image to enlarge.
              </Text>
            </View>
          </Pressable>

          {/* Month Filter Instructions */}
          <ManualStep number={1}>
            <Text>
              Tap the month selector below the status tabs to open the month
              selection panel.
            </Text>
          </ManualStep>
          <ManualStep number={2}>
            <Text>
              Select All Time to view readings across all available dates, or
              choose a specific month from the list.
            </Text>
          </ManualStep>

          <ManualStep number={3}>
            <Text>
              The selected month will display a check mark. The readings screen
              will update according to your selection.
            </Text>
          </ManualStep>
        </View>

        {/* Tip */}
        <View className="mx-5 mt-5">
          <ManualTip>
            You can narrow down the readings by selecting a status and a month
            to make specific sensor records easier to find.
          </ManualTip>
        </View>
      </ManualSection>

      {/* Full-Screen Screenshot Viewer */}
      <ImageViewing
        images={filterImages.map((image) => Image.resolveAssetSource(image))}
        imageIndex={visibleImageIndex ?? 0}
        visible={visibleImageIndex !== null}
        onRequestClose={() => setVisibleImageIndex(null)}
        presentationStyle="fullScreen"
        backgroundColor="#0F172A"
      />
    </>
  );
}
