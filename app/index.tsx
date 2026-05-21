import { useEffect } from "react";
import { Redirect } from "expo-router";
import { View, ActivityIndicator, Text } from "react-native";
import { useAuthStore } from "../src/stores/authStore";
import { useOnboardingStore } from "../src/stores/onboardingStore";

export default function Index() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);
  const checkOnboarding = useOnboardingStore((s) => s.checkOnboarding);
  const onboardingLoading = useOnboardingStore((s) => s.isLoading);

  useEffect(() => {
    checkOnboarding();
  }, []);

  if (isLoading || onboardingLoading) {
    return (
      <View className="flex-1 bg-ivory-200 items-center justify-center">
        <ActivityIndicator size="large" color="#D4A83A" />
        <Text className="mt-4 text-charcoal-600 text-base">衣搭衣</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!hasSeenOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)" />;
}
