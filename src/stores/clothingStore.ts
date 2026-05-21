import { create } from "zustand";
import { api } from "../lib/api";
import type { ClothingItem } from "../types/database";

interface ClothingStore {
  items: ClothingItem[];
  isLoading: boolean;
  searchQuery: string;
  selectedCategory: string | null;
  selectedColors: string[];
  selectedSeasons: string[];

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string | null) => void;
  setSelectedColors: (colors: string[]) => void;
  setSelectedSeasons: (seasons: string[]) => void;
  toggleColor: (color: string) => void;
  toggleSeason: (season: string) => void;
  fetchItems: (userId: string) => Promise<void>;
  addItem: (item: ClothingItem) => void;
  updateItem: (item: ClothingItem) => void;
  removeItem: (id: string) => void;
}

export const useClothingStore = create<ClothingStore>((set, get) => ({
  items: [],
  isLoading: false,
  searchQuery: "",
  selectedCategory: null,
  selectedColors: [],
  selectedSeasons: [],

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setSelectedColors: (selectedColors) => set({ selectedColors }),
  setSelectedSeasons: (selectedSeasons) => set({ selectedSeasons }),

  toggleColor: (color) => {
    const colors = get().selectedColors;
    set({
      selectedColors: colors.includes(color)
        ? colors.filter((c) => c !== color)
        : [...colors, color],
    });
  },

  toggleSeason: (season) => {
    const seasons = get().selectedSeasons;
    set({
      selectedSeasons: seasons.includes(season)
        ? seasons.filter((s) => s !== season)
        : [...seasons, season],
    });
  },

  fetchItems: async (_userId?: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.clothing.list();
      set({ items: (data as ClothingItem[]) || [] });
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: (item) =>
    set((state) => ({ items: [item, ...state.items] })),

  updateItem: (item) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === item.id ? item : i)),
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
}));
