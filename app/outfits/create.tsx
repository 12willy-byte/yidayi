import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { api } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import { ArrowLeft, Check, Save } from "lucide-react-native";
import { CLOTHING_CATEGORIES } from "../../src/constants/theme";
import type { ClothingItem } from "../../src/types/database";

export default function CreateOutfit() {
  const user = useAuthStore((s) => s.user);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["clothing_items", user?.id],
    queryFn: async () => {
      const { data } = await api.clothing.list();
      return (data as ClothingItem[]) || [];
    },
    enabled: !!user?.id,
  });

  const toggleItem = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItems(next);
  };

  const handleSave = async () => {
    if (selectedItems.size === 0) {
      Alert.alert("提示", "请至少选择一件衣物");
      return;
    }

    setSaving(true);
    try {
      // Create outfit with items via REST API
      const outfitItems = Array.from(selectedItems).map((itemId, index) => ({
        clothing_item_id: itemId,
        position: index,
      }));

      const { error } = await api.outfits.create({
        name: name || "我的搭配",
        is_public: isPublic,
        items: outfitItems,
      });

      if (error) throw new Error(error);

      Alert.alert("保存成功", "搭配已保存", [
        { text: "好的", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("保存失败", err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ClothingItem }) => {
    const isSelected = selectedItems.has(item.id);
    return (
      <TouchableOpacity
        onPress={() => toggleItem(item.id)}
        className="w-[31%] mb-3"
      >
        <View
          className={`rounded-2xl overflow-hidden border-2 ${
            isSelected ? "border-gold-500" : "border-transparent"
          }`}
        >
          <Image
            source={{ uri: item.removed_bg_url || item.image_url }}
            style={{ width: "100%", aspectRatio: 3 / 4 }}
            contentFit="cover"
          />
          {isSelected && (
            <View className="absolute top-2 right-2 bg-gold-500 rounded-full p-1">
              <Check size={14} color="white" />
            </View>
          )}
        </View>
        <Text className="text-xs text-charcoal-600 mt-1" numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-ivory-200">
      <View className="pt-14 px-5 flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#2A2A25" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-charcoal-900">创建搭配</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#D4A83A" />
          ) : (
            <Save size={22} color="#D4A83A" />
          )}
        </TouchableOpacity>
      </View>

      {/* Name input */}
      <View className="px-5 mb-4">
        <TextInput
          className="bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100"
          placeholder="搭配名称（可选）"
          placeholderTextColor="#B0B0AA"
          value={name}
          onChangeText={setName}
        />
        <View className="flex-row items-center justify-between mt-3">
          <Text className="text-charcoal-500 text-sm">
            已选择 {selectedItems.size} 件衣物
          </Text>
          <TouchableOpacity
            onPress={() => setIsPublic(!isPublic)}
            className={`px-3 py-1 rounded-full ${
              isPublic ? "bg-gold-100" : "bg-charcoal-100"
            }`}
          >
            <Text className={`text-xs ${isPublic ? "text-gold-700" : "text-charcoal-500"}`}>
              {isPublic ? "公开" : "仅自己可见"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clothing grid */}
      <FlatList
        data={items || []}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      />
    </View>
  );
}
