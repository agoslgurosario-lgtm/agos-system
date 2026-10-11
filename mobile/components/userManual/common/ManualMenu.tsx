import { Check, Menu } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

const filters = [
  "All",
  "Map",
  "Alerts",
  "Analytics",
  "Clog Events",
  "Reports",
  "Profile",
];

type Props = {
  selected: string;
  onSelect: (value: string) => void;
  visible: boolean;
  onClose: () => void;
};

export default function ManualMenu({
  selected,
  onSelect,
  visible,
  onClose,
}: Props) {
  if (!visible) return null;

  return (
    <>
      <Pressable onPress={onClose} className="absolute inset-0 z-40" />

      <View
        className="absolute right-4 top-[68px] z-50 w-[230px] rounded-3xl bg-white p-2"
        style={{
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: {
            width: 0,
            height: 5,
          },
        }}
      >
        <View className="px-3 pt-2 pb-3 flex-row items-center">
          <View className="w-9 h-9 rounded-xl bg-[#E8EEF7] items-center justify-center">
            <Menu size={17} color="#203D70" />
          </View>

          <View className="ml-3">
            <Text className="text-[13px] font-bold text-[#203D70]">
              Manual Sections
            </Text>

            <Text className="text-[9px] text-slate-400">Choose a section</Text>
          </View>
        </View>

        {filters.map((filter, index) => {
          const active = selected === filter;

          return (
            <Pressable
              key={filter}
              onPress={() => {
                onSelect(filter);
                onClose();
              }}
              className="flex-row items-center px-3 py-2.5 rounded-2xl mb-1"
              style={{
                backgroundColor: active ? "#203D70" : "transparent",
              }}
            >
              <View
                className="w-8 h-8 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: active
                    ? "rgba(255,255,255,0.15)"
                    : "#E8EEF7",
                }}
              >
                <Text
                  className="text-[10px] font-bold"
                  style={{
                    color: active ? "#FFFFFF" : "#203D70",
                  }}
                >
                  {index + 1}
                </Text>
              </View>

              <Text
                className="flex-1 ml-3 text-[11px]"
                style={{
                  color: active ? "#FFFFFF" : "#334155",
                  fontWeight: active ? "700" : "500",
                }}
              >
                {filter}
              </Text>

              {active && <Check size={15} color="#FFFFFF" />}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
