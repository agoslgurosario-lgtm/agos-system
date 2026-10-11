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

type ImageKey = "siteInfo" | "wasteComposition" | "barangayResponse";

export default function AddEditReport({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageKey>("siteInfo");

  /*
   * SAVE YOUR THREE SCREENSHOTS AS:
   *
   * assets/images/userManual/reports/
   *
   * ├── add-edit-report-site.jpg
   * ├── add-edit-report-waste.jpg
   * └── add-edit-report-response.jpg
   */

  const siteInfoImage = require("../../../assets/images/userManual/reports/add-edit-report-site.jpg");

  const wasteCompositionImage = require("../../../assets/images/userManual/reports/add-edit-report-waste.jpg");

  const barangayResponseImage = require("../../../assets/images/userManual/reports/add-edit-report-response.jpg");

  const openImage = (image: ImageKey) => {
    setSelectedImage(image);
    setIsImageVisible(true);
  };

  const fullscreenImage =
    selectedImage === "siteInfo"
      ? siteInfoImage
      : selectedImage === "wasteComposition"
        ? wasteCompositionImage
        : barangayResponseImage;

  return (
    <ManualSection
      number={4}
      title="ADD OR EDIT REPORT"
      description="Enter and review the information needed to complete a canal clearing operation report."
      icon={<FilePlus2 size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* ================================================== */}
      {/* INTRODUCTION */}
      {/* ================================================== */}

      <View className="mt-5 px-5">
        <Text className="text-[11px] leading-5 text-slate-600">
          The Add or Edit Report form allows barangay users to record the
          condition of a canal, document the waste collected, and provide
          details about the clearing response.
        </Text>
      </View>

      {/* ================================================== */}
      {/* IMAGE 1 — MONITORING SITE INFORMATION              */}
      {/* ================================================== */}

      <View className="mx-5 mt-5">
        <Text className="text-[13px] font-bold text-[#203D70]">
          1. Monitoring Site Information
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          Enter the location and identifying information of the canal being
          monitored.
        </Text>
      </View>

      <View className="mx-5 mt-3">
        <Pressable
          onPress={() => openImage("siteInfo")}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={siteInfoImage}
              resizeMode="contain"
              className="w-full h-[620px]"
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
        </Pressable>
      </View>

      {/* IMAGE 1 INSTRUCTIONS */}

      <View className="mt-4 px-4">
        <ManualStep
          number={1}
          text="Enter the Canal Name or ID to identify the monitoring site."
        />

        <View className="mt-3">
          <ManualStep
            number={2}
            text="Check the Barangay and Municipality information displayed for the monitoring site."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={3}
            text="Tap the GPS Coordinates field and select the canal location on the map."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={4}
            text="Enter the nearest landmark to make the canal location easier to identify."
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* DETECTION SUMMARY */}
      {/* ================================================== */}

      <View className="mx-5 mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <Text className="text-[11px] font-bold text-[#203D70]">
          DETECTION SUMMARY
        </Text>

        <Text className="mt-2 text-[10px] leading-5 text-slate-600">
          Record when the canal condition was observed and indicate the severity
          of the detected condition.
        </Text>
      </View>

      <View className="mt-4 px-4">
        <ManualStep
          number={5}
          text="Select the Date / Time Observed to record when the canal condition was identified."
        />

        <View className="mt-3">
          <ManualStep
            number={6}
            text="Select the appropriate severity level: Critical, Medium, or Low."
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* CANAL CONDITION */}
      {/* ================================================== */}

      <View className="mx-5 mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
        <Text className="text-[11px] font-bold text-[#237C72]">
          CANAL CONDITION
        </Text>

        <Text className="mt-2 text-[10px] leading-5 text-slate-600">
          Describe the current water level, obstruction coverage, and water flow
          condition of the canal.
        </Text>
      </View>

      <View className="mt-4 px-4">
        <ManualStep
          number={7}
          text="Select the Water Level: Low, Moderate, or High."
        />

        <View className="mt-3">
          <ManualStep
            number={8}
            text="Select the Obstruction Coverage: <25%, 25–50%, 50–75%, or >75%."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={9}
            text="Select the Water Flow Condition: Normal, Reduced, or Blocked."
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* DIVIDER */}
      {/* ================================================== */}

      <View className="mx-5 mt-7 border-t border-slate-200" />

      {/* ================================================== */}
      {/* IMAGE 2 — WASTE COMPOSITION                         */}
      {/* ================================================== */}

      <View className="mx-5 mt-6">
        <Text className="text-[13px] font-bold text-[#203D70]">
          2. Waste Composition
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          Estimate the amount of waste collected from the canal by category.
        </Text>
      </View>

      <View className="mx-5 mt-3">
        <Pressable
          onPress={() => openImage("wasteComposition")}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={wasteCompositionImage}
              resizeMode="contain"
              className="w-full h-[620px]"
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
        </Pressable>
      </View>

      {/* IMAGE 2 INSTRUCTIONS */}

      <View className="mt-4 px-4">
        <ManualStep
          number={10}
          text="Enter the estimated amount of Plastic, Food Wrapper, Paper / Cardboard, Glass, Organic, Metal, Foam, Clothes / Textiles, and E-waste in kilograms."
        />

        <View className="mt-3">
          <ManualStep
            number={11}
            text="Enter the amount under Other (kg) when the waste does not belong to the listed categories."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={12}
            text="Use Other — specify to describe the type of waste entered under the Other category."
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* DIVIDER */}
      {/* ================================================== */}

      <View className="mx-5 mt-7 border-t border-slate-200" />

      {/* ================================================== */}
      {/* IMAGE 3 — BARANGAY RESPONSE                         */}
      {/* ================================================== */}

      <View className="mx-5 mt-6">
        <Text className="text-[13px] font-bold text-[#203D70]">
          3. Barangay Response
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          Record the personnel, response details, and final condition of the
          canal after the clearing operation.
        </Text>
      </View>

      <View className="mx-5 mt-3">
        <Pressable
          onPress={() => openImage("barangayResponse")}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={barangayResponseImage}
              resizeMode="contain"
              className="w-full h-[620px]"
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
        </Pressable>
      </View>

      {/* IMAGE 3 INSTRUCTIONS */}

      <View className="mt-4 px-4">
        <ManualStep
          number={13}
          text="Enter the Assigned Personnel who carried out the cleanup."
        />

        <View className="mt-3">
          <ManualStep
            number={14}
            text="Select the Date / Time Responded to record when the cleanup response took place."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={15}
            text="Describe the Action Taken to explain what was done to clear or address the canal."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={16}
            text="Enter the total Waste Collected in kilograms."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={17}
            text="Select the Final Canal Condition: Clear, Partially Clear, or Still Obstructed."
          />
        </View>

        <View className="mt-3">
          <ManualStep
            number={18}
            text="Add any additional information in the Remarks field if necessary."
          />
        </View>
      </View>

      {/* ================================================== */}
      {/* TIP */}
      {/* ================================================== */}

      <View className="mx-5 mt-4">
        <ManualTip>
          Complete all required fields marked with an asterisk (*). Review the
          information entered in each section before continuing to the next step
          of the report.
        </ManualTip>
      </View>

      {/* ================================================== */}
      {/* FULLSCREEN IMAGE VIEWER                             */}
      {/* ================================================== */}

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
