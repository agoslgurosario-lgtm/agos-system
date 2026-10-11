import { Menu, ChevronLeft } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";

type Props = {
  onBack: () => void;
  onMenu: () => void;
  currentSection: string;
};

export default function ManualHeader({
  onBack,
  onMenu,
  currentSection,
}: Props) {
  return (
    <View className="h-[64px] px-4 flex-row items-center justify-between bg-[#EEF3F8] border-b border-slate-200">
      <Pressable
        onPress={onBack}
        className="w-10 h-10 rounded-full items-center justify-center"
      >
        <ChevronLeft size={25} color="#203D70" />
      </Pressable>

      <View className="items-center flex-1">
        <Text className="text-[17px] font-bold text-[#203D70]">
          User Manual
        </Text>

        <Text className="text-[9px] text-slate-400 mt-0.5">
          {currentSection === "All" ? "All Sections" : currentSection}
        </Text>
      </View>

      <Pressable
        onPress={onMenu}
        className="w-10 h-10 rounded-full bg-white items-center justify-center"
      >
        <Menu size={21} color="#203D70" />
      </Pressable>
    </View>
  );
}
