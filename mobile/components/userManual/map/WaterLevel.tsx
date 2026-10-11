import React from "react";
import { Text, View } from "react-native";
import {
  Droplets,
  Info,
  BarChart3,
  MapPin,
  ShieldAlert,
  ClipboardCheck,
  Waves,
} from "lucide-react-native";

import ManualSection from "../common/ManualSection";

type Props = {
  expanded: boolean;
  onPress: () => void;
};
export default function WaterLevel({ expanded, onPress }: Props) {
  return (
    <ManualSection
      number={7}
      title="AVERAGE WATER LEVEL"
      description="Displays the average water level recorded across monitoring nodes in your barangay."
      icon={<Waves size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      <View className="mt-5 px-5">
        {/* =============================== */}
        {/* EXISTING CARD — DO NOT CHANGE */}
        {/* =============================== */}
        <View className="bg-white rounded-2xl p-4 border border-slate-200">
          <View className="flex-row items-center">
            <Droplets size={17} color="#172B4D" />

            <Text className="ml-2 text-[13px] font-bold text-slate-700">
              Average Water Level
            </Text>
          </View>

          <Text className="text-[28px] font-bold text-[#172B4D] mt-1">64%</Text>

          <Text className="text-[10px] text-slate-400">Across all nodes</Text>
        </View>

        {/* =============================== */}
        {/* WHAT THIS INDICATOR SHOWS */}
        {/* =============================== */}
        <View className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4">
          <View className="flex-row items-center mb-2">
            <Info size={16} color="#172B4D" />

            <Text className="ml-2 text-[12px] font-bold text-[#172B4D]">
              WHAT THIS INDICATOR SHOWS
            </Text>
          </View>

          <Text className="text-[11px] leading-5 text-slate-500">
            This indicator summarizes the water-level readings from the
            monitoring nodes installed in your barangay. It provides a quick
            view of the current water conditions across monitored canal areas.
          </Text>
        </View>

        {/* =============================== */}
        {/* UNDERSTANDING THE READING */}
        {/* =============================== */}
        <View className="mt-7">
          <Text className="text-[12px] font-bold text-[#172B4D]">
            UNDERSTANDING THE READING
          </Text>

          <Text className="text-[10px] text-slate-400 mt-1 mb-4">
            Use the average value as an overview of current water conditions.
          </Text>

          {/* Average */}
          <View className="flex-row items-start mb-4">
            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <BarChart3 size={15} color="#172B4D" />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-bold text-slate-700">
                Average Level
              </Text>

              <Text className="text-[10px] text-slate-400 leading-4 mt-1">
                The percentage represents the average water level reported by
                the active monitoring nodes in your barangay.
              </Text>
            </View>
          </View>

          {/* Monitoring Points */}
          <View className="flex-row items-start mb-4">
            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <MapPin size={15} color="#172B4D" />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-bold text-slate-700">
                Monitoring Points
              </Text>

              <Text className="text-[10px] text-slate-400 leading-4 mt-1">
                The average combines readings from monitored locations. Check
                individual nodes when a specific canal area needs attention.
              </Text>
            </View>
          </View>

          {/* Risk Assessment */}
          <View className="flex-row items-start">
            <View className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center">
              <ShieldAlert size={15} color="#172B4D" />
            </View>

            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-bold text-slate-700">
                Assess With Other Indicators
              </Text>

              <Text className="text-[10px] text-slate-400 leading-4 mt-1">
                Water level should be reviewed together with flow rate,
                obstruction status, rainfall, and other available readings.
              </Text>
            </View>
          </View>
        </View>

        {/* =============================== */}
        {/* WHAT TO DO */}
        {/* =============================== */}
        <View className="mt-7 px-1">
          <Text className="text-[12px] font-bold text-[#172B4D]">
            WHAT TO DO
          </Text>

          <Text className="text-[10px] text-slate-400 mt-1 mb-4">
            Use the reading to guide further monitoring of canal conditions.
          </Text>

          {/* Step 1 */}
          <View className="flex-row items-start mb-4">
            <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
              <Text className="text-[9px] font-bold text-white">1</Text>
            </View>

            <Text className="flex-1 text-[10px] leading-4 text-slate-600">
              {`Check the average water level for a quick overview of conditions
              across your barangay's monitored locations.`}
            </Text>
          </View>

          {/* Step 2 */}
          <View className="flex-row items-start mb-4">
            <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
              <Text className="text-[9px] font-bold text-white">2</Text>
            </View>

            <Text className="flex-1 text-[10px] leading-4 text-slate-600">
              Check the map and individual monitoring points if a specific canal
              requires closer assessment.
            </Text>
          </View>

          {/* Step 3 */}
          <View className="flex-row items-start">
            <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
              <Text className="text-[9px] font-bold text-white">3</Text>
            </View>

            <Text className="flex-1 text-[10px] leading-4 text-slate-600">
              Compare the reading with other available monitoring information
              before deciding whether further action is necessary.
            </Text>
          </View>
        </View>

        {/* =============================== */}
        {/* MONITORING REMINDER */}
        {/* =============================== */}
        <View className="mt-6 flex-row items-start rounded-xl border border-slate-200 bg-white p-3">
          <ClipboardCheck size={15} color="#64748B" strokeWidth={2} />

          <View className="ml-2 flex-1">
            <Text className="text-[10px] font-bold text-[#173A70]">
              MONITORING REMINDER
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-500">
              A higher or changing water-level reading does not automatically
              mean that a canal is unsafe or obstructed. Review the other
              available indicators and verify conditions when necessary.
            </Text>
          </View>
        </View>

        {/* =============================== */}
        {/* IMPORTANT NOTE */}
        {/* =============================== */}
        <View className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <Text className="text-[10px] font-bold text-[#173A70]">
            IMPORTANT
          </Text>

          <Text className="mt-1 text-[10px] leading-4 text-slate-500">
            The average water level represents monitored conditions within your
            barangay. It should not be used by itself to determine the condition
            or risk of a specific canal.
          </Text>
        </View>
      </View>
    </ManualSection>
  );
}
