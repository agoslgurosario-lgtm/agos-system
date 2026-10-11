import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Upload } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function UploadEvidence({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const uploadEvidenceImage = require("../../../assets/images/userManual/reports/upload-evidence.jpg");

  return (
    <ManualSection
      number={5}
      title="UPLOAD EVIDENCE"
      description="Allows users to provide a narrative report and upload photo evidence of the clearing operation."
      icon={<Upload size={18} color="#16A34A" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* ================================= */}
      {/* NARRATIVE REPORT DESCRIPTION */}
      {/* ================================= */}

      <View className="mt-4 px-4">
        <ManualStep
          number={1}
          text="Enter the Narrative Report to describe the clearing operation and the actions performed, as the narrative provides a written record of the clearing activity."
        />
      </View>

      {/* ================================= */}
      {/* BEFORE / AFTER SCREENSHOT */}
      {/* ================================= */}

      <View className="mx-5 mt-5">
        <Pressable
          onPress={() => setIsImageVisible(true)}
          className="overflow-hidden rounded-xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={uploadEvidenceImage}
              resizeMode="contain"
              className="w-full h-[250px]"
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
              Before & After Evidence
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the evidence section.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ================================= */}
      {/* BEFORE / AFTER DESCRIPTION */}
      {/* ================================= */}

      <View className="mt-4 px-4">
        <ManualStep
          number={2}
          text="Tap Add Photo under Before and After to upload photos showing the condition before and after the clearing operation."
        />

        <View className="mt-2">
          <ManualStep
            number={3}
            text="Make sure the uploaded photos provide visual evidence that the clearing operation was performed."
          />
        </View>
      </View>

      {/* ================================= */}
      {/* TIP */}
      {/* ================================= */}

      <View className="mx-5 mt-3">
        <ManualTip>
          Upload clear photos for both Before and After to properly document the
          operation. Tap Save Draft to continue later or Submit when the report
          is complete.
        </ManualTip>
      </View>

      {/* ================================= */}
      {/* AFTER SUBMISSION NOTE */}
      {/* ================================= */}

      <View className="mx-5 mt-4 mb-1">
        <Text className="text-[10px] leading-5 text-slate-600">
          After submitting, a confirmation will be displayed and you may view
          and export the submitted report once it has been received.
        </Text>
      </View>

      {/* ================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(uploadEvidenceImage).uri,
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
