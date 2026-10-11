import React, { useState } from "react";
import { Image, View, Text, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Waves, Filter, List, CircleAlert } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function ClogEventsAccess({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const clogEventsImage = require("../../../assets/images/userManual/clogEvents/clog-events.png");

  return (
    <>
      <ManualSection
        number={1}
        title="CLOG EVENTS"
        description="Displays the clog events detected by the system and allows users to review events according to their severity and current status."
        icon={<Waves size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        {/* ================================= */}
        {/* SCREENSHOT */}
        {/* ================================= */}

        <View className="mx-5 mt-5">
          <Pressable
            onPress={() => setIsImageVisible(true)}
            className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
          >
            <View className="relative">
              <Image
                source={clogEventsImage}
                resizeMode="contain"
                style={{
                  width: "100%",
                  height: 430,
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
                Clog Events
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap to zoom and explore the clog events
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ================================= */}
        {/* HOW TO ACCESS */}
        {/* ================================= */}

        <View className="mx-5 mt-4">
          <ManualStep
            number={1}
            text="Tap the Clog Events tab from the bottom navigation menu to open the Clog Events page."
          />

          <ManualStep
            number={2}
            text="Review the listed clog events to see their location, severity, detection time, and current response status."
          />

          <ManualStep
            number={3}
            text="Tap a clog event card to open its Event Details page and view more information."
          />
        </View>

        {/* ================================= */}
        {/* SEVERITY FILTER */}
        {/* ================================= */}

        <View className="mx-5 mt-4 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
              <Filter size={18} color="#2563EB" />
            </View>

            <View className="flex-1">
              <Text className="text-[12px] font-bold text-slate-800">
                Clog Event Filter
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Use the severity tabs to display only the clog events that match
                the selected level.
              </Text>
            </View>
          </View>

          {/* FILTER OPTIONS */}

          <View className="mt-4">
            {/* All */}
            <View className="mb-2 flex-row items-center rounded-xl bg-[#EEF3F8] p-3">
              <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-[#123878]">
                <List size={14} color="#FFFFFF" />
              </View>

              <View className="flex-1">
                <Text className="text-[10px] font-bold text-slate-700">
                  All
                </Text>

                <Text className="mt-0.5 text-[9px] text-slate-400">
                  Displays all detected clog events.
                </Text>
              </View>
            </View>

            {/* High */}
            <View className="mb-2 flex-row items-center rounded-xl bg-red-50 p-3">
              <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-red-100">
                <CircleAlert size={14} color="#DC2626" />
              </View>

              <View className="flex-1">
                <Text className="text-[10px] font-bold text-red-700">High</Text>

                <Text className="mt-0.5 text-[9px] text-slate-500">
                  Displays clog events classified with high severity.
                </Text>
              </View>
            </View>

            {/* Medium */}
            <View className="mb-2 flex-row items-center rounded-xl bg-amber-50 p-3">
              <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-amber-100">
                <CircleAlert size={14} color="#D97706" />
              </View>

              <View className="flex-1">
                <Text className="text-[10px] font-bold text-amber-700">
                  Medium
                </Text>

                <Text className="mt-0.5 text-[9px] text-slate-500">
                  Displays clog events classified with medium severity.
                </Text>
              </View>
            </View>

            {/* Low */}
            <View className="flex-row items-center rounded-xl bg-emerald-50 p-3">
              <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
                <CircleAlert size={14} color="#059669" />
              </View>

              <View className="flex-1">
                <Text className="text-[10px] font-bold text-emerald-700">
                  Low
                </Text>

                <Text className="mt-0.5 text-[9px] text-slate-500">
                  Displays clog events classified with low severity.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================================= */}
        {/* TIP */}
        {/* ================================= */}

        <View className="mx-5 mt-4">
          <ManualTip>
            Use the All, High, Medium, and Low tabs to quickly narrow down the
            clog event list based on severity. Select an event card to view its
            complete details.
          </ManualTip>
        </View>
      </ManualSection>

      {/* ================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(clogEventsImage).uri,
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
