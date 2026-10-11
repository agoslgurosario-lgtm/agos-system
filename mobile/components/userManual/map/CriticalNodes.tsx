import React from "react";
import { Text, View } from "react-native";
import {
  TriangleAlert,
  MapPin,
  Activity,
  UsersRound,
  ClipboardCheck,
  SearchCheck,
} from "lucide-react-native";

import ManualSection from "../common/ManualSection";

type Props = {
  expanded: boolean;
  onPress: () => void;
};
export default function CriticalNodes({ expanded, onPress }: Props) {
  return (
    <ManualSection
      number={5}
      title="CRITICAL NODES"
      description="Displays monitoring locations in your barangay where detected conditions require prompt attention."
      icon={<TriangleAlert size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      <View className="mt-5 px-5">
        {/* =============================== */}
        {/* INTRODUCTION */}
        {/* =============================== */}
        <View className="mb-5 px-1">
          <Text className="text-[11px] leading-5 text-slate-600">
            Critical nodes are monitoring locations in your barangay where
            sensor readings or reported conditions indicate a potentially
            serious canal condition. These locations should be given priority
            for assessment and appropriate response.
          </Text>
        </View>

        {/* =============================== */}
        {/* CRITICAL NODES CARD */}
        {/* KEEPING YOUR ORIGINAL CARD */}
        {/* =============================== */}
        <View className="mx-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <View className="flex-row items-center">
            <TriangleAlert size={17} color="#172B4D" strokeWidth={2} />

            <Text className="ml-2 text-[13px] font-bold text-[#172B4D]">
              Critical Nodes
            </Text>
          </View>

          <Text className="mt-1 text-[28px] font-bold text-[#172B4D]">1</Text>

          <Text className="text-[10px] text-red-500">
            Immediate action is needed
          </Text>
        </View>

        {/* =============================== */}
        {/* WHAT A CRITICAL NODE MEANS */}
        {/* =============================== */}
        <View className="mt-7 px-1">
          <Text className="mb-1 text-[13px] font-bold text-[#172B4D]">
            What a Critical Node Means
          </Text>

          <Text className="mb-5 text-[10px] leading-4 text-slate-500">
            The indicator highlights locations in your barangay that may require
            closer assessment based on available monitoring data.
          </Text>

          {/* Location */}
          <View className="mb-4 flex-row items-start">
            <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <MapPin size={14} color="#173A70" strokeWidth={2} />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-700">
                Affected Location
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                The critical node identifies a specific monitored canal location
                within your barangay.
              </Text>
            </View>
          </View>

          {/* Monitoring Condition */}
          <View className="mb-4 flex-row items-start">
            <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <Activity size={14} color="#173A70" strokeWidth={2} />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-700">
                Detected Condition
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Review the latest sensor readings and available information to
                understand the condition affecting the location.
              </Text>
            </View>
          </View>

          {/* Priority */}
          <View className="flex-row items-start">
            <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <SearchCheck size={14} color="#173A70" strokeWidth={2} />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-700">
                Priority Attention
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                A critical status indicates that the location should be reviewed
                promptly and may require field verification.
              </Text>
            </View>
          </View>
        </View>

        {/* =============================== */}
        {/* RESPONSE WORKFLOW */}
        {/* =============================== */}
        <View className="mt-7 px-1">
          <Text className="mb-1 text-[13px] font-bold text-[#172B4D]">
            Recommended Response
          </Text>

          <Text className="mb-4 text-[10px] leading-4 text-slate-500">
            Follow these steps when a critical node is identified in your
            barangay.
          </Text>

          {/* Step 1 */}
          <View className="mb-4 flex-row items-start">
            <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
              <Text className="text-[9px] font-bold text-white">1</Text>
            </View>

            <Text className="flex-1 text-[10px] leading-4 text-slate-600">
              Locate the critical node on the map and check its latest
              monitoring information.
            </Text>
          </View>

          {/* Step 2 */}
          <View className="mb-4 flex-row items-start">
            <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
              <Text className="text-[9px] font-bold text-white">2</Text>
            </View>

            <Text className="flex-1 text-[10px] leading-4 text-slate-600">
              Assess the reported condition and determine whether on-site
              verification is necessary.
            </Text>
          </View>

          {/* Step 3 */}
          <View className="mb-4 flex-row items-start">
            <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
              <Text className="text-[9px] font-bold text-white">3</Text>
            </View>

            <Text className="flex-1 text-[10px] leading-4 text-slate-600">
              Coordinate with the appropriate personnel to inspect and respond
              to the affected location.
            </Text>
          </View>

          {/* Step 4 */}
          <View className="flex-row items-start">
            <View className="mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-[#173A70]">
              <Text className="text-[9px] font-bold text-white">4</Text>
            </View>

            <Text className="flex-1 text-[10px] leading-4 text-slate-600">
              Record or update the response outcome after the condition has been
              verified and addressed.
            </Text>
          </View>
        </View>

        {/* =============================== */}
        {/* FIELD VERIFICATION */}
        {/* =============================== */}
        <View className="mt-6 flex-row items-start rounded-xl border border-slate-200 bg-white p-3">
          <ClipboardCheck size={15} color="#64748B" strokeWidth={2} />

          <View className="ml-2 flex-1">
            <Text className="text-[10px] font-bold text-[#173A70]">
              FIELD VERIFICATION
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-500">
              A critical status is based on available system information. Verify
              the actual canal condition on-site before carrying out field
              operations.
            </Text>
          </View>
        </View>

        {/* =============================== */}
        {/* IMPORTANT NOTE */}
        {/* =============================== */}
        <View className="mt-4 flex-row items-start rounded-xl border border-slate-200 bg-slate-50 p-3">
          <UsersRound size={15} color="#64748B" strokeWidth={2} />

          <View className="ml-2 flex-1">
            <Text className="text-[10px] font-bold text-[#173A70]">
              COORDINATION
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-500">
              Use the critical node information to coordinate with the personnel
              responsible for inspection and response within the barangay.
            </Text>
          </View>
        </View>
      </View>
    </ManualSection>
  );
}
