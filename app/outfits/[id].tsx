import { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { api } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import {
  ArrowLeft,
  Heart,
  Sparkles,
  Share2,
} from "lucide-react-native";
import type { Outfit } from "../../src/types/database";

export default function OutfitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const { data: outfit, isLoading, refetch } = useQuery({
    queryKey: ["outfit", id],
    queryFn: async () => {
      const { data } = await api.outfits.get(id!);
      return data as any;
    },
    enabled: !!id,
  });

  const handleLike = async () => {
    if (!outfit) return;
    await api.outfits.like(outfit.id);
    refetch();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-ivory-200 items-center justify-center">
        <Text className="text-charcoal-400">加载中...</Text>
      </View>
    );
  }

  if (!outfit) {
    return (
      <View className="flex-1 bg-ivory-200 items-center justify-center">
        <Text className="text-charcoal-400">搭配不存在</Text>
      </View>
    );
  }

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
        <TouchableOpacity className="w-10 h-10 bg-white/80 rounded-full items-center justify-center">
          <Share2 size={20} color="#2A2A25" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Items grid */}
        <View className="flex-row flex-wrap">
          {(outfit.items || [])
            .sort((a: any, b: any) => a.position - b.position)
            .map((oi: any) => {
              return (
                <View key={oi.id || oi.clothing_item_id} className="w-1/2">
                  <Image
                    source={{ uri: oi.removed_bg_url || oi.image_url }}
                    style={{ width: "100%", aspectRatio: 3 / 4 }}
                    contentFit="cover"
                  />
                  <View className="absolute bottom-0 left-0 right-0 p-3 bg-black/30">
                    <Text className="text-white text-sm font-semibold">
                      {oi.name}
                    </Text>
                    {oi.reason && (
                      <Text className="text-white/80 text-xs">{oi.reason}</Text>
                    )}
                  </View>
                </View>
              );
            })}
        </View>

        <View className="px-5 py-6">
          {/* Author */}
          <View className="flex-row items-center mb-4">
            <View className="w-10 h-10 rounded-full bg-charcoal-200 overflow-hidden">
              {outfit.avatar_url && (
                <Image
                  source={{ uri: outfit.profile.avatar_url }}
                  style={{ width: 40, height: 40 }}
                />
              )}
            </View>
            <View className="ml-3">
              <Text className="text-charcoal-900 font-semibold">
                {outfit.username || "匿名用户"}
              </Text>
              {outfit.style_tags && outfit.profile.style_tags.length > 0 && (
                <Text className="text-charcoal-400 text-xs">
                  {outfit.profile.style_tags.slice(0, 3).join(" · ")}
                </Text>
              )}
            </View>
          </View>

          {/* Name & occasion */}
          <Text className="text-xl font-bold text-charcoal-900">
            {outfit.name || "未命名搭配"}
          </Text>
          {outfit.occasion && (
            <View className="flex-row items-center mt-2">
              <View className="bg-gold-100 px-3 py-1 rounded-full">
                <Text className="text-gold-700 text-sm">{outfit.occasion}</Text>
              </View>
            </View>
          )}

          {/* Actions */}
          <View className="flex-row mt-6 space-x-3">
            <TouchableOpacity
              onPress={handleLike}
              className="flex-1 flex-row items-center justify-center bg-white rounded-2xl py-3 border border-charcoal-100"
            >
              <Heart
                size={20}
                color={outfit.likes_count > 0 ? "#DC2626" : "#8C8C84"}
                fill={outfit.likes_count > 0 ? "#DC2626" : "none"}
              />
              <Text className="ml-2 text-charcoal-600 font-semibold">
                {outfit.likes_count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/tryon/${outfit.id}`)}
              className="flex-1 flex-row items-center justify-center bg-gold-500 rounded-2xl py-3"
            >
              <Sparkles size={20} color="white" />
              <Text className="ml-2 text-white font-semibold">虚拟试穿</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
