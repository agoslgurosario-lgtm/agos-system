import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { BarChart3 } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function WasteAnalytics({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const wasteAnalyticsImage = require("../../../assets/images/userManual/analytics/waste-analytics.png");

  return (
    <>
      <ManualSection
        number={1}
        title="WASTE ANALYTICS"
        description="Displays the waste monitoring data recorded by the system for the selected month."
        icon={<BarChart3 size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="px-5">
          {/* ================================================= */}
          {/* MAIN SCREENSHOT */}
          {/* ================================================= */}

          <View className="mt-2">
            <Pressable
              onPress={() => setIsImageVisible(true)}
              className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
            >
              <View className="relative">
                <Image
                  source={wasteAnalyticsImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 420,
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
                  Waste Analytics Screen
                </Text>

                <Text className="mt-1 text-center text-[10px] text-slate-400">
                  Tap to zoom and explore the analytics
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* WHAT THIS SCREEN SHOWS */}
          {/* ================================================= */}

          <View className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white">
                <BarChart3 size={18} color="#2563EB" />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-bold text-[#203D70]">
                  What is Waste Analytics?
                </Text>

                <Text className="mt-1 text-[10px] leading-5 text-slate-600">
                  Waste Analytics provides an overview of recorded waste data
                  and allows the barangay user to review the waste information
                  for a selected month.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* STEPS */}
          {/* ================================================= */}

          <Text className="mt-5 mb-3 text-[13px] font-bold text-[#203D70]">
            How to View Waste Analytics
          </Text>

          <ManualStep
            number={1}
            text="Tap the Analytics tab from the bottom navigation menu to open the Waste Analytics page."
          />

          <ManualStep
            number={2}
            text="Review the Estimated Waste Volume, Solid Debris Detection, and Classified Waste Type sections."
          />

          <ManualStep
            number={3}
            text="Use the calendar icon to select a specific month and view the corresponding waste monitoring data."
          />

          {/* ================================================= */}
          {/* CALENDAR EXAMPLE */}
          {/* ================================================= */}

          <View className="mt-2">
            <Pressable
              onPress={() => setIsImageVisible(true)}
              className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
            >
              <View className="relative">
                <Image
                  source={wasteAnalyticsImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 210,
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
                  Monthly Waste Data
                </Text>

                <Text className="mt-1 text-center text-[10px] text-slate-400">
                  Tap to zoom and view the calendar area
                </Text>
              </View>
            </Pressable>
          </View>

          <View className="mt-4">
            <ManualTip>
              Use the calendar when you need to review waste monitoring data
              from a particular month.
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
            uri: Image.resolveAssetSource(wasteAnalyticsImage).uri,
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
