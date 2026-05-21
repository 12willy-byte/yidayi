import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { api } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import { Heart, Plus, Wand2 } from "lucide-react-native";
import { COLORS } from "../../src/constants/theme";
import type { Outfit } from "../../src/types/database";

export default function OutfitsScreen() {
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data: outfits, isLoading, refetch } = useQuery({
    queryKey: ["outfits_feed"],
    queryFn: async () => {
      const { data } = await api.outfits.list();
      return (data as any[]) || [];
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  const handleLike = async (outfitId: string) => {
    await api.outfits.like(outfitId);
    refetch();
  };

  const renderItem = ({ item }: { item: any }) => {
    const itemUrls = (item.items || [])
      .slice(0, 4)
      .map((oi: any) => oi.removed_bg_url || oi.image_url)
      .filter(Boolean) as string[];

    return (
      <TouchableOpacity
        className="bg-white rounded-3xl mb-4 overflow-hidden border border-charcoal-100"
        onPress={() => router.push(`/outfits/${item.id}`)}
      >
        {/* Collage of clothing items */}
        <View className="flex-row flex-wrap">
          {itemUrls.length > 0 ? (
            itemUrls.length === 1 ? (
              <Image
                source={{ uri: itemUrls[0] }}
                style={{ width: "100%", aspectRatio: 16 / 9 }}
                contentFit="cover"
              />
            ) : (
              <View className="flex-row flex-wrap w-full">
                {itemUrls.map((url, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: url }}
                    style={{
                      width: itemUrls.length <= 2 ? "50%" : "50%",
                      aspectRatio: 1,
                    }}
                    contentFit="cover"
                  />
                ))}
              </View>
            )
          ) : null}
        </View>

        {/* Info */}
        <View className="p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-charcoal-200 overflow-hidden">
                {item.avatar_url && (
                  <Image
                    source={{ uri: item.avatar_url }}
                    style={{ width: 32, height: 32 }}
                  />
                )}
              </View>
              <Text className="ml-2 text-sm text-charcoal-600">
                {item.username || "匿名用户"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleLike(item.id)}
              className="flex-row items-center"
            >
              <Heart
                size={20}
                color={item.likes_count > 0 ? "#DC2626" : "#B0B0AA"}
                fill={item.likes_count > 0 ? "#DC2626" : "none"}
              />
              <Text className="ml-1 text-sm text-charcoal-400">
                {item.likes_count}
              </Text>
            </TouchableOpacity>
          </View>
          {item.name && (
            <Text className="mt-2 text-charcoal-900 font-semibold">
              {item.name}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-ivory-200">
      {/* Header */}
      <View className="pt-14 pb-4 px-5 bg-ivory-200">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-bold text-charcoal-900">搭配灵感</Text>
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => router.push("/outfits/generate")}
              className="bg-gold-500 w-10 h-10 rounded-full items-center justify-center"
            >
              <Wand2 size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/outfits/create")}
              className="bg-charcoal-900 w-10 h-10 rounded-full items-center justify-center"
            >
              <Plus size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={outfits || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              refetch().finally(() => setRefreshing(false));
            }}
            tintColor={COLORS.gold}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center py-20">
              <Text className="text-5xl mb-4">💡</Text>
              <Text className="text-lg font-semibold text-charcoal-900 mb-2">
                还没有搭配分享
              </Text>
              <Text className="text-charcoal-400 text-center">
                点击魔法棒按钮用AI生成搭配{"\n"}或点击 + 手动创建
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
