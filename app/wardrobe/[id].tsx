import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { api } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Tag,
  Palette,
  Sun,
  ShoppingBag,
} from "lucide-react-native";
import { CLOTHING_CATEGORIES, SEASONS } from "../../src/constants/theme";
import type { ClothingItem } from "../../src/types/database";

export default function ClothingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [deleting, setDeleting] = useState(false);

  const { data: item, isLoading } = useQuery({
    queryKey: ["clothing_item", id],
    queryFn: async () => {
      const { data } = await api.clothing.get(id!);
      return data as ClothingItem;
    },
    enabled: !!id,
  });

  const handleDelete = () => {
    Alert.alert("删除衣物", "确定要从衣橱中移除此衣物吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await api.clothing.delete(id!);
            router.back();
          } catch (err: any) {
            Alert.alert("错误", err.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-ivory-200 items-center justify-center">
        <ActivityIndicator size="large" color="#D4A83A" />
      </View>
    );
  }

  if (!item) {
    return (
      <View className="flex-1 bg-ivory-200 items-center justify-center">
        <Text className="text-charcoal-400">衣物不存在</Text>
      </View>
    );
  }

  const categoryLabel = CLOTHING_CATEGORIES.find((c) => c.value === item.category)?.label;

  return (
    <View className="flex-1 bg-ivory-200">
      {/* Header */}
      <View className="pt-14 px-5 flex-row items-center justify-between absolute top-0 left-0 right-0 z-10">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-white/80 rounded-full items-center justify-center"
        >
          <ArrowLeft size={22} color="#2A2A25" />
        </TouchableOpacity>
        <View className="flex-row space-x-2">
          <TouchableOpacity className="w-10 h-10 bg-white/80 rounded-full items-center justify-center">
            <Pencil size={20} color="#2A2A25" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            className="w-10 h-10 bg-white/80 rounded-full items-center justify-center"
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Trash2 size={20} color="#DC2626" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <Image
          source={{ uri: item.removed_bg_url || item.image_url }}
          style={{ width: "100%", aspectRatio: 3 / 4 }}
          contentFit="cover"
          transition={500}
        />

        <View className="px-5 py-6">
          {/* Name & Category */}
          <Text className="text-2xl font-bold text-charcoal-900">{item.name}</Text>
          <View className="flex-row items-center mt-2">
            <View className="bg-gold-100 px-3 py-1 rounded-full">
              <Text className="text-gold-700 text-sm">{categoryLabel}</Text>
            </View>
          </View>

          {/* Colors */}
          <View className="mt-6">
            <View className="flex-row items-center mb-3">
              <Palette size={18} color="#8C8C84" />
              <Text className="ml-2 text-sm font-semibold text-charcoal-400">
                颜色
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {item.colors.map((color) => (
                <View
                  key={color}
                  className="flex-row items-center bg-white px-3 py-2 rounded-lg border border-charcoal-100"
                >
                  <View
                    className="w-4 h-4 rounded-full mr-2 border border-charcoal-200"
                    style={{ backgroundColor: color }}
                  />
                  <Text className="text-charcoal-600">{color}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Seasons */}
          <View className="mt-5">
            <View className="flex-row items-center mb-3">
              <Sun size={18} color="#8C8C84" />
              <Text className="ml-2 text-sm font-semibold text-charcoal-400">
                季节
              </Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {item.seasons.map((season) => {
                const s = SEASONS.find((x) => x.value === season);
                return (
                  <View
                    key={season}
                    className="bg-white px-3 py-2 rounded-lg border border-charcoal-100"
                  >
                    <Text className="text-charcoal-600">
                      {s?.emoji} {s?.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Brand */}
          {item.brand && (
            <View className="mt-5">
              <View className="flex-row items-center mb-3">
                <ShoppingBag size={18} color="#8C8C84" />
                <Text className="ml-2 text-sm font-semibold text-charcoal-400">
                  品牌
                </Text>
              </View>
              <View className="bg-white px-3 py-2 rounded-lg border border-charcoal-100">
                <Text className="text-charcoal-600">{item.brand}</Text>
              </View>
            </View>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <View className="mt-5">
              <View className="flex-row items-center mb-3">
                <Tag size={18} color="#8C8C84" />
                <Text className="ml-2 text-sm font-semibold text-charcoal-400">
                  标签
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <View
                    key={tag}
                    className="bg-gold-50 px-3 py-2 rounded-full"
                  >
                    <Text className="text-gold-700 text-sm">#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
