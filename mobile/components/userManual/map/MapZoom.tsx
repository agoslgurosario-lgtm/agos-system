import React, { useState } from "react";
import { Text, View, Image, Pressable } from "react-native";
import { Plus, Minus, ZoomIn, Move3D } from "lucide-react-native";
import ImageViewing from "react-native-image-viewing";

import ManualSection from "../common/ManualSection";

type Props = {
  expanded: boolean;
  onPress: () => void;
};
export default function MapZoom({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const mapImage = require("../../../assets/images/userManual/map/zoom.jpg");

  return (
    <>
      <ManualSection
        number={3}
        title="ZOOMING THE MAP"
        description="Adjust the map view to examine monitoring points, canal locations, and surrounding areas in greater detail."
        icon={<ZoomIn size={18} color="#203D70" />}
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
                <ZoomIn size={20} color="#FFFFFF" />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">
                  Adjust the Map View
                </Text>

                <Text className="mt-1 text-xs leading-5 text-slate-600">
                  Zoom in to examine specific areas or zoom out to see a wider
                  portion of the municipality.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================= */}
          {/* ZOOM CONTROLS */}
          {/* ================================= */}
          <View className="mb-5">
            <Text className="mb-1 text-sm font-bold text-slate-800">
              Map Zoom Controls
            </Text>

            <Text className="mb-3 text-xs text-slate-500">
              Use the + and − buttons available on the map.
            </Text>

            {/* Controls Card */}
            <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* ZOOM IN */}
              <View className="flex-row items-center border-b border-slate-100 px-4 py-4">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                  <Plus size={20} color="#2563EB" />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-800">
                    Zoom In
                  </Text>

                  <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                    Tap the + button to enlarge the map and view specific
                    locations or monitoring points in greater detail.
                  </Text>
                </View>

                <View className="rounded-full bg-blue-50 px-2.5 py-1">
                  <Text className="text-[9px] font-bold text-blue-600">+</Text>
                </View>
              </View>

              {/* ZOOM OUT */}
              <View className="flex-row items-center px-4 py-4">
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Minus size={20} color="#475569" />
                </View>

                <View className="flex-1">
                  <Text className="text-xs font-bold text-slate-800">
                    Zoom Out
                  </Text>

                  <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                    Tap the − button to reduce the map scale and view a wider
                    surrounding area.
                  </Text>
                </View>

                <View className="rounded-full bg-slate-100 px-2.5 py-1">
                  <Text className="text-[9px] font-bold text-slate-600">−</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ================================= */}
          {/* TOUCH GESTURE CARD */}
          {/* ================================= */}
          <View className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="mb-3 flex-row items-center">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <Move3D size={18} color="#475569" />
              </View>

              <View>
                <Text className="text-sm font-bold text-slate-800">
                  Touch Gesture
                </Text>

                <Text className="mt-0.5 text-[10px] text-slate-400">
                  Available when viewing the map image
                </Text>
              </View>
            </View>

            <View className="rounded-xl bg-slate-50 p-3">
              <Text className="text-xs font-semibold text-slate-700">
                Pinch to Zoom
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Place two fingers on the map image and move them apart to zoom
                in or move them together to zoom out.
              </Text>
            </View>

            <View className="mt-2 rounded-xl bg-slate-50 p-3">
              <Text className="text-xs font-semibold text-slate-700">
                Drag to Explore
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                When zoomed in, drag the image to move around and inspect
                different parts of the map.
              </Text>
            </View>
          </View>

          {/* ================================= */}
          {/* MAP PREVIEW */}
          {/* ================================= */}
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
                EXAMPLE
              </Text>
            </View>
          </View>

          {/* ================================= */}
          {/* MAP IMAGE */}
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

              {/* Zoom Badge */}
              <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
                <Text className="text-[10px] font-semibold text-white">
                  🔍 Tap to enlarge
                </Text>
              </View>
            </View>

            {/* Caption */}
            <View className="border-t border-slate-100 px-4 py-3">
              <Text className="text-center text-xs font-semibold text-slate-700">
                Localized Canal Map
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Zoom in to inspect specific canal monitoring areas
              </Text>
            </View>
          </Pressable>

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
                  Use zoom controls when you need to identify a specific
                  monitoring point. When viewing the map image in fullscreen,
                  pinch to zoom and drag to explore different areas.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ManualSection>

      {/* ========================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
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
