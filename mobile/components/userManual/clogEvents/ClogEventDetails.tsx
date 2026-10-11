import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import {
  CircleAlert,
  MapPin,
  Activity,
  Droplets,
  Waves,
  Clock,
  CheckCircle,
} from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function ClogEventDetails({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<
    "eventDetails" | "detailedInfo"
  >("eventDetails");

  const eventDetailsImage = require("../../../assets/images/userManual/clogEvents/clog-event-details.png");
  const detailedInfoImage = require("../../../assets/images/userManual/clogEvents/detailed-info.png");

  const openImage = (image: "eventDetails" | "detailedInfo") => {
    setSelectedImage(image);
    setIsImageVisible(true);
  };

  const fullscreenImage =
    selectedImage === "eventDetails" ? eventDetailsImage : detailedInfoImage;

  return (
    <ManualSection
      number={3}
      title="CLOG EVENT DETAILS"
      description="Displays complete information about a selected clog event, including its severity, location, monitoring data, and current status."
      icon={<CircleAlert size={18} color="#DC2626" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* ================================= */}
      {/* SCREENSHOT */}
      {/* ================================= */}

      <View className="mx-5 mt-5">
        <Pressable
          onPress={() => openImage("eventDetails")}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={eventDetailsImage}
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
              Clog Event Details
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the event details.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ================================= */}
      {/* HOW TO VIEW DETAILS */}
      {/* ================================= */}

      <View className="mx-5 mt-4">
        <ManualStep
          number={1}
          text="Tap a clog event card from the Clog Events list to open its Event Details page."
        />

        <ManualStep
          number={2}
          text="Review the severity and current status shown at the top of the page."
        />

        <ManualStep
          number={3}
          text="Review the monitoring information recorded for the selected event."
        />
      </View>

      {/* ================================= */}
      {/* INFORMATION AVAILABLE */}
      {/* ================================= */}

      <View className="mx-5 mt-4">
        <Text className="mb-1 text-sm font-bold text-slate-800">
          Information Available
        </Text>

        <View className="mt-5">
          <Pressable
            onPress={() => openImage("detailedInfo")}
            className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
          >
            <View className="relative">
              <Image
                source={detailedInfoImage}
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
                Detailed Monitoring Information
              </Text>

              <Text className="mt-1 text-center text-[10px] text-slate-400">
                Tap to zoom and explore the recorded information.
              </Text>
            </View>
          </Pressable>
        </View>

        <Text className="mb-3 mt-2 text-[10px] leading-4 text-slate-500">
          The Event Details page provides the monitoring information associated
          with the selected clog event.
        </Text>

        {/* Severity & Status */}
        <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle size={16} color="#059669" />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">
                Severity & Status
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Shows the severity of the event and whether the clog event has
                been detected, responded to, or cleared.
              </Text>
            </View>
          </View>
        </View>

        {/* Location */}
        <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
              <MapPin size={16} color="#2563EB" />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">
                Location & Node
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Identifies the monitored location and the monitoring node where
                the clog event was detected.
              </Text>
            </View>
          </View>
        </View>

        {/* Classification */}
        <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-indigo-50">
              <Activity size={16} color="#4F46E5" />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">
                Classification
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Displays the recorded waste or clog classification associated
                with the event.
              </Text>
            </View>
          </View>
        </View>

        {/* Reading ID */}
        <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-sky-50">
              <Waves size={16} color="#0284C7" />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">
                Reading ID
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Identifies the sensor reading associated with the detected
                event.
              </Text>
            </View>
          </View>
        </View>

        {/* Water Data */}
        <View className="mb-2 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-cyan-50">
              <Droplets size={16} color="#0891B2" />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">
                Water Level & Flow
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Shows the recorded water level and water flow measurements
                associated with the monitoring event.
              </Text>
            </View>
          </View>
        </View>

        {/* Detection Time */}
        <View className="rounded-2xl border border-slate-200 bg-white p-4">
          <View className="flex-row items-center">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              <Clock size={16} color="#64748B" />
            </View>

            <View className="flex-1">
              <Text className="text-xs font-bold text-slate-700">
                Detection Time
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Shows the date and time when the clog event was detected by the
                monitoring system.
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* ================================= */}
      {/* TIP */}
      {/* ================================= */}

      <View className="mx-5 mt-4">
        <ManualTip>
          Review the event status and monitoring data before deciding what
          action should be taken. The displayed information helps identify the
          affected location and understand the recorded canal condition.
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
