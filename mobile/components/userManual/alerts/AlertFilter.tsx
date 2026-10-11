import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import {
  Filter,
  CheckCircle2,
  Droplets,
  AlertTriangle,
} from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function AlertFilter({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const alertFilterImage = require("../../../assets/images/userManual/alerts/alert-filter.png");

  return (
    <>
      <ManualSection
        number={5}
        title="FILTERING ALERTS"
        description="Use filters to focus on specific types of alerts."
        icon={<Filter size={18} color="#2C8198" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="px-5">
          {/* ================================================= */}
          {/* SCREENSHOT */}
          {/* ================================================= */}

          <View className="mt-2">
            <Pressable
              onPress={() => setIsImageVisible(true)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            >
              <View className="relative">
                <Image
                  source={alertFilterImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 330,
                    backgroundColor: "#F8FAFC",
                  }}
                />

                <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
                  <Text className="text-[10px] font-semibold text-white">
                    🔍 Tap to enlarge
                  </Text>
                </View>
              </View>

              <View className="border-t border-slate-100 px-4 py-3">
                <Text className="text-center text-xs font-semibold text-slate-700">
                  Alert Filtering Options
                </Text>

                <Text className="mt-1 text-center text-[10px] text-slate-400">
                  Tap to zoom and explore the filter options
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* INTRODUCTION */}
          {/* ================================================= */}

          <View className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white">
                <Filter size={17} color="#2C8198" />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-bold text-[#203D70]">
                  Why Use Filters?
                </Text>

                <Text className="mt-1 text-[10px] leading-5 text-slate-600">
                  Filters help you quickly find the alerts you want to review
                  instead of viewing every alert at once.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* AVAILABLE FILTERS */}
          {/* ================================================= */}

          <Text className="mt-5 mb-3 text-[13px] font-bold text-[#203D70]">
            Available Alert Filters
          </Text>

          {/* ALL */}

          <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <CheckCircle2 size={17} color="#64748B" />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-bold text-slate-700">
                  All
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Displays all available alerts without limiting the results to
                  a specific alert type.
                </Text>
              </View>
            </View>
          </View>

          {/* CLOG */}

          <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                <AlertTriangle size={17} color="#D97706" />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-bold text-slate-700">
                  Clog
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Displays alerts related to detected canal clogging events.
                </Text>
              </View>
            </View>
          </View>

          {/* WATER LEVEL */}

          <View className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Droplets size={17} color="#2563EB" />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-bold text-slate-700">
                  Water Level
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Displays alerts related to changes or conditions in the
                  monitored water level.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* HOW TO FILTER */}
          {/* ================================================= */}

          <Text className="mb-3 text-[13px] font-bold text-[#203D70]">
            How to Filter Alerts
          </Text>

          <ManualStep
            number={1}
            text="Open the Alerts screen and locate the filter options."
          />

          <ManualStep
            number={2}
            text='Select "All" to display all available alerts.'
          />

          <ManualStep
            number={3}
            text='Select "Clog" to display clog-related alerts.'
          />

          <ManualStep
            number={4}
            text='Select "Water Level" to display water-level alerts.'
          />

          <ManualStep
            number={5}
            text="Review the filtered alerts displayed on the screen."
          />

          {/* ================================================= */}
          {/* TIP */}
          {/* ================================================= */}

          <View className="mt-2">
            <ManualTip>
              Choose the filter that matches the type of event you want to
              monitor. Select {"All"} when you want to view the complete alert
              list again.
            </ManualTip>
          </View>
        </View>
      </ManualSection>

      {/* ================================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(alertFilterImage).uri,
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
