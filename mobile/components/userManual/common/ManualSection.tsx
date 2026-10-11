import React, { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown, ChevronUp } from "lucide-react-native";

type Props = {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
  icon?: React.ReactNode;
  expanded?: boolean;
  onPress?: () => void;
};

export default function ManualSection({
  number,
  title,
  description,
  children,
  icon,
  expanded = true,
  onPress,
}: Props) {
  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* ============================= */}
      {/* SECTION HEADER */}
      {/* ============================= */}

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        className={`px-4 ${expanded ? "py-4" : "py-3.5"}`}
      >
        <View className="flex-row items-center">
          {/* NUMBER */}
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#123878]">
            <Text className="text-[15px] font-bold text-white">{number}</Text>
          </View>

          {/* ICON */}
          {icon && <View className="ml-3">{icon}</View>}

          {/* TITLE */}
          <Text
            className="ml-3 flex-1 text-[14px] font-bold text-[#123878]"
            numberOfLines={2}
          >
            {title}
          </Text>

          {/* ARROW */}
          {onPress && (
            <View className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-slate-100">
              {expanded ? (
                <ChevronUp size={17} color="#123878" strokeWidth={2.5} />
              ) : (
                <ChevronDown size={17} color="#123878" strokeWidth={2.5} />
              )}
            </View>
          )}
        </View>

        {/* DESCRIPTION */}
        {expanded && description ? (
          <Text className="ml-12 mt-3 pr-5 text-[10px] leading-4 text-slate-500">
            {description}
          </Text>
        ) : null}
      </Pressable>

      {/* ============================= */}
      {/* SECTION CONTENT */}
      {/* ============================= */}

      {expanded && <View className="pb-2">{children}</View>}
    </View>
  );
}
