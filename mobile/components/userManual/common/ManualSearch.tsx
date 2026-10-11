import { Search, X } from "lucide-react-native";
import { Pressable, TextInput, View } from "react-native";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
};

export default function ManualSearch({ value, onChangeText }: Props) {
  return (
    <View className="mx-5 mt-4 mb-3 h-[48px] rounded-2xl bg-white border border-slate-200 flex-row items-center px-4">
      <Search size={19} color="#94A3B8" />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search the manual..."
        placeholderTextColor="#94A3B8"
        className="flex-1 ml-3 text-[12px] text-slate-700"
        returnKeyType="search"
      />

      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText("")}
          className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
        >
          <X size={14} color="#64748B" />
        </Pressable>
      )}
    </View>
  );
}
