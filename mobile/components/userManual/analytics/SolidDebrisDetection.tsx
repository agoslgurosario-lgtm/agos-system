import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { ScanSearch, CheckCircle2 } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function SolidDebrisDetection({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const solidDebrisImage = require("../../../assets/images/userManual/analytics/solid-debris-detection.png");

  return (
    <>
      <ManualSection
        number={3}
        title="SOLID DEBRIS DETECTION"
        description="Review the Solid Debris Detection section to check the current status of the monitoring point."
        icon={<ScanSearch size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="px-5">
          {/* ================================================= */}
          {/* SCREENSHOT */}
          {/* ================================================= */}

          <View className="mt-2">
            <Pressable
              onPress={() => setIsImageVisible(true)}
              className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
            >
              <View className="relative">
                <Image
                  source={solidDebrisImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 170,
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
                  Solid Debris Detection Status
                </Text>

                <Text className="mt-1 text-center text-[10px] text-slate-400">
                  Tap to zoom and view the detection status
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* EXPLANATION */}
          {/* ================================================= */}

          <View className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-white">
                <CheckCircle2 size={18} color="#16A34A" />
              </View>

              <View className="flex-1">
                <Text className="text-[12px] font-bold text-green-800">
                  Detection Status
                </Text>

                <Text className="mt-1 text-[10px] leading-5 text-green-700">
                  The section indicates whether solid debris has been detected
                  at the monitored location.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* STEPS */}
          {/* ================================================= */}

          <View className="mt-5">
            <ManualStep
              number={1}
              text="Review the monitoring point listed under Solid Debris Detection."
            />

            <ManualStep
              number={2}
              text="Check the displayed status to determine whether solid debris has been detected."
            />
          </View>
        </View>
      </ManualSection>

      {/* ================================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(solidDebrisImage).uri,
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
