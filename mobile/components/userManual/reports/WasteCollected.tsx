import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Recycle } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function WasteCollected({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const wasteCollectedImage = require("../../../assets/images/userManual/reports/waste-collected.jpg");

  return (
    <ManualSection
      number={5}
      title="WASTE COLLECTED"
      description="Enter the amount of waste collected during the clearing operation."
      icon={<Recycle size={18} color="#2C8198" />}
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
              source={wasteCollectedImage}
              resizeMode="contain"
              className="w-full h-[500px]"
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
              Waste Collected
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the waste collection fields.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ================================= */}
      {/* INSTRUCTIONS */}
      {/* ================================= */}

      <View className="mt-4 px-4">
        <ManualStep
          number={1}
          text="Enter the collected waste amounts for Recyclables, Plastic, Paper, Karton, Biodegradable, Residual, and Special Waste."
        />

        <View className="mt-1">
          <ManualStep
            number={2}
            text="Enter the amount collected in kilograms (kg) for each applicable waste category."
          />
        </View>

        <View className="mt-1">
          <ManualStep
            number={3}
            text="Review the Total Collected value to verify the recorded waste amount."
          />
        </View>
      </View>

      {/* ================================= */}
      {/* TIP */}
      {/* ================================= */}

      <View className="mx-5 mt-3">
        <ManualTip>
          Check each waste amount before submitting the report to make sure the
          total collected reflects the actual waste gathered during the clearing
          operation.
        </ManualTip>
      </View>

      {/* ================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(wasteCollectedImage).uri,
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
