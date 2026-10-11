import { SearchX } from "lucide-react-native";
import { Text, View } from "react-native";

type Props = {
  query: string;
};

export default function ManualEmptyState({ query }: Props) {
  return (
    <View className="bg-white rounded-3xl border border-slate-200 p-8 items-center">
      <View className="w-16 h-16 rounded-2xl bg-[#E8EEF7] items-center justify-center">
        <SearchX size={27} color="#203D70" />
      </View>

      <Text className="text-[17px] font-bold text-[#203D70] mt-4">
        No results found
      </Text>

      <Text className="text-[11px] text-slate-400 text-center leading-5 mt-2">
        {`We couldn't find anything matching "${query}". Try another keyword.`}
      </Text>
    </View>
  );
}
