import React from "react";
import { Text, View } from "react-native";
import { Activity } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

const summaryCards = [
  {
    title: "Total Readings",
    value: "261",
    color: "#203D70",
  },
  {
    title: "Normal",
    value: "46",
    color: "#16A05D",
  },
  {
    title: "Warning",
    value: "39",
    color: "#F59E0B",
  },
  {
    title: "Critical",
    value: "176",
    color: "#DC2626",
  },
];

export default function SensorReadingSummary({ expanded, onPress }: Props) {
  return (
    <ManualSection
      number={2}
      title="READING SUMMARY CARDS"
      description="View an overview of recorded sensor readings and their status classifications."
      icon={<Activity size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      <View className="mt-5 px-5">
        <Text className="mb-4 text-sm leading-6 text-slate-600">
          The summary cards provide a quick overview of the total recorded
          readings and the number of readings under each status classification.
        </Text>

        {/* Summary Cards */}
        <View className="flex-row flex-wrap justify-between">
          {summaryCards.map((card) => (
            <View
              key={card.title}
              className="mb-4 w-[48%] rounded-2xl border border-slate-200 bg-white p-5"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text className="text-sm font-semibold text-slate-500">
                {card.title}
              </Text>

              <Text
                className="mt-2 text-3xl font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Understanding Summary Cards */}
      <View className="mt-2 px-4">
        <Text className="mb-3 text-sm font-bold text-[#203D70]">
          UNDERSTANDING THE SUMMARY CARDS
        </Text>

        <ManualStep number={1}>
          <Text>
            The Total Readings card shows the total number of recorded sensor
            readings.
          </Text>
        </ManualStep>
        <ManualStep number={2}>
          <Text>
            Normal indicates the number of readings classified as normal, which
            means the canal conditions are within acceptable limits.
          </Text>
        </ManualStep>

        <ManualStep number={3}>
          <Text>
            Warning indicates the number of readings that require attention,
            suggesting that the canal conditions may be approaching critical
            levels.
          </Text>
        </ManualStep>

        <ManualStep number={4}>
          <Text>
            Critical displays the number of readings classified as critical,
            indicating that immediate action may be required to address severe
            canal conditions.
          </Text>
        </ManualStep>
      </View>

      {/* Tip */}
      <View className="mx-5 mt-5">
        <ManualTip>
          Check the summary counts first to identify how many readings may need
          attention before reviewing individual sensor records.
        </ManualTip>
      </View>
    </ManualSection>
  );
}
