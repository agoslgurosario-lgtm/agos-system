import React, { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Activity } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function SensorReadingDetails({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const readingImage = require("../../../assets/images/userManual/readings/sensor-reading-details.jpg");

  return (
    <>
      <ManualSection
        number={3}
        title="INDIVIDUAL SENSOR READINGS"
        description="Learn how to understand the information displayed in individual sensor reading cards."
        icon={<Activity size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        {/* Description */}
        <View className="mt-5 px-5">
          <Text className="mb-4 text-sm leading-6 text-slate-600">
            Each sensor reading card displays the canal location, sensor
            identification, recording time, water measurements, clog percentage,
            and the corresponding sensor status classifications.
          </Text>

          {/* Actual Sensor Reading Screenshot */}
          <Pressable
            onPress={() => setIsImageVisible(true)}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <Image
              source={readingImage}
              resizeMode="contain"
              className="h-[420px] w-full"
              style={{ backgroundColor: "#F8FAFC" }}
            />

            <View className="border-t border-slate-100 px-4 py-3">
              <Text className="text-center text-xs font-semibold text-slate-700">
                Individual Sensor Reading Cards
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap the image to enlarge.
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Understanding Reading Details */}
        <View className="mt-5 px-4">
          <Text className="mb-3 text-sm font-bold text-[#203D70]">
            UNDERSTANDING READING DETAILS
          </Text>

          <ManualStep number={1}>
            <Text>
              Check the canal name, sensor ID, and location to identify which
              sensor node recorded the reading.
            </Text>
          </ManualStep>

          <View className="mt-1">
            <ManualStep number={2}>
              <Text>
                Check Recorded At to determine the date and time when the
                measurement was recorded.
              </Text>
            </ManualStep>
          </View>

          <View className="mt-1">
            <ManualStep number={3}>
              <Text>
                The Alerts screen will be displayed after tapping the
                notification bell.
              </Text>
            </ManualStep>
          </View>

          <View className="mt-1">
            <ManualStep number={4}>
              <Text>
                Review Water Level in centimeters (cm) and Water Flow in meters
                per second (m/s).
              </Text>
            </ManualStep>
          </View>

          <View className="mt-1">
            <ManualStep number={5}>
              <Text>
                Clog Percentage indicates the level of obstruction in the canal,
                with a higher percentage indicating a more severe clog.
              </Text>
            </ManualStep>
          </View>

          <View className="mt-1">
            <ManualStep number={6}>
              <Text>
                Review the overall status badge and the separate Water Level and
                Clog classifications to identify conditions that may require
                attention.
              </Text>
            </ManualStep>
          </View>
        </View>

        {/* Helpful Tip */}
        <View className="mx-5 mt-5">
          <ManualTip>
            A Critical status may require immediate attention even when the clog
            percentage is low. Check the Water Level and Clog classifications
            separately before assessing the canal condition.
          </ManualTip>
        </View>
      </ManualSection>

      {/* Full-Screen Image Viewer */}
      <ImageViewing
        images={[Image.resolveAssetSource(readingImage)]}
        imageIndex={0}
        visible={isImageVisible}
        onRequestClose={() => setIsImageVisible(false)}
        presentationStyle="fullScreen"
        backgroundColor="#0F172A"
      />
    </>
  );
}
