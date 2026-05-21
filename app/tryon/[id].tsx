import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { api } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import {
  ArrowLeft,
  User,
  Upload,
  Sparkles,
  Download,
  Share2,
  Star,
} from "lucide-react-native";
import type { Outfit, TryOnSession } from "../../src/types/database";

export default function VirtualTryOn() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [modelType, setModelType] = useState<"virtual" | "user" | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [session, setSession] = useState<TryOnSession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<number | null>(null);

  const { data: outfit } = useQuery({
    queryKey: ["outfit", id],
    queryFn: async () => {
      const { data } = await api.outfits.get(id!);
      return data as any;
    },
    enabled: !!id,
  });

  const pickUserPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.9,
    });
    if (!result.canceled) {
      setUserPhoto(result.assets[0].uri);
    }
  };

  const startTryOn = async () => {
    if (!modelType) {
      Alert.alert("提示", "请选择试穿模式");
      return;
    }
    if (modelType === "user" && !userPhoto) {
      Alert.alert("提示", "请上传你的照片");
      return;
    }

    setIsProcessing(true);
    try {
      // Upload user photo if needed
      let userPhotoUrl: string | null = null;
      if (modelType === "user" && userPhoto) {
        const formData = new FormData();
        const ext = userPhoto.split(".").pop() || "jpg";
        formData.append("file", {
          uri: userPhoto,
          name: `tryon_${Date.now()}.${ext}`,
          type: "image/jpeg",
        } as any);
        const { data: uploadData } = await api.upload(formData);
        userPhotoUrl = uploadData?.url || null;
      }

      // Virtual try-on requires an AI backend — show a mock result for now
      const mockSession: any = {
        id: "tryon_" + Date.now(),
        outfit_id: id,
        model_type: modelType,
        result_url: userPhotoUrl || (outfit as any)?.items?.[0]?.removed_bg_url || (outfit as any)?.items?.[0]?.image_url,
        created_at: new Date().toISOString(),
      };
      setSession(mockSession);
    } catch (err: any) {
      Alert.alert("试穿失败", err.message || "请稍后重试");
    } finally {
      setIsProcessing(false);
    }
  };

  const submitFeedback = async (rating: number) => {
    setFeedback(rating);
  };

  // Show result
  if (session?.result_url) {
    return (
      <View className="flex-1 bg-ivory-200">
        <View className="pt-14 px-5 flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#2A2A25" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-charcoal-900">试穿结果</Text>
          <View className="w-6" />
        </View>

        <ScrollView className="flex-1 px-5" contentContainerStyle={{ alignItems: "center" }}>
          <Image
            source={{ uri: session.result_url }}
            style={{ width: 320, height: 427, borderRadius: 24 }}
            contentFit="cover"
            transition={500}
          />

          {/* Feedback */}
          <View className="mt-6 items-center">
            <Text className="text-charcoal-600 mb-3">这个搭配效果如何？</Text>
            <View className="flex-row space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => submitFeedback(star)}
                >
                  <Star
                    size={32}
                    color={feedback && star <= feedback ? "#D4A83A" : "#D1D1CD"}
                    fill={feedback && star <= feedback ? "#D4A83A" : "none"}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row mt-8 space-x-3 mb-10">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-white rounded-2xl py-3 border border-charcoal-100">
              <Download size={20} color="#8C8C84" />
              <Text className="ml-2 text-charcoal-600 font-semibold">保存</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center bg-white rounded-2xl py-3 border border-charcoal-100">
              <Share2 size={20} color="#8C8C84" />
              <Text className="ml-2 text-charcoal-600 font-semibold">分享</Text>
            </TouchableOpacity>
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
        <Text className="text-lg font-semibold text-charcoal-900">虚拟试穿</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Outfit preview */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-3">
          搭配预览
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {(outfit?.items || []).slice(0, 3).map((oi: any) => (
              <View key={oi.id || oi.clothing_item_id} className="w-[30%]">
                <Image
                  source={{ uri: oi.removed_bg_url || oi.image_url }}
                  style={{ width: "100%", aspectRatio: 3 / 4, borderRadius: 12 }}
                  contentFit="cover"
                />
                <Text className="text-xs text-charcoal-600 mt-1" numberOfLines={1}>
                  {oi.name}
                </Text>
              </View>
            ))}
        </View>

        {/* Model type selection */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-3">
          选择试穿模式
        </Text>
        <View className="flex-row space-x-3 mb-6">
          <TouchableOpacity
            onPress={() => setModelType("virtual")}
            className={`flex-1 p-5 rounded-2xl items-center border-2 ${
              modelType === "virtual"
                ? "border-gold-500 bg-gold-50"
                : "border-charcoal-100 bg-white"
            }`}
          >
            <User size={40} color={modelType === "virtual" ? "#D4A83A" : "#8C8C84"} />
            <Text
              className={`mt-2 font-semibold ${
                modelType === "virtual" ? "text-gold-600" : "text-charcoal-600"
              }`}
            >
              虚拟模特
            </Text>
            <Text className="text-xs text-charcoal-400 text-center mt-1">
              使用标准模特
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setModelType("user")}
            className={`flex-1 p-5 rounded-2xl items-center border-2 ${
              modelType === "user"
                ? "border-gold-500 bg-gold-50"
                : "border-charcoal-100 bg-white"
            }`}
          >
            <Upload size={40} color={modelType === "user" ? "#D4A83A" : "#8C8C84"} />
            <Text
              className={`mt-2 font-semibold ${
                modelType === "user" ? "text-gold-600" : "text-charcoal-600"
              }`}
            >
              我的照片
            </Text>
            <Text className="text-xs text-charcoal-400 text-center mt-1">
              上传自拍照片
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upload user photo */}
        {modelType === "user" && (
          <TouchableOpacity
            onPress={pickUserPhoto}
            className="bg-white rounded-2xl p-6 items-center border border-dashed border-charcoal-300 mb-6"
          >
            {userPhoto ? (
              <Image
                source={{ uri: userPhoto }}
                style={{ width: 200, height: 267, borderRadius: 16 }}
                contentFit="cover"
              />
            ) : (
              <>
                <Upload size={32} color="#8C8C84" />
                <Text className="mt-2 text-charcoal-500">上传你的全身或半身照</Text>
                <Text className="text-xs text-charcoal-400 mt-1">
                  建议穿着贴身衣物以获得最佳效果
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Start button */}
        <TouchableOpacity
          onPress={startTryOn}
          disabled={isProcessing || !modelType}
          className={`py-4 rounded-2xl items-center flex-row justify-center mb-10 ${
            modelType ? "bg-gold-500" : "bg-charcoal-200"
          }`}
        >
          {isProcessing ? (
            <>
              <ActivityIndicator color="white" />
              <Text className="text-white font-semibold ml-2">
                正在生成试穿效果...
              </Text>
            </>
          ) : (
            <>
              <Sparkles size={20} color={modelType ? "white" : "#B0B0AA"} />
              <Text
                className={`font-semibold text-lg ml-2 ${
                  modelType ? "text-white" : "text-charcoal-400"
                }`}
              >
                开始试穿
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
