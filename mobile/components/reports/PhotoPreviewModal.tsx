import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, FlatList, Image, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";

const MAX_SCALE = 10;
const DOUBLE_TAP_SCALE = 2.5;

function clamp(value: number, limit: number) {
  "worklet";
  return Math.min(Math.max(value, -limit), limit);
}

function ZoomableImage({ uri, width, height, onZoomChange }: {
  uri: string;
  width: number;
  height: number;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const [zoomed, setZoomed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const handleZoomChange = (value: boolean) => {
    setZoomed(value);
    onZoomChange(value);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // keep the photo inside the screen after zooming (at scale 1 this snaps back to center)
      const limitX = ((scale.value - 1) * width) / 2;
      const limitY = ((scale.value - 1) * height) / 2;
      const x = clamp(translateX.value, limitX);
      const y = clamp(translateY.value, limitY);
      translateX.value = withTiming(x);
      translateY.value = withTiming(y);
      savedTranslateX.value = x;
      savedTranslateY.value = y;
      runOnJS(handleZoomChange)(scale.value > 1);
    });

  // dragging only does anything while zoomed in; at 1x the swipe goes to the photo list instead
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onUpdate((e) => {
      const limitX = ((scale.value - 1) * width) / 2;
      const limitY = ((scale.value - 1) * height) / 2;
      translateX.value = clamp(savedTranslateX.value + e.translationX, limitX);
      translateY.value = clamp(savedTranslateY.value + e.translationY, limitY);
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(handleZoomChange)(false);
      } else {
        scale.value = withTiming(DOUBLE_TAP_SCALE);
        savedScale.value = DOUBLE_TAP_SCALE;
        runOnJS(handleZoomChange)(true);
      }
    });

  const gesture = Gesture.Simultaneous(doubleTap, pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, animatedStyle]}>
        <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

interface PhotoPreviewModalProps {
  visible: boolean;
  photos: { uri: string }[];
  initialIndex?: number;
  onClose: () => void;
}

export function PhotoPreviewModal({ visible, photos, initialIndex = 0, onClose }: PhotoPreviewModalProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(initialIndex);
  const [areaHeight, setAreaHeight] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (visible) {
      setIndex(initialIndex);
      setZoomed(false);
    }
  }, [visible, initialIndex]);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Android needs its own gesture root inside a Modal, or the gestures never fire */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "black" }}>
        <SafeAreaView className="flex-1" edges={["top", "bottom"]}>
          <View className="flex-row items-center justify-between px-4 py-3">
            <Text className="text-[13px] font-semibold text-white">
              {photos.length > 0 ? `${index + 1} / ${photos.length}` : ""}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <MaterialCommunityIcons name="close" size={26} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-1" onLayout={(e) => setAreaHeight(e.nativeEvent.layout.height)}>
            {areaHeight > 0 && photos.length > 0 && (
              <FlatList
                data={photos}
                keyExtractor={(item, i) => `${item.uri}-${i}`}
                horizontal
                pagingEnabled
                // while a photo is zoomed, dragging moves the photo instead of swiping to the next one
                scrollEnabled={!zoomed}
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={Math.min(initialIndex, photos.length - 1)}
                getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
                onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                renderItem={({ item }) => (
                  <ZoomableImage
                    uri={item.uri}
                    width={width}
                    height={areaHeight}
                    onZoomChange={setZoomed}
                  />
                )}
              />
            )}
          </View>
        </SafeAreaView>
      </GestureHandlerRootView>
    </Modal>
  );
}