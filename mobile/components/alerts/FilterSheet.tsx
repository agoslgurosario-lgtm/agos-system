import { useState, useEffect } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AlertTypeFilter, DateFilter } from "../../hooks/useAlerts";

interface Props {
  visible: boolean;
  onClose: () => void;
  selectedType: AlertTypeFilter;
  selectedDate: DateFilter;
  onApply: (type: AlertTypeFilter, date: DateFilter) => void;
}

const ALERT_TYPE_OPTIONS: { value: AlertTypeFilter; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Low_Clog_Alert", label: "Low Clog" },
  { value: "Moderate_Clog_Alert", label: "Moderate Clog" },
  { value: "Critical_Clog", label: "Critical Clog" },
  { value: "Water_Level_Rising", label: "Water Level Rising" },
  { value: "Waste_Type_Rejected", label: "Waste Type Rejected" },
];

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: "Today", label: "Today" },
  { value: "7Days", label: "Last 7 days" },
  { value: "30Days", label: "Last 30 days" },
];

function RadioRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 border-b border-slate-100"
    >
      <View
        className={`w-5 h-5 rounded-full border-2 items-center justify-center mr-3 ${
          selected ? "border-[#7FA9B8]" : "border-slate-300"
        }`}
      >
        {selected && <View className="w-2.5 h-2.5 rounded-full bg-[#7FA9B8]" />}
      </View>
      <Text className={`text-[14px] ${selected ? "font-semibold text-slate-800" : "text-slate-600"}`}>
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
    <Modal transparent visible={visible} animationType="slide">
      <Pressable className="flex-1 bg-black/35 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl p-5" onPress={(e) => e.stopPropagation()}>
          {/* Header */}

          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Ionicons name="filter-outline" size={18} color="#122A48" />
              <Text className="ml-2 text-[15px] font-bold text-slate-800">
                Filter
              </Text>
            </View>

            <Pressable onPress={onClose}>
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          {/* Alert Type */}

          <Text className="text-[11px] font-bold text-slate-400 uppercase mb-1">
            Alert Type
          </Text>
          {ALERT_TYPE_OPTIONS.map((opt) => (
            <RadioRow
              key={opt.value}
              label={opt.label}
              selected={localType === opt.value}
              onPress={() => setLocalType(opt.value)}
            />
          ))}

          {/* Date Range */}

          <Text className="text-[11px] font-bold text-slate-400 uppercase mt-4 mb-1">
            Date Range
          </Text>
          {DATE_OPTIONS.map((opt) => (
            <RadioRow
              key={opt.value}
              label={opt.label}
              selected={localDate === opt.value}
              onPress={() => setLocalDate(opt.value)}
            />
          ))}

          {/* Apply */}

          <Pressable
            className="w-full bg-[#122A48] rounded-lg py-3.5 items-center mt-5"
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