import React, { useState } from "react";
import { Image, Text, View, Pressable } from "react-native";
import ImageViewing from "react-native-image-viewing";
import { CircleUserRound, MousePointerClick } from "lucide-react-native";

import ManualSection from "../common/ManualSection";
import ManualStep from "../common/ManualStep";
import ManualTip from "../common/ManualTip";

type Props = {
  expanded: boolean;
  onPress: () => void;
};

export default function Profile({ expanded, onPress }: Props) {
  const [isImageVisible, setIsImageVisible] = useState(false);

  const profileImage = require("../../../assets/images/userManual/profile/profile.jpg");

  return (
    <ManualSection
      number={1}
      title="PROFILE"
      description="View your account information, role, assigned barangay, account status, and access the user manual or log out."
      icon={<CircleUserRound size={18} color="#203D70" />}
      expanded={expanded}
      onPress={onPress}
    >
      {/* ================================= */}
      {/* PROFILE SCREENSHOT */}
      {/* ================================= */}

      <View className="mx-5 mt-5">
        <Pressable
          onPress={() => setIsImageVisible(true)}
          className="overflow-hidden rounded-2xl border border-slate-300 bg-white"
        >
          <View className="relative">
            <Image
              source={profileImage}
              resizeMode="contain"
              className="w-full h-[650px]"
            />

            <View className="absolute bottom-3 right-3 rounded-full bg-slate-900/80 px-3 py-2">
              <Text className="text-[10px] font-semibold text-white">
                🔍 Tap to enlarge
              </Text>
            </View>
          </View>

          <View className="border-t border-slate-100 px-4 py-3">
            <Text className="text-center text-xs font-semibold text-slate-700">
              Profile Screen
            </Text>

            <Text className="mt-1 text-center text-[10px] text-slate-400">
              Tap to zoom and explore the profile page.
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ================================= */}
      {/* PROFILE INSTRUCTIONS */}
      {/* ================================= */}

      <View className="mt-4 px-4">
        <ManualStep
          number={1}
          text="From the bottom navigation bar, tap the Profile tab."
        />

        <ManualStep
          number={2}
          text="The Profile page will open and display the user's account information."
        />

        <ManualStep
          number={3}
          text="Review the displayed name, position, email address, role, assigned barangay, and account status."
        />

        <ManualStep
          number={4}
          text="Tap User Manual to access the system's user manual and instructions."
        />

        <ManualStep
          number={5}
          text="Tap Log Out when you want to securely sign out of the account."
        />
      </View>

      {/* ================================= */}
      {/* ACCOUNT INFORMATION */}
      {/* ================================= */}

      <View className="mx-5 mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <View className="flex-row items-center">
          <MousePointerClick size={17} color="#203D70" />

          <Text className="ml-2 text-[11px] font-bold text-[#203D70]">
            PROFILE INFORMATION
          </Text>
        </View>

        <Text className="mt-2 text-[10px] leading-5 text-slate-600">
          {"The Profile page provides a quick overview of the currently signed-in " +
            "user's account. Information such as the user's name, position, email, " +
            "role, assigned barangay, and account status is displayed."}
        </Text>
      </View>

      {/* ================================= */}
      {/* USER MANUAL & LOG OUT */}
      {/* ================================= */}

      <View className="mx-5 mt-6">
        <Text className="text-[13px] font-bold text-[#203D70]">
          Available Profile Actions
        </Text>

        <Text className="mt-1 text-[10px] leading-4 text-slate-500">
          The Profile page also provides quick access to the User Manual and the
          Log Out function.
        </Text>
      </View>

      {/* ================================= */}
      {/* TIP */}
      {/* ================================= */}

      <View className="mx-5 mt-3">
        <ManualTip>
          Always verify that the displayed account information and assigned
          barangay are correct. Use Log Out when finished using the system,
          especially when accessing the application on a shared device.
        </ManualTip>
      </View>

      {/* ================================= */}
      {/* FULLSCREEN IMAGE VIEWER */}
      {/* ================================= */}

      <ImageViewing
        images={[
          {
            uri: Image.resolveAssetSource(profileImage).uri,
          },
        ]}
        imageIndex={0}
        visible={isImageVisible}
        onRequestClose={() => setIsImageVisible(false)}
        presentationStyle="fullScreen"
        backgroundColor="#0F172A"
      />
    </ManualSection>
  );
}
