import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/lib/api";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Wand2,
  MapPin,
  Thermometer,
  Sparkles,
  Save,
  RefreshCw,
} from "lucide-react-native";
import { OCCASIONS } from "../../src/constants/theme";
import type { Occasion } from "../../src/types/database";

export default function GenerateOutfit() {
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatedOutfit, setGeneratedOutfit] = useState<{
    outfitName: string;
    items: any[];
    reason: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: wardrobeItems } = useQuery({
    queryKey: ["wardrobe"],
    queryFn: async () => {
      const { data } = await api.clothing.list();
      return (data as any[]) || [];
    },
  });

  const fetchWeather = async () => {
    try {
      setWeather("晴朗 22°C");
    } catch {
      setWeather("晴朗");
    }
  };

  const handleGenerate = async () => {
    if (!selectedOccasion) {
      Alert.alert("提示", "请选择场合");
      return;
    }
    if (!wardrobeItems || wardrobeItems.length < 2) {
      Alert.alert("提示", "衣橱中至少需要 2 件衣物才能生成搭配");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await api.ai.suggestOutfit({
        occasion: selectedOccasion,
        weather: weather || undefined,
      });

      if (error) throw new Error(error);

      // Match AI-returned item names to actual wardrobe items
      const aiItems: string[] = data?.items || [];
      const matched = aiItems
        .map((aiName: string) => {
          const match = wardrobeItems.find(
            (w: any) =>
              w.name === aiName ||
              aiName.includes(w.name) ||
              w.name.includes(aiName)
          );
          return match || null;
        })
        .filter(Boolean);

      setGeneratedOutfit({
        outfitName: data?.outfitName || `${selectedOccasion} 搭配`,
        items: matched.length > 0 ? matched : wardrobeItems.slice(0, 3),
        reason: data?.reason || "AI 推荐搭配",
      });
    } catch (err: any) {
      Alert.alert("生成失败", err.message || "请检查网络连接后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedOutfit) return;
    setSaving(true);
    try {
      const outfitItems = generatedOutfit.items.map((item: any, idx: number) => ({
        clothing_item_id: item.id,
        position: idx,
        reason: idx === 0 ? generatedOutfit.reason : undefined,
      }));

      const { error } = await api.outfits.create({
        name: generatedOutfit.outfitName,
        is_public: false,
        items: outfitItems,
      });

      if (error) throw new Error(error);

      Alert.alert("保存成功", "搭配已保存到你的衣橱", [
        { text: "好的", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("保存失败", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (generatedOutfit) {
    return (
      <View className="flex-1 bg-ivory-200">
        <View className="pt-14 px-5 flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#2A2A25" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-charcoal-900">搭配结果</Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-3xl p-5 mb-4 border border-charcoal-100">
            <Text className="text-xl font-bold text-charcoal-900 mb-1">
              {generatedOutfit.outfitName}
            </Text>
            <Text className="text-sm text-charcoal-400 mb-4">
              {generatedOutfit.reason}
            </Text>

            <View className="flex-row flex-wrap gap-2 mb-4">
              {generatedOutfit.items.map((item: any, idx: number) => (
                <View key={item.id || idx} className="w-[30%]">
                  <Image
                    source={{ uri: item.removed_bg_url || item.image_url }}
                    style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <Text className="text-xs text-charcoal-600 mt-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="flex-1 bg-gold-500 py-3 rounded-2xl items-center flex-row justify-center"
              >
                {saving ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Save size={18} color="white" />
                    <Text className="text-white font-semibold ml-2">保存搭配</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setGeneratedOutfit(null);
                  handleGenerate();
                }}
                className="bg-charcoal-100 py-3 px-4 rounded-2xl items-center justify-center"
              >
                <RefreshCw size={18} color="#2A2A25" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ivory-200">
      <View className="pt-14 px-5 flex-row items-center justify-between mb-6">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#2A2A25" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-charcoal-900">AI 搭配</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Occasion */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-3">
          选择场合
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {OCCASIONS.map((occ) => (
            <TouchableOpacity
              key={occ.value}
              onPress={() => setSelectedOccasion(occ.value)}
              className={`px-5 py-3 rounded-2xl flex-row items-center ${
                selectedOccasion === occ.value
                  ? "bg-gold-500"
                  : "bg-white border border-charcoal-100"
              }`}
            >
              <Text className="text-lg mr-2">{occ.icon}</Text>
              <Text
                className={
                  selectedOccasion === occ.value
                    ? "text-white font-semibold"
                    : "text-charcoal-600"
                }
              >
                {occ.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weather */}
        <View className="bg-white rounded-3xl p-5 mb-6 border border-charcoal-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Thermometer size={20} color="#8C8C84" />
              <Text className="ml-2 text-charcoal-600">天气</Text>
            </View>
            <TouchableOpacity
              onPress={fetchWeather}
              className="flex-row items-center"
            >
              <MapPin size={16} color="#D4A83A" />
              <Text className="ml-1 text-gold-600 text-sm">
                {weather || "获取天气"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Wardrobe count */}
        <View className="bg-gold-50 rounded-2xl p-4 mb-6 border border-gold-100">
          <View className="flex-row items-center">
            <Sparkles size={18} color="#D4A83A" />
            <Text className="ml-2 text-charcoal-600">
              衣橱中有 {(wardrobeItems || []).length} 件衣物
            </Text>
          </View>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading || !selectedOccasion}
          className={`py-4 rounded-2xl items-center flex-row justify-center mb-10 ${
            selectedOccasion ? "bg-gold-500" : "bg-charcoal-200"
          }`}
        >
          {loading ? (
            <>
              <ActivityIndicator color="white" />
              <Text className="text-white font-semibold ml-2">AI 正在搭配中...</Text>
            </>
          ) : (
            <>
              <Wand2 size={20} color={selectedOccasion ? "white" : "#B0B0AA"} />
              <Text
                className={`font-semibold text-lg ml-2 ${
                  selectedOccasion ? "text-white" : "text-charcoal-400"
                }`}
              >
                生成 AI 搭配
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
