import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { PlusCircle } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function AddReport({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const addReportImage = require("../../../assets/images/userManual/reports/add-report.jpg");

  return (
    <ManualSection
      number={3}
      title="CREATING A NEW REPORT"
      description="Create a new clearing operation report using the Add Report button."
      icon={<PlusCircle size={18} color="#203D70" />}
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
              source={addReportImage}
              resizeMode="contain"
              className="w-full h-[230px]"
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
              Add Report
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the Add Report page.
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
          text="Tap the + Add Report button on the Reports page."
        />

        <View className="mt-1">
          <ManualStep
            number={2}
            text="The Add Report form will open and allow you to enter information about the clearing operation."
          />
        </View>

        <View className="mt-1">
          <ManualStep
            number={3}
            text="Complete the required information before saving or submitting the report."
          />
        </View>
      </View>

      {/* ================================= */}
      {/* TIP */}
      {/* ================================= */}

      <View className="mx-5 mt-3">
        <ManualTip>
          Make sure the information entered in the report is complete and
          accurate before submitting it.
        </ManualTip>
      </View>

      {/* ================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(addReportImage).uri,
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
