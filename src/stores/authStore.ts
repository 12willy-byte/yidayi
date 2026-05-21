import { create } from "zustand";
import { api, setToken, clearToken, getStoredToken } from "../lib/api";
import type { Profile } from "../types/database";

interface UserInfo {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  wechat_openid?: string;
  wechat_nickname?: string;
  wechat_avatar_url?: string;
}

interface AuthState {
  user: UserInfo | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: UserInfo | null) => void;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    const { data } = await api.profile.get();
    if (data) {
      set({ profile: data as Profile });
    }
  },

  signOut: async () => {
    await clearToken();
    set({ user: null, profile: null, isAuthenticated: false });
  },

  initialize: async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const { data } = await api.auth.me();
      if (data?.user) {
        set({
          user: data.user,
          isAuthenticated: true,
        });
        await get().fetchProfile();
      } else {
        await clearToken();
      }
    } catch {
      // Server not available
    } finally {
      set({ isLoading: false });
    }
  },
}));
