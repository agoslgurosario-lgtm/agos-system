import React from "react";
import { Text, View } from "react-native";
import {
  ShieldAlert,
  MapPin,
  ClipboardCheck,
  UserRound,
  SearchCheck,
  Waves,
  FileCheck2,
  Ban,
} from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};
export default function ObstructedCanals({ expanded, onPress }: Props) {
  return (
    <ManualSection
      number={6}
      title="OBSTRUCTED CANALS"
      description="Monitor canal obstructions in your barangay and follow the appropriate response process."
      icon={<Ban size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      <View className="mt-5 px-5">
        {/* =============================== */}
        {/* INTRODUCTION */}
        {/* =============================== */}
        <View className="mb-5 px-1">
          <Text className="text-[11px] leading-5 text-slate-600">
            This section helps you identify canals in your barangay where an
            obstruction has been detected or reported. Use the available
            monitoring information to determine which locations need
            verification, coordination, and response.
          </Text>
        </View>

        {/* =============================== */}
        {/* EXISTING CARD — DO NOT CHANGE */}
        {/* =============================== */}
        <View className="bg-white rounded-2xl p-4 border border-slate-200">
          <View className="flex-row items-center">
            <Waves size={16} color="#172B4D" />

            <Text className="ml-2 text-[13px] font-bold text-slate-700">
              Obstructed Canals
            </Text>
          </View>

          <Text className="text-[28px] font-bold text-[#172B4D] mt-1">1</Text>

          <Text className="text-[10px] text-slate-400">
            1 awaiting response
          </Text>
        </View>

        {/* =============================== */}
        {/* UNDERSTANDING THE STATUS */}
        {/* =============================== */}
        <View className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <View className="mb-2 flex-row items-center">
            <ShieldAlert size={16} color="#172B4D" />

            <Text className="ml-2 text-[12px] font-bold text-[#172B4D]">
              UNDERSTANDING THE STATUS
            </Text>
          </View>

          <Text className="text-[11px] leading-5 text-slate-500">
            An obstructed canal is a monitored location in your barangay where
            an obstruction has been detected or reported. An “awaiting response”
            status means the obstruction has not yet been verified, addressed,
            or marked as resolved in the system.
          </Text>
        </View>

        {/* =============================== */}
        {/* RESPONSE WORKFLOW */}
        {/* =============================== */}
        <View className="mt-7">
          <Text className="mb-1 text-[12px] font-bold text-[#172B4D]">
            RESPONSE WORKFLOW
          </Text>

          <Text className="mb-4 text-[10px] text-slate-400">
            Follow these steps when an obstructed canal is identified.
          </Text>

          <ManualStep
            number={1}
            text="Locate the affected canal on the map and confirm the reported location."
          />

          <ManualStep
            number={2}
            text="Review the available risk level, sensor readings, and reported condition."
          />

          <ManualStep
            number={3}
            text="Coordinate with the appropriate personnel for inspection and response."
          />

          <ManualStep
            number={4}
            text="Conduct an on-site inspection to verify the actual obstruction and canal condition."
          />

          <ManualStep
            number={5}
            text="Document the response and update the canal status after the appropriate action has been completed."
          />
        </View>

        {/* =============================== */}
        {/* WHAT TO CHECK FIRST */}
        {/* =============================== */}
        <View className="mt-7 px-1">
          <Text className="mb-1 text-[12px] font-bold text-[#172B4D]">
            WHAT TO CHECK FIRST
          </Text>

          <Text className="mb-4 text-[10px] leading-4 text-slate-400">
            Review these details before coordinating a response.
          </Text>

          {/* Location */}
          <View className="mb-4 flex-row items-start">
            <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <MapPin size={14} color="#173A70" strokeWidth={2} />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-700">
                Location
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Check the map to determine the exact monitored canal location
                affected by the reported obstruction.
              </Text>
            </View>
          </View>

          {/* Condition */}
          <View className="mb-4 flex-row items-start">
            <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <SearchCheck size={14} color="#173A70" strokeWidth={2} />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-700">
                Current Condition
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Review the latest available readings and reported information to
                understand the condition of the canal.
              </Text>
            </View>
          </View>

          {/* Response */}
          <View className="flex-row items-start">
            <View className="mr-3 mt-0.5 h-7 w-7 items-center justify-center rounded-full bg-slate-100">
              <UserRound size={14} color="#173A70" strokeWidth={2} />
            </View>

            <View className="flex-1">
              <Text className="text-[11px] font-semibold text-slate-700">
                Response Coordination
              </Text>

              <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                Coordinate with the appropriate personnel for inspection,
                clearing, and updating of the obstruction status.
              </Text>
            </View>
          </View>
        </View>

        {/* =============================== */}
        {/* RESPONSE STATUS */}
        {/* =============================== */}
        <View className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
          <View className="mb-2 flex-row items-center">
            <FileCheck2 size={16} color="#173A70" strokeWidth={2} />

            <Text className="ml-2 text-[12px] font-bold text-[#172B4D]">
              RESPONSE STATUS
            </Text>
          </View>

          <Text className="text-[10px] leading-4 text-slate-500">
            Keep the obstruction status updated after verification and response.
            This helps ensure that unresolved canal conditions remain visible
            for monitoring and follow-up.
          </Text>
        </View>

        {/* =============================== */}
        {/* FIELD VERIFICATION */}
        {/* =============================== */}
        <View className="mt-5 flex-row items-start rounded-xl border border-slate-200 bg-slate-50 p-3">
          <ClipboardCheck size={15} color="#64748B" strokeWidth={2} />

          <View className="ml-2 flex-1">
            <Text className="text-[11px] font-bold text-slate-700">
              FIELD VERIFICATION
            </Text>

            <Text className="mt-1 text-[10px] leading-4 text-slate-400">
              System detection or reporting indicates a possible obstruction.
              Verify the actual canal condition on-site before clearing the
              obstruction or marking the response as completed.
            </Text>
          </View>
        </View>
      </View>
    </ManualSection>
  );
}
