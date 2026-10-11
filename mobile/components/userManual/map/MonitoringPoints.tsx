import React, { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import {
  MapPin,
  Radio,
  Activity,
  AlertTriangle,
  Eye,
  Droplets,
  Waves,
  Ban,
  X,
  ZoomIn,
} from "lucide-react-native";

import ManualSection from "../common/ManualSection";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function MonitoringPoints({ expanded, onPress }: Props) {
  const [imageViewerVisible, setImageViewerVisible] = useState(false);

  return (
    <>
      <ManualSection
        number={4}
        title="MONITORING POINTS"
        description="Shows the number of sensor nodes deployed within your barangay."
        icon={<MapPin size={18} color="#203D70" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="mt-5 px-5">
          {/* =============================== */}
          {/* INTRODUCTION */}
          {/* =============================== */}
          <View className="mb-5 px-1">
            <Text className="text-[11px] leading-5 text-slate-600">
              Monitoring points are designated locations where AGOS sensor nodes
              are installed to collect information about canal conditions in
              your barangay. These points provide the data used for continuous
              monitoring and assessment.
            </Text>
          </View>

          {/* =============================== */}
          {/* MONITORING POINTS CARD */}
          {/* =============================== */}
          <View className="mx-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <View className="flex-row items-center">
              <MapPin size={21} color="#172B4D" strokeWidth={2} />

              <Text className="ml-2 text-[16px] font-bold text-[#172B4D]">
                Monitoring Points
              </Text>
            </View>

            <Text className="mt-1 text-[34px] font-bold leading-[38px] text-[#172B4D]">
              1
            </Text>

            <Text className="mt-1 text-[13px] text-slate-500">
              Sensor node/s in this barangay
            </Text>
          </View>

          {/* =============================== */}
          {/* WHAT MONITORING POINTS DO */}
          {/* =============================== */}
          <View className="mt-8 px-1">
            <Text className="mb-1 text-[13px] font-bold text-[#172B4D]">
              What Monitoring Points Do
            </Text>

            <Text className="mb-5 text-[10px] leading-4 text-slate-500">
              Each monitoring point serves as a designated location for
              collecting and transmitting canal condition data.
            </Text>

            {/* Location */}
            <View className="mb-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <MapPin size={14} color="#173A70" strokeWidth={2} />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-semibold text-slate-700">
                  Designated Location
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Shows where a sensor node is installed to monitor a specific
                  canal area or identified hotspot.
                </Text>
              </View>
            </View>

            {/* Data Collection */}
            <View className="mb-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <Radio size={14} color="#173A70" strokeWidth={2} />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-semibold text-slate-700">
                  Sensor Data
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Sensor nodes collect and transmit canal condition readings to
                  AGOS for monitoring and evaluation.
                </Text>
              </View>
            </View>

            {/* Monitoring */}
            <View className="flex-row items-start">
              <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
                <Activity size={14} color="#173A70" strokeWidth={2} />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-semibold text-slate-700">
                  Canal Monitoring
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Collected readings help identify changes in canal conditions
                  that may require attention or further verification.
                </Text>
              </View>
            </View>
          </View>

          {/* =============================== */}
          {/* HOW TO USE */}
          {/* =============================== */}
          <View className="mt-7 px-1">
            <Text className="mb-1 text-[13px] font-bold text-[#172B4D]">
              How to Use This Information
            </Text>

            <Text className="mb-4 text-[10px] leading-4 text-slate-500">
              Use the monitoring point count together with the map and sensor
              information when checking canal conditions.
            </Text>

            {/* Step 1 */}
            <View className="mb-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
                <Text className="text-[9px] font-bold text-white">1</Text>
              </View>

              <Text className="flex-1 text-[10px] leading-4 text-slate-600">
                Check the number of sensor nodes currently deployed in your
                barangay.
              </Text>
            </View>

            {/* Step 2 */}
            <View className="mb-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
                <Text className="text-[9px] font-bold text-white">2</Text>
              </View>

              <Text className="flex-1 text-[10px] leading-4 text-slate-600">
                Locate the corresponding monitoring point on the map to identify
                the monitored canal area.
              </Text>
            </View>

            {/* Step 3 */}
            <View className="mb-4 flex-row items-start">
              <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
                <Text className="text-[9px] font-bold text-white">3</Text>
              </View>

              <Text className="flex-1 text-[10px] leading-4 text-slate-600">
                Review the latest sensor readings when assessing the condition
                of the monitored canal.
              </Text>
            </View>

            {/* Step 4 */}
            <View className="flex-row items-start">
              <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
                <Text className="text-[9px] font-bold text-white">4</Text>
              </View>

              <Text className="flex-1 text-[10px] leading-4 text-slate-600">
                Report or coordinate with the appropriate personnel if the
                monitoring data indicates a condition requiring attention.
              </Text>
            </View>
          </View>

          {/* =============================== */}
          {/* VIEWING NODE DETAILS */}
          {/* =============================== */}
          <View className="mt-7">
            <Text className="mb-1 text-[13px] font-bold text-[#172B4D]">
              Viewing Node Details
            </Text>

            <Text className="mb-4 text-[10px] leading-4 text-slate-500">
              Select a monitoring node on the map to view detailed information
              about its current canal conditions.
            </Text>

            {/* Instruction */}
            <View className="mb-4 flex-row items-start">
              <View className="h-7 w-7 items-center justify-center rounded-full bg-[#203D70]">
                <Text className="text-[11px] font-bold text-white">1</Text>
              </View>

              <Text className="ml-3 flex-1 text-[11px] leading-5 text-slate-600">
                Tap a monitoring node displayed on the Localized Canal Map.
              </Text>
            </View>

            {/* =============================== */}
            {/* NODE SCREENSHOT */}
            {/* =============================== */}
            <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {/* Screenshot Header */}
              <View className="flex-row items-center justify-between border-b border-slate-100 px-4 py-3">
                <Text className="text-[11px] font-bold text-slate-700">
                  Node Information
                </Text>

                <View className="flex-row items-center rounded-full bg-blue-50 px-2.5 py-1">
                  <ZoomIn size={10} color="#2563EB" />

                  <Text className="ml-1 text-[8px] font-bold text-blue-600">
                    TAP TO ENLARGE
                  </Text>
                </View>
              </View>

              {/* Clickable Image */}
              <Pressable
                onPress={() => setImageViewerVisible(true)}
                className="bg-slate-50"
              >
                <Image
                  source={require("../../../assets/images/userManual/map/node-info.jpg")}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 500,
                    backgroundColor: "#F8FAFC",
                  }}
                />

                {/* Tap Overlay */}
                <View className="absolute bottom-3 left-0 right-0 items-center">
                  <View className="flex-row items-center rounded-full bg-black/60 px-3 py-2">
                    <ZoomIn size={13} color="#FFFFFF" />

                    <Text className="ml-1.5 text-[9px] font-semibold text-white">
                      Tap image to enlarge
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
          </View>

          {/* =============================== */}
          {/* INFORMATION SHOWN */}
          {/* =============================== */}
          <View className="mt-6">
            <Text className="mb-3 text-[14px] font-bold text-slate-800">
              Information Shown
            </Text>

            {/* Node and Status */}
            <View className="mb-2 flex-row rounded-2xl border border-slate-200 bg-white p-3.5">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <MapPin size={16} color="#2563EB" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Node and Status
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Displays the selected node name, such as SN-1 – CN-Alipang-1,
                  together with its current status.
                </Text>
              </View>
            </View>

            {/* Water Level */}
            <View className="mb-2 flex-row rounded-2xl border border-slate-200 bg-white p-3.5">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                <Droplets size={16} color="#2563EB" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Water Level Data
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Shows the current water level, sensor reading, and the last
                  time the monitoring data was updated.
                </Text>
              </View>
            </View>

            {/* Water Flow */}
            <View className="mb-2 flex-row rounded-2xl border border-slate-200 bg-white p-3.5">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-cyan-50">
                <Waves size={16} color="#0891B2" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Water Flow Data
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Displays the flow rate measured by the monitoring sensor.
                </Text>
              </View>
            </View>

            {/* Clog */}
            <View className="flex-row rounded-2xl border border-slate-200 bg-white p-3.5">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-red-50">
                <Ban size={16} color="#DC2626" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Clog Detection
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Shows the detected clog percentage for the selected monitoring
                  node.
                </Text>
              </View>
            </View>
          </View>

          {/* =============================== */}
          {/* CLOSE INSTRUCTION */}
          {/* =============================== */}
          <View className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white">
                <X size={16} color="#64748B" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Close the Node Information
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Tap the X button in the upper-right corner of the information
                  panel to return to the map.
                </Text>
              </View>
            </View>
          </View>

          {/* =============================== */}
          {/* QUICK TIP */}
          {/* =============================== */}
          <View className="mt-6 flex-row items-start rounded-xl border border-slate-200 bg-white p-3">
            <Eye size={15} color="#64748B" strokeWidth={2} />

            <View className="ml-2 flex-1">
              <Text className="text-[10px] font-bold text-[#173A70]">
                QUICK TIP
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Use the monitoring point location together with its latest
                readings to understand conditions at a specific canal area.
              </Text>
            </View>
          </View>

          {/* =============================== */}
          {/* IMPORTANT NOTE */}
          {/* =============================== */}
          <View className="mt-4 flex-row items-start rounded-xl border border-slate-200 bg-slate-50 p-3">
            <AlertTriangle size={15} color="#64748B" strokeWidth={2} />

            <View className="ml-2 flex-1">
              <Text className="text-[10px] font-bold text-[#173A70]">
                IMPORTANT
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                The monitoring point count only represents the sensor nodes
                deployed in your barangay. It does not represent the number of
                canal obstructions or the overall risk level.
              </Text>
            </View>
          </View>
        </View>
      </ManualSection>

      {/* ================================================= */}
      {/* FULL-SCREEN IMAGE VIEWER                         */}
      {/* ================================================= */}
      <Modal
        visible={imageViewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View className="flex-1 bg-black">
          {/* Close Button */}
          <Pressable
            onPress={() => setImageViewerVisible(false)}
            className="absolute right-5 top-12 z-50 h-10 w-10 items-center justify-center rounded-full bg-white/90"
          >
            <X size={22} color="#172B4D" strokeWidth={2.5} />
          </Pressable>

          {/* Image */}
          <View className="flex-1 items-center justify-center">
            <Image
              source={require("../../../assets/images/userManual/map/node-info.jpg")}
              resizeMode="contain"
              style={{
                width: "100%",
                height: "90%",
              }}
            />
          </View>

          {/* Bottom Hint */}
          <View className="absolute bottom-8 left-0 right-0 items-center">
            <View className="rounded-full bg-white/15 px-4 py-2">
              <Text className="text-[10px] text-white">Tap X to close</Text>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
