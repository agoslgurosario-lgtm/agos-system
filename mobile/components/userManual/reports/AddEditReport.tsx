import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { FilePlus2 } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

type ImageKey =
  | "monitoring"
  | "wasteComposition"
  | "barangayResponse"
  | "photos";

export default function AddEditReport({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageKey>("monitoring");

  /*
   * Image assets:
   * assets/images/userManual/reports/
   *
   * monitoring.png
   * waste-composition.png
   * barangay-response.png
   * upload-evidence.png
   */
  const monitoringImage = require("../../../assets/images/userManual/reports/monitoring.png");
  const wasteCompositionImage = require("../../../assets/images/userManual/reports/waste-composition.png");
  const barangayResponseImage = require("../../../assets/images/userManual/reports/barangay-response.png");
  const photosImage = require("../../../assets/images/userManual/reports/upload-evidence.png");

  const openImage = (image: ImageKey) => {
    setSelectedImage(image);
    setIsImageVisible(true);
  };

  const fullscreenImage =
    selectedImage === "monitoring"
      ? monitoringImage
      : selectedImage === "wasteComposition"
        ? wasteCompositionImage
        : selectedImage === "barangayResponse"
          ? barangayResponseImage
          : photosImage;

  // Reusable screenshot preview
  const Screenshot = ({
    image,
    source,
    title,
    description,
  }: {
    image: ImageKey;
    source: number;
    title: string;
    description: string;
  }) => (
    <View className="mx-5 mt-3">
      <Pressable
        onPress={() => openImage(image)}
        className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
      >
        <View className="relative items-center justify-center bg-[#F8FAFC]">
          <Image
            source={source}
            resizeMode="contain"
            style={{
              width: "100%",
              height: 380,
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
            {title}
          </Text>

          <Text className="mt-1 text-center text-[10px] text-slate-400">
            {description}
          </Text>
        </View>
      </Pressable>
    </View>
  );

  return (
    <ManualSection
      number={4}
      title="ADD OR EDIT REPORT"
      description="Complete the canal monitoring report, record the waste collected, document the barangay response, and attach cleanup photos."
      icon={<FilePlus2 size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* INTRODUCTION */}
      <View className="mt-5 px-5">
        <Text className="text-[11px] leading-5 text-slate-600">
          Use the Add or Edit Report form to record the observed canal
          condition, estimate waste by category, describe the cleanup response,
          and provide photo evidence before and after the operation.
        </Text>
      </View>

      {/* 1. MONITORING SITE INFORMATION */}
      <View className="mx-5 mt-5">
        <Text className="text-[13px] font-bold text-[#203D70]">
          1. Monitoring Site Information
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          Confirm the assigned location, select the Purok, and record the
          detected canal condition.
        </Text>
      </View>

      <Screenshot
        image="monitoring"
        source={monitoringImage}
        title="Monitoring Site Information"
        description="Tap to zoom and explore the monitoring and canal condition fields."
      />

      <View className="mt-4 px-4">
        <ManualStep number={1}>
          <Text>
            Check the Barangay and Municipality fields. These are displayed as
            locked fields for the assigned user.
          </Text>
        </ManualStep>

        <ManualStep number={2}>
          <Text>Select the Purok where the canal condition was observed.</Text>
        </ManualStep>

        <ManualStep number={3}>
          <Text>
            Select Date / Time Observed to record when the condition was
            identified.
          </Text>
        </ManualStep>

        <ManualStep number={4}>
          <Text>Choose the Severity level: Critical, Medium, or Low.</Text>
        </ManualStep>

        <ManualStep number={5}>
          <Text>
            Under Overall Canal Condition, select the Overall Water Level: Low,
            Moderate, or High.
          </Text>
        </ManualStep>

        <ManualStep number={6}>
          <Text>
            Select the Overall Obstruction range that best describes the canal:{" "}
            {"<25%"}, 25–50%, 50–75%, or {">75%"}.
          </Text>
        </ManualStep>

        <ManualStep number={7}>
          <Text>
            Select the Overall Water Flow: Normal, Reduced, or Blocked.
          </Text>
        </ManualStep>
      </View>

      <View className="mx-5 mt-7 border-t border-slate-200" />

      {/* 2. WASTE COMPOSITION */}
      <View className="mx-5 mt-6">
        <Text className="text-[13px] font-bold text-[#203D70]">
          2. Waste Composition
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          Estimate the weight of each type of waste collected from the canal.
          Blank categories are recorded as 0 when the report is submitted.
        </Text>
      </View>

      <Screenshot
        image="wasteComposition"
        source={wasteCompositionImage}
        title="Waste Composition"
        description="Tap to zoom and review the waste categories and weight fields."
      />

      <View className="mt-4 px-4">
        <ManualStep number={8}>
          <Text>
            Enter the estimated weight in kilograms for each applicable
            category: Plastic, Food Wrapper, Paper / Cardboard, Glass, Organic,
            Metal, Foam, Clothes / Textiles, E-waste, Sanitary / Hygiene,
            Footwear / Rubber, and Medical.
          </Text>
        </ManualStep>

        <ManualStep number={9}>
          <Text>
            Enter the weight under Other (kg) for waste that does not fit any of
            the listed categories.
          </Text>
        </ManualStep>

        <ManualStep number={10}>
          <Text>
            Use Other — specify to identify the additional type of waste, such
            as wood, construction debris, or a mattress.
          </Text>
        </ManualStep>

        <ManualStep number={11}>
          <Text>
            Review the category estimates before continuing. The total Waste
            Collected is calculated automatically from the entered amounts.
          </Text>
        </ManualStep>
      </View>

      <View className="mx-5 mt-7 border-t border-slate-200" />

      {/* 3. BARANGAY RESPONSE */}
      <View className="mx-5 mt-6">
        <Text className="text-[13px] font-bold text-[#203D70]">
          3. Barangay Response
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          Record who performed the cleanup, when the response took place, and
          what action was carried out.
        </Text>
      </View>

      <Screenshot
        image="barangayResponse"
        source={barangayResponseImage}
        title="Barangay Response"
        description="Tap to zoom and review the cleanup response details."
      />

      <View className="mt-4 px-4">
        <ManualStep number={12}>
          <Text>Enter the Assigned Personnel who carried out the cleanup.</Text>
        </ManualStep>

        <ManualStep number={13}>
          <Text>
            Select Date / Time Responded to record when the cleanup response
            took place.
          </Text>
        </ManualStep>

        <ManualStep number={14}>
          <Text>
            Describe the Action Taken, including the work performed to clear the
            canal.
          </Text>
        </ManualStep>

        <ManualStep number={15}>
          <Text>
            Check Waste Collected (auto total). This field is locked and
            displays the total calculated from the waste composition entries.
          </Text>
        </ManualStep>

        <ManualStep number={16}>
          <Text>
            Add any relevant details in Remarks. This field is optional.
          </Text>
        </ManualStep>
      </View>

      <View className="mx-5 mt-7 border-t border-slate-200" />

      {/* 4. PHOTO EVIDENCE */}
      <View className="mx-5 mt-6">
        <Text className="text-[13px] font-bold text-[#203D70]">4. Photos</Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          Attach visual documentation of the canal before and after cleanup.
          Additional evidence can be added when needed.
        </Text>
      </View>

      <Screenshot
        image="photos"
        source={photosImage}
        title="Photo Evidence"
        description="Tap to zoom and review the before and after cleanup photo fields."
      />

      <View className="mt-4 px-4">
        <ManualStep number={17}>
          <Text>
            Tap Add Photo under Before Cleanup to attach a photo showing the
            canal before the clearing operation. This field is required.
          </Text>
        </ManualStep>

        <ManualStep number={18}>
          <Text>
            Tap Add Photo under After Cleanup to attach a photo showing the
            canal after the clearing operation. This field is required.
          </Text>
        </ManualStep>

        <ManualStep number={19}>
          <Text>
            Use Additional Evidence to attach other relevant photos if needed.
            This section is optional.
          </Text>
        </ManualStep>

        <ManualStep number={20}>
          <Text>
            Select Save Draft to save the report and continue later, or Submit
            to send the completed report.
          </Text>
        </ManualStep>
      </View>

      {/* TIP */}
      <View className="mx-5 mt-4">
        <ManualTip>
          Before submitting, make sure the Purok and canal condition are
          correct, the waste weights reflect the collected materials, and both
          required cleanup photos are attached. Review the response details
          before selecting Submit.
        </ManualTip>
      </View>

      {/* FULLSCREEN IMAGE VIEWER */}
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
