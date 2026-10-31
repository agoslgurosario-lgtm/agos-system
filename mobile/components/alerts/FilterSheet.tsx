import { useState, useEffect } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AlertTypeFilter, DateFilter } from "../../hooks/useAlerts";

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedType: AlertTypeFilter;
  selectedDate: DateFilter;
  onApply: (type: AlertTypeFilter, date: DateFilter) => void;
}

const TYPE_GROUPS: { title: string; options: { value: AlertTypeFilter; label: string }[] }[] = [
  {
    title: "Clogs",
    options: [
      { value: "Low_Clog_Alert", label: "Low Clog" },
      { value: "Moderate_Clog_Alert", label: "Moderate Clog" },
      { value: "Critical_Clog", label: "Critical Clog" },
    ],
  },
  {
    title: "Water",
    options: [{ value: "Water_Level_Rising", label: "Water Level Rising" }],
  },
  {
    title: "Devices",
    options: [
      { value: "Node_Offline", label: "Node Offline" },
      { value: "Low_Battery", label: "Low Battery" },
      { value: "Weak_Signal", label: "Weak Signal" },
      { value: "Sensor_Failure", label: "Sensor Failure" },
    ],
  },
  {
    title: "Reports",
    options: [
      { value: "Report_Due_Soon", label: "Report Due Soon" },
      { value: "Report_Overdue", label: "Report Overdue" },
    ],
  },
  {
    title: "Waste Types",
    options: [
      { value: "Waste_Type_Rejected", label: "Rejected" },
      { value: "Waste_Type_Approved", label: "Approved" },
    ],
  },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "Today", label: "Today" },
  { value: "7Days", label: "Last 7 days" },
  { value: "30Days", label: "Last 30 days" },
];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 mb-2 px-3.5 py-2 rounded-full border ${
        selected ? "bg-[#7FA9B8] border-[#7FA9B8]" : "bg-white border-slate-200"
      }`}
    >
      <Text className={`text-[13px] ${selected ? "text-white font-semibold" : "text-slate-600"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FilterSheet({
  visible,
  onClose,
  selectedType,
  selectedDate,
  onApply,
}: Props) {
  const [localType, setLocalType] = useState(selectedType);
  const [localDate, setLocalDate] = useState(selectedDate);

  useEffect(() => {
    if (visible) {
      setLocalType(selectedType);
      setLocalDate(selectedDate);
    }
  }, [visible, selectedType, selectedDate]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable
          className="bg-white rounded-t-3xl px-5 pt-5 pb-6"
          style={{ maxHeight: "75%" }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header (fixed) */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <Ionicons name="filter-outline" size={18} color="#122A48" />
              <Text className="ml-2 text-[15px] font-bold text-slate-800">Filter</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Scrollable options */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0 }}>
            <Text className="text-[11px] font-bold text-slate-400 uppercase mb-2">Alert Type</Text>
            <View className="flex-row flex-wrap">
              <Chip label="All" selected={localType === "All"} onPress={() => setLocalType("All")} />
            </View>

            {TYPE_GROUPS.map((group) => (
              <View key={group.title} className="mt-1">
                <Text className="text-[11px] text-slate-400 mb-1.5">{group.title}</Text>
                <View className="flex-row flex-wrap">
                  {group.options.map((opt) => (
                    <Chip
                      key={opt.value}
                      label={opt.label}
                      selected={localType === opt.value}
                      onPress={() => setLocalType(opt.value)}
                    />
                  ))}
                </View>
              </View>
            ))}

            <Text className="text-[11px] font-bold text-slate-400 uppercase mt-4 mb-2">Date Range</Text>
            <View className="flex-row flex-wrap">
              {DATE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={localDate === opt.value}
                  onPress={() => setLocalDate(opt.value)}
                />
              ))}
            </View>
          </ScrollView>

          {/* Apply (fixed) */}
          <Pressable
            className="w-full bg-[#122A48] rounded-lg py-3.5 items-center mt-4"
            onPress={() => {
              onApply(localType, localDate);
              onClose();
            }}
          >
            <Text className="text-white text-[15px] font-semibold">Apply</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}