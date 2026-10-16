import React, { useState } from "react";
import { View, Image, Text, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Map, ZoomIn } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function MapAccess({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const mapImage = require("../../../assets/images/userManual/map/localized-canal-map.png");

  return (
    <>
      <ManualSection
        number={1}
        title="HOW TO ACCESS THE MAP"
        description="Provides access to the system map for viewing canal locations and detected obstructions."
        icon={<Map size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="mt-5 px-5">
          {/* ============================= */}
          {/* INTRODUCTION CARD */}
          {/* ============================= */}
          <View className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <Text className="text-lg">🗺️</Text>
              </View>

              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">
                  Localized Canal Map
                </Text>

                <Text className="mt-1 text-xs leading-5 text-slate-600">
                  Use the map to view canal locations and identify monitored
                  areas within the municipality.
                </Text>
              </View>
            </View>
          </View>

          {/* ============================= */}
          {/* STEPS */}
          {/* ============================= */}
          <View className="mb-5">
            <Text className="mb-3 text-sm font-bold text-slate-800">
              Follow these steps
            </Text>

            <ManualStep number={1}>
              <Text>
                Open the AGOS application on your mobile device and log in using
                your registered account.
              </Text>
            </ManualStep>

            <ManualStep number={2}>
              <Text>
                From the bottom navigation menu, tap the Map icon to open the
                mapping module.
              </Text>
            </ManualStep>

            <ManualStep number={3}>
              <Text>
                The Localized Canal Map will be displayed, showing the monitored
                canal areas and their corresponding locations.
              </Text>
            </ManualStep>
          </View>

          {/* ============================= */}
          {/* MAP PREVIEW HEADER */}
          {/* ============================= */}
          <View className="mb-2 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-bold text-slate-800">
                Map Preview
              </Text>

              <Text className="mt-0.5 text-xs text-slate-500">
                Tap the image to view it in fullscreen
              </Text>
            </View>

            <View className="rounded-full bg-slate-100 px-3 py-1">
              <Text className="text-[10px] font-semibold text-slate-500">
                PREVIEW
              </Text>
            </View>
          </View>

          {/* =============================== */}
          {/* MAP IMAGE */}
          {/* =============================== */}
          <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* Screenshot Header */}
            <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
              <Text className="text-[11px] font-bold text-slate-700">
                Localized Canal Map
              </Text>

              <View className="flex-row items-center rounded-full bg-blue-50 px-2.5 py-1">
                <ZoomIn size={10} color="#2563EB" />
                <Text className="ml-1 text-[8px] font-bold text-blue-600">
                  TAP TO ENLARGE
                </Text>
              </View>
            </View>

            {/* Clickable Image */}
            <Pressable
              onPress={() => setIsImageVisible(true)}
              className="bg-slate-50"
            >
              <Image
                source={mapImage}
                resizeMode="contain"
                style={{
                  width: "100%",
                  height: 500,
                  backgroundColor: "#F8FAFC",
                }}
              />

              {/* Tap Overlay
              <View className="absolute bottom-3 left-0 right-0 items-center">
                <View className="flex-row items-center rounded-full bg-black/60 px-3 py-2">
                  <ZoomIn size={13} color="#FFFFFF" />
                  <Text className="ml-1.5 text-[9px] font-semibold text-white">
                    Tap image to enlarge
                  </Text>
                </View>
              </View> */}
            </Pressable>
          </View>

          {/* ============================= */}
          {/* USER TIP */}
          {/* ============================= */}
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
                  Tap the map preview to open it in fullscreen. You can pinch
                  with two fingers to zoom in or out and drag the image to
                  inspect different areas.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ManualSection>

      {/* ============================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ============================= */}
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
