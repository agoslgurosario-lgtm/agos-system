import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import {
  Info,
  PieChart,
  BarChart3,
  SearchCheck,
  ClipboardCheck,
  Trash2,
  ZoomIn,
} from "lucide-react-native";
import ImageViewing from "react-native-image-viewing";

import ManualSection from "../common/ManualSection";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function WasteComposition({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const wasteCompositionImage = require("../../../assets/images/userManual/map/waste-composition.png");

  return (
    <>
      <ManualSection
        number={9}
        title="WASTE COMPOSITION"
        description="Displays the distribution of waste types recorded within your barangay."
        icon={<Trash2 size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="mt-5 px-5">
          {/* =============================== */}
          {/* EXISTING CARD */}
          {/* =============================== */}
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="mb-3 text-[13px] font-bold text-[#172B4D]">
              Waste Composition
            </Text>

            {/* =============================== */}
            {/* IMAGE PREVIEW */}
            {/* =============================== */}

            {/* =============================== */}
            {/* MAP IMAGE */}
            {/* =============================== */}
            <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
                <Text className="text-[11px] font-bold text-slate-700">
                  Waste Composition Example
                </Text>

                <View className="flex-row items-center rounded-full bg-blue-50 px-2.5 py-1">
                  <ZoomIn size={10} color="#2563EB" />
                  <Text className="ml-1 text-[8px] font-bold text-blue-600">
                    TAP TO ENLARGE
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => setIsImageVisible(true)}
                className="bg-slate-50"
              >
                <Image
                  source={wasteCompositionImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 500,
                    backgroundColor: "#F8FAFC",
                  }}
                />
              </Pressable>
            </View>

            {/* =============================== */}
            {/* IMAGE CAPTION */}
            {/* =============================== */}

            <View className="mt-2">
              <Text className="text-center text-[10px] text-slate-400">
                Tap the chart to view it in fullscreen
              </Text>
            </View>
          </View>

          {/* =============================== */}
          {/* WHAT THIS SHOWS */}
          {/* =============================== */}
          <View className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <View className="mb-2 flex-row items-center">
              <Info size={16} color="#172B4D" strokeWidth={2} />

              <Text className="ml-2 text-[12px] font-bold text-[#172B4D]">
                WHAT THIS SHOWS
              </Text>
            </View>

            <Text className="text-[11px] leading-5 text-slate-500">
              The waste composition chart summarizes the types of waste recorded
              within your barangay. It helps personnel identify which waste
              categories make up a larger portion of the recorded waste.
            </Text>
          </View>

          {/* =============================== */}
          {/* HOW TO READ THE CHART */}
          {/* =============================== */}
          <View className="mt-7">
            <Text className="text-[12px] font-bold text-[#172B4D]">
              HOW TO READ THE CHART
            </Text>

            <Text className="mb-4 mt-1 text-[10px] text-slate-400">
              Use the chart and legend together to understand the recorded waste
              distribution.
            </Text>

            {/* Total */}
            <View className="mb-4 flex-row items-start">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <BarChart3 size={15} color="#172B4D" strokeWidth={2} />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Recorded Amount
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-400">
                  The total shown in the chart represents the amount of waste
                  recorded by the system, expressed in kilograms when
                  applicable.
                </Text>
              </View>
            </View>

            {/* Categories */}
            <View className="mb-4 flex-row items-start">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <PieChart size={15} color="#172B4D" strokeWidth={2} />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Waste Categories
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-400">
                  Each section of the chart represents a waste category and its
                  proportion of the total recorded waste.
                </Text>
              </View>
            </View>

            {/* Legend */}
            <View className="flex-row items-start">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <SearchCheck size={15} color="#172B4D" strokeWidth={2} />
              </View>

              <View className="ml-3 flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Category Comparison
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-400">
                  Use the legend to identify each category and compare which
                  types contribute more to the recorded waste.
                </Text>
              </View>
            </View>
          </View>

          {/* =============================== */}
          {/* HOW TO USE THE INFORMATION */}
          {/* =============================== */}
          <View className="mt-7 px-1">
            <Text className="text-[12px] font-bold text-[#172B4D]">
              HOW TO USE THE INFORMATION
            </Text>

            <Text className="mb-4 mt-1 text-[10px] text-slate-400">
              Use the composition data to support monitoring and response
              activities within your barangay.
            </Text>

            {/* Step 1 */}
            <View className="mb-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
                <Text className="text-[9px] font-bold text-white">1</Text>
              </View>

              <Text className="flex-1 text-[10px] leading-4 text-slate-600">
                Check which waste categories make up the largest portion of the
                recorded waste.
              </Text>
            </View>

            {/* Step 2 */}
            <View className="mb-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
                <Text className="text-[9px] font-bold text-white">2</Text>
              </View>

              <Text className="flex-1 text-[10px] leading-4 text-slate-600">
                Review the affected monitoring locations when a particular type
                of waste appears frequently or in significant amounts.
              </Text>
            </View>

            {/* Step 3 */}
            <View className="flex-row items-start">
              <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
                <Text className="text-[9px] font-bold text-white">3</Text>
              </View>

              <Text className="flex-1 text-[10px] leading-4 text-slate-600">
                Use the information together with obstruction and monitoring
                data when determining areas that may require attention.
              </Text>
            </View>
          </View>

          {/* =============================== */}
          {/* BARANGAY MONITORING CONTEXT */}
          {/* =============================== */}
          <View className="mt-6 rounded-xl border border-slate-200 bg-white p-3">
            <View className="flex-row items-start">
              <ClipboardCheck size={15} color="#64748B" strokeWidth={2} />

              <View className="ml-2 flex-1">
                <Text className="text-[10px] font-bold text-[#173A70]">
                  BARANGAY MONITORING
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Waste composition provides information about the waste
                  recorded in monitored areas of your barangay. It can help
                  personnel recognize recurring waste patterns and support
                  appropriate monitoring and response activities.
                </Text>
              </View>
            </View>
          </View>

          {/* =============================== */}
          {/* IMPORTANT NOTE */}
          {/* =============================== */}
          <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Text className="text-[10px] font-bold text-[#173A70]">
              IMPORTANT
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-500">
              The chart reflects waste recorded by the system and may not
              represent all waste present throughout the barangay. Use the data
              as a monitoring reference and verify conditions on-site when
              necessary.
            </Text>
          </View>
        </View>
      </ManualSection>

      {/* ========================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ========================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(wasteCompositionImage).uri,
          },
        ]}
        imageIndex={0}
        visible={isImageVisible}
        onRequestClose={() => setIsImageVisible(false)}
        presentationStyle="fullScreen"
        backgroundColor="#0F172A"
      />
    </>
  );
}
