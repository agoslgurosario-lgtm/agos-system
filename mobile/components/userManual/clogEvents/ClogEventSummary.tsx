import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { BarChart3 } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function ClogEventSummary({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const eventSummaryImage = require("../../../assets/images/userManual/clogEvents/event-summary.png");

  return (
    <>
      <ManualSection
        number={2}
        title="EVENT SUMMARY"
        description="Review the summary cards to see the total number of events, detected, responded, and resolved clog events."
        icon={<BarChart3 size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        {/* ================================================= */}
        {/* SCREENSHOT */}
        {/* ================================================= */}

        <View className="mx-5 mt-4">
          <Pressable
            onPress={() => setIsImageVisible(true)}
            className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
          >
            <View className="relative">
              <Image
                source={eventSummaryImage}
                resizeMode="contain"
                style={{
                  width: "100%",
                  height: 250,
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
                Event Summary
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap to zoom and view the event statistics
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ================================================= */}
        {/* EXPLANATION */}
        {/* ================================================= */}

        <View className="mt-5 mx-5">
          <Text className="text-[14px] font-bold text-[#203D70]">
            What the Summary Shows
          </Text>

          <Text className="mt-1 text-[11px] leading-5 text-slate-600">
            The summary cards provide a quick overview of the current clog
            events recorded by the system.
          </Text>
        </View>

        {/* ================================================= */}
        {/* ITEMS */}
        {/* ================================================= */}

        <View className="mx-5 mt-4">
          <ManualStep
            number={1}
            text="Total Events shows the total number of clog events recorded by the system."
          />

          <ManualStep
            number={2}
            text="Detected shows the number of clog events that have been detected."
          />

          <ManualStep
            number={3}
            text="Responded shows the number of detected events that have received a response."
          />

          <ManualStep
            number={4}
            text="Resolved shows the number of clog events that have been cleared or resolved."
          />
        </View>
      </ManualSection>

      {/* ================================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(eventSummaryImage).uri,
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
