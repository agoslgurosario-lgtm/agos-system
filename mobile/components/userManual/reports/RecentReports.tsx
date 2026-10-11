import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Clock3 } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function RecentReports({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const recentReportsImage = require("../../../assets/images/userManual/reports/recent-reports.png");

  return (
    <ManualSection
      number={2}
      title="RECENT REPORTS"
      description="Review previously created reports and check their current status."
      icon={<Clock3 size={18} color="#203D70" />}
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
              source={recentReportsImage}
              resizeMode="contain"
              className="w-full h-[300px]"
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
              Recent Reports
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the report list.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* INSTRUCTIONS */}
      <View className="mt-4 px-4">
        <ManualStep
          number={1}
          text="Review the report date, date of the canal monitoring report, number of attached files, and current status."
        />

        <ManualStep
          number={2}
          text="Tap Continue Draft to continue editing a report that has not yet been submitted."
        />

        <ManualStep
          number={3}
          text="Tap Export to download or save a copy of the report."
        />
      </View>

      {/* TIP */}
      <View className="mx-5 mt-2">
        <ManualTip>
          Use the Recent Reports section to quickly find and continue working on
          previously created reports.
        </ManualTip>
      </View>

      {/* FULLSCREEN IMAGE VIEWER */}
      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(recentReportsImage).uri,
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
