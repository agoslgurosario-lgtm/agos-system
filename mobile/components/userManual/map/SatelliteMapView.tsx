import React, { useState } from "react";
import { View, Text, Image, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Satellite, Map, ZoomIn, Lightbulb } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

const satelliteImage = require("../../../assets/images/userManual/map/satellite-map.png");

export default function SatelliteMapView({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  return (
    <>
      <ManualSection
        number={2}
        title="SATELLITE MAP VIEW"
        description="Switch to satellite imagery to view the actual surroundings of the monitored canals, including roads, vegetation, buildings, and nearby land features."
        icon={<Satellite size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="mt-5 px-5">
          {/* INTRODUCTION CARD */}
          <View className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <Satellite size={20} color="#FFFFFF" />
              </View>

              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">
                  Explore the Satellite Map
                </Text>

                <Text className="mt-1 text-xs leading-5 text-slate-600">
                  View aerial imagery of the monitored area to recognize
                  surrounding roads, buildings, vegetation, and other land
                  features near the monitoring points.
                </Text>
              </View>
            </View>
          </View>

          {/* STEPS */}
          <View className="mb-5">
            <Text className="mb-3 text-sm font-bold text-slate-800">
              Follow these steps
            </Text>

            <ManualStep number={1}>
              <Text>
                Open the AGOS application and log in using your registered
                account.
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
                Locate the Map and Sat buttons at the upper-left corner of the
                displayed map.
              </Text>
            </ManualStep>

            <ManualStep number={4}>
              <Text>
                Tap Sat to switch from the standard map to satellite imagery.
              </Text>
            </ManualStep>

            <ManualStep number={5}>
              <Text>
                Examine the aerial view to identify nearby roads, buildings,
                vegetation, and other visible land features around the
                monitoring points.
              </Text>
            </ManualStep>

            <ManualStep number={6}>
              <Text>Tap Map to return to the standard map view.</Text>
            </ManualStep>
          </View>

          {/* MAP PREVIEW HEADER */}
          <View className="mb-2 flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-bold text-slate-800">
                Satellite Map Preview
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

          {/* SATELLITE IMAGE */}
          <View className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
              <View className="flex-row items-center">
                <Map size={15} color="#203D70" />
                <Text className="ml-2 text-[11px] font-bold text-slate-700">
                  Satellite Map
                </Text>
              </View>

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
                source={satelliteImage}
                resizeMode="contain"
                style={{
                  width: "100%",
                  height: 500,
                  backgroundColor: "#F8FAFC",
                }}
              />
            </Pressable>
          </View>

          {/* USER TIP */}
          <View className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <View className="flex-row">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                <Lightbulb size={17} color="#B45309" />
              </View>

              <View className="flex-1">
                <Text className="text-xs font-bold text-amber-800">
                  USER TIP
                </Text>

                <Text className="mt-1 text-xs leading-5 text-amber-700">
                  Satellite imagery helps you recognize the surroundings of
                  monitoring points, but it may not reflect current conditions.
                  Always refer to the latest monitoring data and risk indicators
                  when assessing canal conditions.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ManualSection>

      {/* FULLSCREEN IMAGE VIEWER */}
      <ImageViewing
        images={[{ uri: Image.resolveAssetSource(satelliteImage).uri }]}
        imageIndex={0}
        visible={isImageVisible}
        onRequestClose={() => setIsImageVisible(false)}
        presentationStyle="fullScreen"
        backgroundColor="#0F172A"
      />
    </>
  );
}
