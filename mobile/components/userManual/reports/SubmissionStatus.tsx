import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { CircleAlert, CalendarClock } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function SubmissionStatus({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<
    "submissionStatus" | "submissionBypass"
  >("submissionStatus");

  const submissionStatusImage = require("../../../assets/images/userManual/reports/submission-status.jpg");
  const submissionBypassImage = require("../../../assets/images/userManual/reports/submission-bypass.jpg");

  const openImage = (image: "submissionStatus" | "submissionBypass") => {
    setSelectedImage(image);
    setIsImageVisible(true);
  };

  const fullscreenImage =
    selectedImage === "submissionStatus"
      ? submissionStatusImage
      : submissionBypassImage;

  return (
    <ManualSection
      number={6}
      title="SUBMISSION STATUS"
      description="Review the submission status and understand the rules that apply when submitting a clearing operation report."
      icon={<CircleAlert size={18} color="#C2410C" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* ================================= */}
      {/* SUBMISSION STATUS SCREENSHOT */}
      {/* ================================= */}

      <View className="mx-5 mt-5">
        <Pressable
          onPress={() => openImage("submissionStatus")}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={submissionStatusImage}
              resizeMode="contain"
              className="w-full h-[650px]"
            />

            <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
              <Text className="text-[10px] font-semibold text-white">
                🔍 Tap to enlarge
              </Text>
            </View>
          </View>

          <View className="border-t border-slate-100 px-4 py-3">
            <Text className="text-center text-xs font-semibold text-slate-700">
              Submission Status Screen
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the screen.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ================================= */}
      {/* SUBMISSION STATUS INSTRUCTIONS */}
      {/* ================================= */}

      <View className="mt-4 px-4">
        <ManualStep
          number={1}
          text="Tap Submit after completing the report and uploading the required evidence."
        />

        <ManualStep
          number={2}
          text="Review the submission status message displayed by the system."
        />

        <ManualStep
          number={3}
          text="If submission is not currently allowed, check the message to see when the report can normally be submitted."
        />

        <ManualStep
          number={4}
          text="Review the report summary to verify the location, responder, waste types, total waste collected, and evidence photos."
        />
      </View>

      {/* ================================= */}
      {/* END-OF-MONTH INFORMATION */}
      {/* ================================= */}

      <View className="mx-5 mt-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
        <View className="flex-row items-center">
          <CalendarClock size={17} color="#C2410C" />

          <Text className="ml-2 text-[11px] font-bold text-[#9A3412]">
            END-OF-MONTH SUBMISSION RULE
          </Text>
        </View>

        <Text className="mt-2 text-[10px] leading-5 text-slate-600">
          The system may restrict report submission until the last day of the
          month. When this rule is active, the submission screen displays the
          date when submission will normally become available.
        </Text>
      </View>

      {/* ================================= */}
      {/* BYPASS CONFIRMATION SCREENSHOT */}
      {/* ================================= */}

      <View className="mx-5 mt-6">
        <Text className="text-[13px] font-bold text-[#203D70]">
          Submission Confirmation
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          If the system allows the user to bypass the end-of-month rule, a
          confirmation message is displayed before continuing.
        </Text>
      </View>

      <View className="mx-5 mt-3">
        <Pressable
          onPress={() => openImage("submissionBypass")}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={submissionBypassImage}
              resizeMode="contain"
              className="w-full h-[650px]"
            />

            <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
              <Text className="text-[10px] font-semibold text-white">
                🔍 Tap to enlarge
              </Text>
            </View>
          </View>

          <View className="border-t border-slate-100 px-4 py-3">
            <Text className="text-center text-xs font-semibold text-slate-700">
              Submission Confirmation
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the confirmation screen.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ================================= */}
      {/* BYPASS INSTRUCTIONS */}
      {/* ================================= */}

      <View className="mt-4 px-4">
        <ManualStep
          number={5}
          text='If "Submit anyway" is available, review the warning explaining that the report is being submitted before the normal submission date.'
        />

        <ManualStep
          number={6}
          text='Tap "Submit anyway" only if the report needs to be submitted before the regular month-end schedule.'
        />

        <ManualStep
          number={7}
          text='Tap "No, cancel" if you do not want to bypass the end-of-month submission rule.'
        />
      </View>

      {/* ================================= */}
      {/* TIP */}
      {/* ================================= */}

      <View className="mx-5 mt-3">
        <ManualTip>
          Always review the report information and uploaded evidence before
          submitting. If the end-of-month rule is active, carefully review the
          confirmation message before choosing to bypass it.
        </ManualTip>
      </View>

      {/* ================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(fullscreenImage).uri,
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
