import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { Leaf, Recycle, Trash2, Package } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function EstimatedWasteVolume({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const estimatedWasteVolumeImage = require("../../../assets/images/userManual/analytics/estimated-waste-volume.png");

  return (
    <>
      <ManualSection
        number={2}
        title="ESTIMATED WASTE VOLUME"
        description="Review the estimated volume of waste recorded for each category."
        icon={<Leaf size={18} color="#16A34A" />}
        expanded={expanded}
        onPress={onPress}
      >
        <View className="px-5">
          {/* ================================================= */}
          {/* SCREENSHOT */}
          {/* ================================================= */}

          <View className="mt-2">
            <Pressable
              onPress={() => setIsImageVisible(true)}
              className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
            >
              <View className="relative">
                <Image
                  source={estimatedWasteVolumeImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 250,
                    backgroundColor: "#F8FAFC",
                  }}
                />

                <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
                  <Text className="text-[10px] font-semibold text-white">
                    🔍 Tap to enlarge
                  </Text>
                </View>
              </View>

              <View className="border-t border-slate-100 px-4 py-3">
                <Text className="text-center text-xs font-semibold text-slate-700">
                  Estimated Waste Volume
                </Text>

                <Text className="mt-1 text-center text-[10px] text-slate-400">
                  Tap to zoom and explore the waste categories
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* DESCRIPTION */}
          {/* ================================================= */}

          <View className="mt-5">
            <Text className="text-[13px] font-bold text-[#203D70]">
              Waste Categories
            </Text>

            <Text className="mt-1 text-[10px] leading-5 text-slate-500">
              The estimated waste volume section groups the recorded waste into
              different categories.
            </Text>
          </View>

          {/* ================================================= */}
          {/* CATEGORY CARDS */}
          {/* ================================================= */}

          <View className="mt-3">
            {/* BIODEGRADABLE */}

            <View className="mb-2 flex-row rounded-2xl border border-slate-200 bg-white p-3">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-green-50">
                <Leaf size={17} color="#16A34A" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Biodegradable
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Waste that can naturally decompose.
                </Text>
              </View>
            </View>

            {/* RECYCLABLE */}

            <View className="mb-2 flex-row rounded-2xl border border-slate-200 bg-white p-3">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
                <Recycle size={17} color="#2563EB" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Recyclable
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Materials that may be processed and reused.
                </Text>
              </View>
            </View>

            {/* RESIDUAL */}

            <View className="mb-2 flex-row rounded-2xl border border-slate-200 bg-white p-3">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                <Trash2 size={17} color="#64748B" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Residual
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Waste that does not fall under the other categories.
                </Text>
              </View>
            </View>

            {/* SPECIAL WASTE */}

            <View className="flex-row rounded-2xl border border-slate-200 bg-white p-3">
              <View className="mr-3 h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
                <Package size={17} color="#D97706" />
              </View>

              <View className="flex-1">
                <Text className="text-[11px] font-bold text-slate-700">
                  Special Waste
                </Text>

                <Text className="mt-1 text-[10px] leading-4 text-slate-500">
                  Waste requiring special handling or disposal.
                </Text>
              </View>
            </View>
          </View>

          {/* ================================================= */}
          {/* KEY POINT */}
          {/* ================================================= */}

          <View className="mt-5">
            <ManualStep
              number={1}
              text="Compare the estimated amount of Biodegradable, Recyclable, Residual, and Special Waste."
            />
          </View>
        </View>
      </ManualSection>

      {/* ================================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(estimatedWasteVolumeImage).uri,
          },
        ]}
        imageIndex={0}
        visible={isImageVisible}
        onRequestClose={() => setIsImageVisible(false)}
        presentationStyle="fullScreen"
        backgroundColor="#0F172A"
      />
    </>
  );
}
