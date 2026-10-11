import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Clock3 } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function ClogEventTimeline({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const eventTimelineImage = require("../../../assets/images/userManual/clogEvents/event-timeline.png");

  return (
    <ManualSection
      number={4}
      title="EVENT TIMELINE"
      description="Track the progress of a clog event from detection to response and resolution."
      icon={<Clock3 size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* SCREENSHOT */}
      <View className="mx-5 mt-4">
        <Pressable
          onPress={() => setIsImageVisible(true)}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={eventTimelineImage}
              resizeMode="contain"
              className="w-full h-[350px]"
              style={{
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
              Event Timeline
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the event progress.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* EXPLANATION */}
      <View className="mt-5 mx-5">
        <Text className="text-[14px] font-bold text-[#203D70]">
          Understanding the Timeline
        </Text>

        <Text className="mt-1 text-[11px] leading-5 text-slate-600">
          The timeline records the actions taken for a clog event and shows how
          the event progresses through each status.
        </Text>
      </View>

      {/* TIMELINE ITEMS */}
      <View className="mx-5 mt-4">
        {/* DETECTED */}
        <View className="flex-row mb-4">
          <View className="items-center mr-3">
            <View className="w-8 h-8 rounded-full bg-red-100 items-center justify-center">
              <View className="w-3 h-3 rounded-full bg-red-500" />
            </View>

            <View className="w-[2px] flex-1 bg-slate-200 mt-1" />
          </View>

          <View className="flex-1">
            <Text className="text-[12px] font-bold text-slate-800">
              Detected
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-500">
              The system detected a possible clog event at the monitoring
              location.
            </Text>
          </View>
        </View>

        {/* RESPONDED */}
        <View className="flex-row mb-4">
          <View className="items-center mr-3">
            <View className="w-8 h-8 rounded-full bg-amber-100 items-center justify-center">
              <View className="w-3 h-3 rounded-full bg-amber-500" />
            </View>

            <View className="w-[2px] flex-1 bg-slate-200 mt-1" />
          </View>

          <View className="flex-1">
            <Text className="text-[12px] font-bold text-slate-800">
              Responded
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-500">
              The responsible personnel has responded to the detected event.
            </Text>
          </View>
        </View>

        {/* CLEARED */}
        <View className="flex-row">
          <View className="mr-3">
            <View className="w-8 h-8 rounded-full bg-emerald-100 items-center justify-center">
              <View className="w-3 h-3 rounded-full bg-emerald-500" />
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-[12px] font-bold text-slate-800">
              Cleared
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-500">
              The clog event has been cleared and the event is considered
              resolved.
            </Text>
          </View>
        </View>
      </View>

      {/* TIP */}
      <View className="mx-5 mt-5">
        <ManualTip>
          Tap Proceed to File Report Form after the event has been addressed to
          continue with the report.
        </ManualTip>
      </View>

      {/* FULLSCREEN IMAGE VIEWER */}
      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(eventTimelineImage).uri,
          },
        ]}
        imageIndex={0}
        visible={isImageVisible}
        onRequestClose={() => setIsImageVisible(false)}
        presentationStyle="fullScreen"
        backgroundColor="#0F172A"
      />
    </ManualSection>
  );
}
