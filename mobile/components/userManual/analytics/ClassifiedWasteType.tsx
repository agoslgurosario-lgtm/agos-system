import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { BarChart3, Leaf, Recycle, Trash2, Package } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function ClassifiedWasteType({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const classifiedWasteImage = require("../../../assets/images/userManual/analytics/classified-waste-type.png");

  return (
    <>
      <ManualSection
        number={4}
        title="CLASSIFIED WASTE TYPE"
        description="Review the percentage distribution of each recorded waste category."
        icon={<BarChart3 size={18} color="#203D70" />}
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
                  source={classifiedWasteImage}
                  resizeMode="contain"
                  style={{
                    width: "100%",
                    height: 230,
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
                  Classified Waste Type
                </Text>

                <Text className="mt-1 text-center text-[10px] text-slate-400">
                  Tap to zoom and explore the waste distribution
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ================================================= */}
          {/* EXPLANATION */}
          {/* ================================================= */}

          <View className="mt-5">
            <Text className="text-[13px] font-bold text-[#203D70]">
              Understanding the Distribution
            </Text>

            <Text className="mt-1 text-[10px] leading-5 text-slate-500">
              The classified waste type section presents the percentage
              distribution of the recorded waste categories.
            </Text>
          </View>

          {/* ================================================= */}
          {/* LEGEND */}
          {/* ================================================= */}

          <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
            <View className="mb-3 flex-row items-center">
              <Leaf size={15} color="#16A34A" />

              <Text className="ml-2 text-[10px] font-semibold text-slate-700">
                Biodegradable
              </Text>
            </View>

            <View className="mb-3 flex-row items-center">
              <Recycle size={15} color="#3B82F6" />

              <Text className="ml-2 text-[10px] font-semibold text-slate-700">
                Recyclable
              </Text>
            </View>

            <View className="mb-3 flex-row items-center">
              <Trash2 size={15} color="#64748B" />

              <Text className="ml-2 text-[10px] font-semibold text-slate-700">
                Residual
              </Text>
            </View>

            <View className="flex-row items-center">
              <Package size={15} color="#D97706" />

              <Text className="ml-2 text-[10px] font-semibold text-slate-700">
                Special Waste
              </Text>
            </View>
          </View>

          {/* ================================================= */}
          {/* KEY POINT */}
          {/* ================================================= */}

          <View className="mt-5">
            <ManualStep
              number={1}
              text="Compare the percentages to identify which type of waste makes up the largest portion of the recorded waste."
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
            uri: Image.resolveAssetSource(classifiedWasteImage).uri,
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
