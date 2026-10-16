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

export default function SensorReadings({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const readingsImage = require("../../../assets/images/userManual/readings/sensor-readings.jpg");

  return (
    <>
      <ManualSection
        number={1}
        title="SENSOR READINGS"
        description="Access the sensor readings screen to view recorded canal measurements."
        icon={<Activity size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="mt-5 px-5">
          <Text className="mb-3 text-sm leading-6 text-slate-600">
            The Sensor Readings screen allows users to access recorded
            measurements from deployed sensor nodes through the AGOS
            application.
          </Text>

          {/* Sensor Readings Screenshot */}
          <Pressable
            onPress={() => setIsImageVisible(true)}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
          >
            <View className="relative">
              <Image
                source={readingsImage}
                resizeMode="contain"
                className="h-[520px] w-full"
                style={{ backgroundColor: "#F8FAFC" }}
              />

              <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
                <Text className="text-[10px] font-semibold text-white">
                  🔍 Tap to enlarge
                </Text>
              </View>
            </View>

            <View className="border-t border-slate-100 px-4 py-3">
              <Text className="text-center text-xs font-semibold text-slate-700">
                Sensor Readings Screen
              </Text>
              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Screenshot of the sensor readings interface.
              </Text>
            </View>
          </Pressable>
        </View>
        {/* Accessing Sensor Readings */}
        <View className="mt-5 px-4">
          <Text className="mb-3 text-sm font-bold text-[#203D70]">
            HOW TO ACCESS SENSOR READINGS
          </Text>

          <ManualStep number={1}>
            <Text>Open the AGOS application and log in to your account.</Text>
          </ManualStep>
          <ManualStep number={2}>
            <Text>Locate and tap Readings in the bottom navigation bar.</Text>
          </ManualStep>

          <ManualStep number={3}>
            <Text>
              The Sensor Readings screen will appear, displaying the recorded
              sensor readings.
            </Text>
          </ManualStep>
        </View>

        <View className="mx-5 mt-5">
          <ManualTip>
            <Text>This allows you to read the sensor data at any time.</Text>
          </ManualTip>
        </View>
      </ManualSection>

      {/* Full-Screen Screenshot Viewer */}
      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(readingsImage).uri,
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
