import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { FileText } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function ReportsAccess({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const reportsImage = require("../../../assets/images/userManual/reports/reports.png");

  return (
    <ManualSection
      number={1}
      title="REPORTS"
      description="Displays the canal monitoring reports created by the system and their current status."
      icon={<FileText size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* SCREENSHOT */}
      <View className="mx-5 mt-5">
        <Pressable
          onPress={() => setIsImageVisible(true)}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={reportsImage}
              resizeMode="contain"
              className="w-full h-[430px]"
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
              Reports
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the reports page.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* INSTRUCTIONS */}
      <View className="mt-4 px-4">
        <ManualStep
          number={1}
          text="Tap the Reports tab from the bottom navigation menu to open the Canal Monitoring Reports page."
        />

        <ManualStep
          number={2}
          text="Review the summary cards to see the total reports, submitted reports, draft reports, and reports pending review."
        />

        <ManualStep
          number={3}
          text="Review the Recent Reports section to see the reports that have already been created."
        />
      </View>

      {/* TIP */}
      <View className="mx-5 mt-2">
        <ManualTip>
          The Reports page allows you to monitor the progress and current status
          of your canal monitoring reports.
        </ManualTip>
      </View>

      {/* FULLSCREEN IMAGE VIEWER */}
      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(reportsImage).uri,
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
