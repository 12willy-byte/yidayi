import { useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { useOnboardingStore } from "../src/stores/onboardingStore";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

const STEPS = [
  {
    id: "1",
    title: "欢迎来到衣搭衣",
    description: "你的AI智能衣橱助手\n拍照录入衣物，轻松管理你的衣橱",
    emoji: "👗",
  },
  {
    id: "2",
    title: "AI 智能搭配",
    description: "根据场合、天气和你的喜好\n自动生成完美搭配方案",
    emoji: "✨",
  },
  {
    id: "3",
    title: "虚拟试穿",
    description: "无需换装即可预览搭配效果\n看看哪套最适合你",
    emoji: "🪞",
  },
  {
    id: "4",
    title: "搭配日记",
    description: "记录每日穿搭\n发现你的专属风格",
    emoji: "📔",
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);

  const handleNext = () => {
    if (currentIndex < STEPS.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentIndex(nextIndex);
    }
  };

  const handleFinish = async () => {
    await completeOnboarding();
    router.replace("/(tabs)");
  };

  const onScroll = (event: any) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
  };

  const onMomentumScrollEnd = (event: any) => {
    const idx = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  return (
    <View className="flex-1 bg-ivory-200">
      <FlatList
        ref={flatListRef}
        data={STEPS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item, index }) => (
          <View style={{ width }} className="flex-1 items-center justify-center px-10">
            <Animated.Text
              className="text-8xl mb-10"
              style={{
                opacity: interpolate(
                  scrollX.value,
                  [(index - 1) * width, index * width, (index + 1) * width],
                  [0, 1, 0]
                ),
              }}
            >
              {item.emoji}
            </Animated.Text>
            <Text className="text-3xl font-bold text-charcoal-900 text-center mb-4">
              {item.title}
            </Text>
            <Text className="text-lg text-charcoal-500 text-center leading-7">
              {item.description}
            </Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />

      {/* Dot indicators */}
      <View className="flex-row justify-center items-center mb-8">
        {STEPS.map((_, index) => (
          <View
            key={index}
            className={`h-2 rounded-full mx-1 ${
              index === currentIndex
                ? "w-6 bg-gold-500"
                : "w-2 bg-charcoal-200"
            }`}
          />
        ))}
      </View>

      {/* Bottom button */}
      <View className="px-8 pb-12">
        {currentIndex < STEPS.length - 1 ? (
          <View className="flex-row justify-between">
            <TouchableOpacity onPress={handleFinish}>
              <Text className="text-charcoal-400 text-base py-4">跳过</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              className="bg-charcoal-900 px-10 py-4 rounded-full"
            >
              <Text className="text-ivory-200 font-semibold text-base">
                下一步
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleFinish}
            className="bg-gold-500 py-4 rounded-full items-center"
          >
            <Text className="text-white font-bold text-lg">开始使用</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
