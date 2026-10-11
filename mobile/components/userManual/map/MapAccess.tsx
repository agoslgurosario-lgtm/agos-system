import React, { useState } from "react";
import { View, Image, Text, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Map } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function MapAccess({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const mapImage = require("../../../assets/images/userManual/map/localized-canal-map.jpg");

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

            <ManualStep
              number={1}
              text="Open the AGOS application on your mobile device and log in using your registered account."
            />

            <ManualStep
              number={2}
              text="From the bottom navigation menu, tap the Map icon to open the mapping module."
            />

            <ManualStep
              number={3}
              text="The Localized Canal Map will be displayed, showing the monitored canal areas and their corresponding locations."
            />
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

          {/* ============================= */}
          {/* MAP IMAGE */}
          {/* ============================= */}
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
                Localized Canal Map
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap to zoom and explore the map
              </Text>
            </View>
          </Pressable>

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
