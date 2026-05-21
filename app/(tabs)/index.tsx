import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";
import { useClothingStore } from "../../src/stores/clothingStore";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { Image } from "expo-image";
import {
  Plus,
  Search,
  Filter,
  X,
} from "lucide-react-native";
import { COLORS, CLOTHING_CATEGORIES, COLOR_OPTIONS, SEASONS } from "../../src/constants/theme";
import type { ClothingItem } from "../../src/types/database";

export default function WardrobeScreen() {
  const user = useAuthStore((s) => s.user);
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedColors,
    toggleColor,
    selectedSeasons,
    toggleSeason,
  } = useClothingStore();
  const [showFilters, setShowFilters] = useState(false);

  const { data: items, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["clothing_items"],
    queryFn: async () => {
      const { data } = await api.clothing.list();
      return (data as ClothingItem[]) || [];
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const filteredItems = (items || []).filter((item) => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedCategory && item.category !== selectedCategory) {
      return false;
    }
    if (selectedColors.length > 0) {
      const hasColor = item.colors.some((c) =>
        selectedColors.some((sc) => c.toLowerCase().includes(sc.toLowerCase()))
      );
      if (!hasColor) return false;
    }
    if (selectedSeasons.length > 0) {
      const hasSeason = item.seasons.some((s) => selectedSeasons.includes(s));
      if (!hasSeason) return false;
    }
    return true;
  });

  const groupedItems = CLOTHING_CATEGORIES.map((cat) => ({
    ...cat,
    items: filteredItems.filter((i) => i.category === cat.value),
  })).filter((g) => g.items.length > 0 || !selectedCategory);

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <TouchableOpacity
      className="w-[48%] mb-3"
      onPress={() => router.push(`/wardrobe/${item.id}`)}
    >
      <View className="bg-white rounded-2xl overflow-hidden border border-charcoal-100">
        <Image
          source={{ uri: item.removed_bg_url || item.image_url }}
          style={{ width: "100%", aspectRatio: 3 / 4 }}
          contentFit="cover"
          transition={300}
        />
        <View className="p-3">
          <Text className="text-sm font-semibold text-charcoal-900" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row mt-1">
            {item.colors.slice(0, 3).map((color) => (
              <View
                key={color}
                className="w-3 h-3 rounded-full mr-1 border border-charcoal-200"
                style={{ backgroundColor: color }}
              />
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSection = ({ item }: { item: typeof groupedItems[0] }) => {
    if (item.items.length === 0) return null;
    return (
      <View className="mb-4">
        <Text className="text-lg font-bold text-charcoal-900 mb-3">
          {item.label}
        </Text>
        <FlatList
          data={item.items}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          scrollEnabled={false}
        />
      </View>
    );
  };

  return (
    <View className="flex-1 bg-ivory-200">
      {/* Header */}
      <View className="pt-14 pb-4 px-5 bg-ivory-200">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-3xl font-bold text-charcoal-900">我的衣橱</Text>
          <TouchableOpacity
            onPress={() => router.push("/wardrobe/add")}
            className="bg-gold-500 w-10 h-10 rounded-full items-center justify-center"
          >
            <Plus size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 flex-row items-center bg-white rounded-xl px-3 py-2 border border-charcoal-100">
            <Search size={18} color="#8C8C84" />
            <TextInput
              className="flex-1 ml-2 text-charcoal-900 text-sm"
              placeholder="搜索衣物..."
              placeholderTextColor="#B0B0AA"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#8C8C84" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className={`w-10 h-10 rounded-xl items-center justify-center ${
              showFilters || selectedCategory || selectedColors.length > 0 || selectedSeasons.length > 0
                ? "bg-gold-500"
                : "bg-white border border-charcoal-100"
            }`}
          >
            <Filter
              size={18}
              color={
                showFilters || selectedCategory || selectedColors.length > 0 || selectedSeasons.length > 0
                  ? "white"
                  : "#8C8C84"
              }
            />
          </TouchableOpacity>
        </View>

        {/* Filter panel */}
        {showFilters && (
          <View className="mt-3 bg-white rounded-2xl p-4 border border-charcoal-100">
            {/* Category */}
            <Text className="text-xs font-semibold text-charcoal-400 mb-2">类别</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full ${
                  !selectedCategory ? "bg-charcoal-900" : "bg-charcoal-100"
                }`}
              >
                <Text className={`text-xs ${!selectedCategory ? "text-white" : "text-charcoal-600"}`}>
                  全部
                </Text>
              </TouchableOpacity>
              {CLOTHING_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() =>
                    setSelectedCategory(selectedCategory === cat.value ? null : cat.value)
                  }
                  className={`px-3 py-1.5 rounded-full ${
                    selectedCategory === cat.value ? "bg-charcoal-900" : "bg-charcoal-100"
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      selectedCategory === cat.value ? "text-white" : "text-charcoal-600"
                    }`}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Colors */}
            <Text className="text-xs font-semibold text-charcoal-400 mb-2">颜色</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c.label}
                  onPress={() => toggleColor(c.label)}
                  className={`px-3 py-1.5 rounded-full border ${
                    selectedColors.includes(c.label)
                      ? "border-charcoal-900 bg-charcoal-900"
                      : "border-charcoal-200 bg-white"
                  }`}
                >
                  <View className="flex-row items-center space-x-1.5">
                    <View
                      className="w-3 h-3 rounded-full border border-charcoal-300"
                      style={{ backgroundColor: c.hex }}
                    />
                    <Text
                      className={`text-xs ${
                        selectedColors.includes(c.label) ? "text-white" : "text-charcoal-600"
                      }`}
                    >
                      {c.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Seasons */}
            <Text className="text-xs font-semibold text-charcoal-400 mb-2">季节</Text>
            <View className="flex-row flex-wrap gap-2">
              {SEASONS.map((s) => (
                <TouchableOpacity
                  key={s.value}
                  onPress={() => toggleSeason(s.value)}
                  className={`px-3 py-1.5 rounded-full ${
                    selectedSeasons.includes(s.value)
                      ? "bg-charcoal-900"
                      : "bg-charcoal-100"
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      selectedSeasons.includes(s.value)
                        ? "text-white"
                        : "text-charcoal-600"
                    }`}
                  >
                    {s.emoji} {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Grid */}
      {filteredItems.length === 0 && !isLoading ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">👔</Text>
          <Text className="text-xl font-semibold text-charcoal-900 mb-2">
            衣橱还是空的
          </Text>
          <Text className="text-charcoal-400 text-center mb-6">
            点击右上角 + 号添加你的第一件衣物
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/wardrobe/add")}
            className="bg-gold-500 px-8 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">添加衣物</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groupedItems}
          renderItem={renderSection}
          keyExtractor={(item) => item.value}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.gold}
            />
          }
        />
      )}
    </View>
  );
}
