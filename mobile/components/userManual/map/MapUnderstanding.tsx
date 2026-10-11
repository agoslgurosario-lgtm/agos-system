import React, { useState } from "react";
import { Text, View, Image, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { MapPinned } from "lucide-react-native";

import ManualSection from "../common/ManualSection";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function MapUnderstanding({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const mapImage = require("../../../assets/images/userManual/map/understand.jpg");

  return (
    <>
      <ManualSection
        number={2}
        title="UNDERSTANDING THE MAP"
        description="The map uses color-coded indicators to help users quickly identify monitoring points and canal conditions."
        icon={<MapPinned size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="mt-5 px-5">
          {/* ================================= */}
          {/* INTRODUCTION CARD */}
          {/* ================================= */}
          <View className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-lg">🗺️</Text>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">
                  Map Status Indicators
                </Text>

                <Text className="mt-1 text-xs leading-5 text-slate-600">
                  Each monitoring point is displayed using a specific color to
                  represent its current operating or canal condition.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================= */}
          {/* MAP LEGEND */}
          {/* ================================= */}
          <View className="mb-5">
            <View className="mb-3">
              <Text className="text-sm font-bold text-slate-800">
                Map Legend
              </Text>

              <Text className="mt-0.5 text-xs text-slate-500">
                Use these indicators to understand the status of each point.
              </Text>
            </View>

            <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* SLEEP MODE */}
              <View className="flex-row items-center border-b border-slate-100 px-4 py-3.5">
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                  <View className="h-3.5 w-3.5 rounded-full bg-slate-300" />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700">
                    Sleep Mode
                  </Text>

                  <Text className="mt-0.5 text-[10px] leading-4 text-slate-400">
                    Gray indicator — monitoring point is in sleep mode or
                    temporarily inactive.
                  </Text>
                </View>

                <View className="rounded-full bg-slate-100 px-2.5 py-1">
                  <Text className="text-[9px] font-bold text-slate-500">
                    GRAY
                  </Text>
                </View>
              </View>

              {/* NORMAL */}
              <View className="flex-row items-center border-b border-slate-100 px-4 py-3.5">
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-blue-50">
                  <View className="h-3.5 w-3.5 rounded-full bg-blue-600" />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700">
                    Normal
                  </Text>

                  <Text className="mt-0.5 text-[10px] leading-4 text-slate-400">
                    Blue indicator — canal conditions are within the normal
                    monitoring range.
                  </Text>
                </View>

                <View className="rounded-full bg-blue-50 px-2.5 py-1">
                  <Text className="text-[9px] font-bold text-blue-600">
                    NORMAL
                  </Text>
                </View>
              </View>

              {/* WARNING */}
              <View className="flex-row items-center border-b border-slate-100 px-4 py-3.5">
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-orange-50">
                  <View className="h-3.5 w-3.5 rounded-full bg-orange-400" />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700">
                    Warning
                  </Text>

                  <Text className="mt-0.5 text-[10px] leading-4 text-slate-400">
                    Orange or yellow indicator — conditions require attention
                    and continued monitoring.
                  </Text>
                </View>

                <View className="rounded-full bg-orange-50 px-2.5 py-1">
                  <Text className="text-[9px] font-bold text-orange-600">
                    WARNING
                  </Text>
                </View>
              </View>

              {/* CRITICAL */}
              <View className="flex-row items-center px-4 py-3.5">
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-red-50">
                  <View className="h-3.5 w-3.5 rounded-full bg-red-600" />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-700">
                    Critical
                  </Text>

                  <Text className="mt-0.5 text-[10px] leading-4 text-slate-400">
                    Red indicator — critical conditions detected and immediate
                    attention may be required.
                  </Text>
                </View>

                <View className="rounded-full bg-red-50 px-2.5 py-1">
                  <Text className="text-[9px] font-bold text-red-600">
                    CRITICAL
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ================================= */}
          {/* MAP PREVIEW */}
          {/* ================================= */}
          <View className="mb-2 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-bold text-slate-800">
                Map Example
              </Text>

              <Text className="mt-0.5 text-xs text-slate-500">
                Tap the image to view it in fullscreen
              </Text>
            </View>

            <View className="rounded-full bg-slate-100 px-3 py-1">
              <Text className="text-[10px] font-semibold text-slate-500">
                EXAMPLE
              </Text>
            </View>
          </View>

          {/* ================================= */}
          {/* MAP IMAGE CARD */}
          {/* ================================= */}
          <Pressable
            onPress={() => setIsImageVisible(true)}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <View className="relative">
              <Image
                source={mapImage}
                style={{
                  width: "100%",
                  height: 280,
                  backgroundColor: "#F8FAFC",
                }}
                resizeMode="contain"
              />

              <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
                <Text className="text-[10px] font-semibold text-white">
                  🔍 Tap to enlarge
                </Text>
              </View>
            </View>

            <View className="border-t border-slate-100 px-4 py-3">
              <Text className="text-center text-xs font-semibold text-slate-700">
                Localized Canal Map
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Use the map indicators to identify canal conditions
              </Text>
            </View>
          </Pressable>

          {/* ================================= */}
          {/* HOW TO READ THE MAP */}
          {/* ================================= */}
          <View className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="mb-3 flex-row items-center">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <Text className="text-sm">👀</Text>
              </View>

              <Text className="text-sm font-bold text-slate-800">
                How to Read the Map
              </Text>
            </View>

            <View>
              <View className="flex-row">
                <Text className="mr-2 text-xs font-bold text-blue-600">01</Text>

                <Text className="flex-1 text-xs leading-5 text-slate-600">
                  Locate the monitoring point on the map.
                </Text>
              </View>

              <View className="mt-2 flex-row">
                <Text className="mr-2 text-xs font-bold text-blue-600">02</Text>

                <Text className="flex-1 text-xs leading-5 text-slate-600">
                  Check the color of the indicator to determine the current
                  condition.
                </Text>
              </View>

              <View className="mt-2 flex-row">
                <Text className="mr-2 text-xs font-bold text-blue-600">03</Text>

                <Text className="flex-1 text-xs leading-5 text-slate-600">
                  Pay closer attention to warning and critical indicators that
                  may require further assessment.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================= */}
          {/* USER TIP */}
          {/* ================================= */}
          <View className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <View className="flex-row">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <Text className="text-sm">💡</Text>
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-amber-800">
                  USER TIP
                </Text>

                <Text className="mt-1 text-xs leading-5 text-amber-700">
                  Tap the map preview to open it in fullscreen. Pinch with two
                  fingers to zoom in or out, then drag the image to inspect
                  different areas of the map.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ManualSection>

      {/* ========================================= */}
      {/* FULLSCREEN MAP VIEWER */}
      {/* ========================================= */}
      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(mapImage).uri,
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
