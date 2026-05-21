import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  checkOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const ONBOARDING_KEY = "yidayi_onboarding_complete";

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  isLoading: true,

  checkOnboarding: async () => {
    try {
      const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
      set({ hasSeenOnboarding: value === "true", isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  completeOnboarding: async () => {
    try {
      await SecureStore.setItemAsync(ONBOARDING_KEY, "true");
      set({ hasSeenOnboarding: true });
    } catch {
      // no-op
    }
  },
}));
