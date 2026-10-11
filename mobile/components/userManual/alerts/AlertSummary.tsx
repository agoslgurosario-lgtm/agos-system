import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";

import {
  Bell,
  AlertTriangle,
  Ban,
  CircleAlert,
  Info,
} from "lucide-react-native";

import ImageViewing from "react-native-image-viewing";

import ManualSection from "../common/ManualSection";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function AlertSummary({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const alertSummaryImage = require("../../../assets/images/userManual/alerts/alert-summary.png");

  return (
    <>
      <ManualSection
        number={2}
        title="ALERT SUMMARY CARDS"
        description="Provides a quick summary of the current alerts recorded by the system."
        icon={<Bell size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="mt-5 px-5">
          {/* ================================================= */}
          {/* INTRODUCTION */}
          {/* ================================================= */}

          <View className="mb-4">
            <Text className="text-[12px] leading-5 text-slate-600">
              The Alert Summary Cards provide an overview of the alerts
              currently recorded by the monitoring system.
            </Text>
          </View>

          {/* ================================================= */}
          {/* ACTUAL SCREENSHOT */}
          {/* ================================================= */}

          <View className="mb-5">
            <View className="mb-2">
              <Text className="text-[13px] font-bold text-slate-800">
                Alert Summary Preview
              </Text>

              <Text className="mt-0.5 text-[10px] text-slate-500">
                Tap the image to view it in fullscreen
              </Text>
            </View>

            <Pressable
              onPress={() => setIsImageVisible(true)}
              className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
            >
              <View className="relative bg-slate-50">
                <Image
                  source={alertSummaryImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 280,
                  }}
                />

                {/* Zoom Badge */}
                <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
                  <Text className="text-[10px] font-semibold text-white">
                    🔍 Tap to enlarge
                  </Text>
                </View>
              </View>

              {/* IMAGE CAPTION */}
              <View className="border-t border-slate-100 px-4 py-3">
                <Text className="text-center text-xs font-semibold text-slate-700">
                  Alert Summary
                </Text>

                <Text className="mt-1 text-center text-[10px] text-slate-400">
                  Tap to zoom and inspect the alert summary
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* SUMMARY CARDS EXPLANATION */}
          {/* ================================================= */}

          <Text className="mb-3 text-[13px] font-bold text-slate-800">
            Summary Cards
          </Text>

          {/* ================================================= */}
          {/* TOTAL ALERTS */}
          {/* ================================================= */}

          <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Bell size={17} color="#203D70" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold text-slate-700">
                    Total Alerts
                  </Text>

                  <Text className="text-[17px] font-bold text-[#203D70]">
                    20
                  </Text>
                </View>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Shows the total number of alerts detected and recorded by the
                  system.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* CLOG EVENTS */}
          {/* ================================================= */}

          <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
                <Ban size={17} color="#EA580C" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold text-slate-700">
                    Clog Events
                  </Text>

                  <Text className="text-[17px] font-bold text-orange-600">
                    16
                  </Text>
                </View>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Shows the number of alerts associated with detected canal clog
                  events.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* UNREAD */}
          {/* ================================================= */}

          <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
                <Info size={17} color="#D97706" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold text-slate-700">
                    Unread
                  </Text>

                  <Text className="text-[17px] font-bold text-amber-600">
                    12
                  </Text>
                </View>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Indicates the number of alerts that have not yet been viewed
                  or acknowledged.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* CRITICAL */}
          {/* ================================================= */}

          <View className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-red-50">
                <CircleAlert size={17} color="#DC2626" />
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-[12px] font-bold text-slate-700">
                    Critical
                  </Text>

                  <Text className="text-[17px] font-bold text-red-600">4</Text>
                </View>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Shows the number of alerts classified as critical and
                  requiring immediate attention.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* QUICK REFERENCE */}
          {/* ================================================= */}

          <View className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white">
                <AlertTriangle size={18} color="#2563EB" />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-bold text-[#203D70]">
                  Quick Reference
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-600">
                  Use the summary cards to quickly determine the overall number
                  of alerts, the number related to clog events, unread alerts,
                  and critical alerts.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* TIP */}
          {/* ================================================= */}

          <ManualTip>
            The summary cards give a quick overview of alert activity. Select an
            individual alert from the Alert List to view its detailed
            information.
          </ManualTip>
        </View>
      </ManualSection>

      {/* ================================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(alertSummaryImage).uri,
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
