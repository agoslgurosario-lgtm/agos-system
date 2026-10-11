import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import { CircleAlert, CheckCircle2 } from "lucide-react-native";
import ImageViewing from "react-native-image-viewing";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function AlertDetails({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const alertDetailsImage = require("../../../assets/images/userManual/alerts/alert-details.png");

  return (
    <>
      <ManualSection
        number={4}
        title="ALERT DETAILS"
        description="Displays detailed information about a selected alert or detected event."
        icon={<CircleAlert size={18} color="#F59E0B" />}
        expanded={expanded}
        onPress={onPress}
      >
        {/* ================================================= */}
        {/* SCREENSHOT */}
        {/* ================================================= */}

        <View className="mt-4 px-5">
          <View className="mb-2">
            <Text className="text-[13px] font-bold text-slate-800">
              Alert Details Preview
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
                source={alertDetailsImage}
                resizeMode="contain"
                style={{
                  width: "100%",
                  height: 390,
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
                Alert Details
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap to zoom and inspect the alert information
              </Text>
            </View>
          </Pressable>
        </View>

        {/* ================================================= */}
        {/* WHAT IS DISPLAYED */}
        {/* ================================================= */}

        <View className="mt-5 px-5">
          <View className="mb-3 flex-row items-center">
            <View className="mr-2 h-7 w-7 items-center justify-center rounded-full bg-amber-50">
              <CircleAlert size={15} color="#F59E0B" />
            </View>

            <Text className="text-[13px] font-bold text-[#172B4D]">
              Information Shown
            </Text>
          </View>

          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-[11px] leading-5 text-slate-600">
              The alert details screen provides more information about the
              selected event, including its location, detection time, water
              level, flow rate, clog percentage, waste composition, and
              confidence level.
            </Text>
          </View>
        </View>

        {/* ================================================= */}
        {/* IMPORTANT DETAILS */}
        {/* ================================================= */}

        <View className="mt-5 px-5">
          <Text className="mb-3 text-[13px] font-bold text-[#172B4D]">
            Details You Can Review
          </Text>

          <ManualStep
            number={1}
            text="Check the alert title and severity to understand the urgency of the detected event."
          />

          <ManualStep
            number={2}
            text="Review the Node and Barangay to identify where the event was detected."
          />

          <ManualStep
            number={3}
            text="Check the detection date and time to determine when the event was recorded."
          />

          <ManualStep
            number={4}
            text="Review the water level, flow rate, and clog percentage shown under the alert details."
          />

          <ManualStep
            number={5}
            text="Review the waste composition and confidence information when available."
          />
        </View>

        {/* ================================================= */}
        {/* SCREENSHOT-SPECIFIC INFORMATION */}
        {/* ================================================= */}

        <View className="mt-2 px-5">
          <View className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <View className="flex-row">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <CheckCircle2 size={16} color="#2563EB" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-[#203D70]">
                  USE THIS INFORMATION
                </Text>

                <Text className="mt-1 text-[10px] leading-5 text-slate-600">
                  Use the information shown in the alert details to understand
                  the detected condition and determine whether further
                  monitoring or action is necessary.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ================================================= */}
        {/* TIP */}
        {/* ================================================= */}

        <View className="mt-4 px-5">
          <ManualTip>
            Tap the X button to close the alert details and return to the Alerts
            list.
          </ManualTip>
        </View>
      </ManualSection>

      {/* ================================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(alertDetailsImage).uri,
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
