import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useAuthStore } from "../../src/stores/authStore";
import { api } from "../../src/lib/api";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Check,
  X,
} from "lucide-react-native";
import {
  CLOTHING_CATEGORIES,
  COLOR_OPTIONS,
  SEASONS,
} from "../../src/constants/theme";
import type { ClothingCategory, Season } from "../../src/types/database";

export default function AddClothing() {
  const user = useAuthStore((s) => s.user);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ClothingCategory | null>(null);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
  const [brand, setBrand] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<"photo" | "details">("photo");

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("权限不足", "需要相机权限才能拍照");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadAndSave = async () => {
    if (!imageUri || !name || !category) {
      Alert.alert("提示", "请填写图片、名称和类别");
      return;
    }

    setIsUploading(true);
    try {
      // Use local image URI directly; in production, upload to server first
      const imageUrl = imageUri;

      const { error: insertError } = await api.clothing.create({
        name,
        category,
        colors: selectedColors,
        seasons: selectedSeasons,
        brand: brand || null,
        tags,
        image_url: imageUrl,
      });

      if (insertError) throw new Error(insertError);

      Alert.alert("成功", "衣物已添加到衣橱", [
        { text: "返回", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("错误", err.message || "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  if (step === "photo") {
    return (
      <View className="flex-1 bg-ivory-200">
        <View className="pt-14 px-5 flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#2A2A25" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-charcoal-900">添加衣物</Text>
          <View className="w-6" />
        </View>

        <View className="flex-1 justify-center px-8">
          {imageUri ? (
            <View className="items-center">
              <Image
                source={{ uri: imageUri }}
                style={{ width: 280, height: 373, borderRadius: 20 }}
                contentFit="cover"
              />
              <View className="flex-row mt-6 space-x-4">
                <TouchableOpacity
                  onPress={() => setImageUri(null)}
                  className="px-6 py-3 rounded-full border border-charcoal-200"
                >
                  <Text className="text-charcoal-600">重拍</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setStep("details")}
                  className="px-6 py-3 rounded-full bg-gold-500"
                >
                  <Text className="text-white font-semibold">下一步</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="items-center">
              <Text className="text-2xl font-bold text-charcoal-900 mb-2">
                添加衣物照片
              </Text>
              <Text className="text-charcoal-400 text-center mb-10">
                拍摄或选择一张衣物的平铺照片{"\n"}建议在白色背景上拍摄
              </Text>

              <TouchableOpacity
                onPress={takePhoto}
                className="w-full bg-white rounded-2xl p-6 items-center mb-4 border border-charcoal-100"
              >
                <Camera size={40} color="#D4A83A" />
                <Text className="mt-3 text-charcoal-900 font-semibold text-lg">
                  拍照
                </Text>
                <Text className="text-charcoal-400 text-sm mt-1">
                  使用相机拍摄
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickImage}
                className="w-full bg-white rounded-2xl p-6 items-center border border-charcoal-100"
              >
                <ImageIcon size={40} color="#D4A83A" />
                <Text className="mt-3 text-charcoal-900 font-semibold text-lg">
                  从相册选择
                </Text>
                <Text className="text-charcoal-400 text-sm mt-1">
                  从手机相册中选取
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ivory-200">
      <View className="pt-14 px-5 flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={() => setStep("photo")}>
          <ArrowLeft size={24} color="#2A2A25" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-charcoal-900">衣物信息</Text>
        <View className="w-6" />
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-2">
          名称
        </Text>
        <TextInput
          className="bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100 mb-4"
          placeholder="例如：白色修身衬衫"
          placeholderTextColor="#B0B0AA"
          value={name}
          onChangeText={setName}
        />

        {/* Category */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-2">
          类别
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {CLOTHING_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              onPress={() => setCategory(cat.value)}
              className={`px-4 py-2 rounded-full ${
                category === cat.value
                  ? "bg-charcoal-900"
                  : "bg-white border border-charcoal-200"
              }`}
            >
              <Text
                className={
                  category === cat.value ? "text-white" : "text-charcoal-600"
                }
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Colors */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-2">
          颜色（多选）
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {COLOR_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c.label}
              onPress={() => {
                setSelectedColors(
                  selectedColors.includes(c.label)
                    ? selectedColors.filter((x) => x !== c.label)
                    : [...selectedColors, c.label]
                );
              }}
              className={`px-3 py-1.5 rounded-full flex-row items-center space-x-1.5 ${
                selectedColors.includes(c.label)
                  ? "bg-charcoal-900"
                  : "bg-white border border-charcoal-200"
              }`}
            >
              <View
                className="w-4 h-4 rounded-full border border-charcoal-300"
                style={{ backgroundColor: c.hex }}
              />
              <Text
                className={
                  selectedColors.includes(c.label)
                    ? "text-white"
                    : "text-charcoal-600"
                }
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Seasons */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-2">
          季节（多选）
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {SEASONS.map((s) => (
            <TouchableOpacity
              key={s.value}
              onPress={() => {
                setSelectedSeasons(
                  selectedSeasons.includes(s.value)
                    ? selectedSeasons.filter((x) => x !== s.value)
                    : [...selectedSeasons, s.value]
                );
              }}
              className={`px-4 py-2 rounded-full ${
                selectedSeasons.includes(s.value)
                  ? "bg-charcoal-900"
                  : "bg-white border border-charcoal-200"
              }`}
            >
              <Text
                className={
                  selectedSeasons.includes(s.value)
                    ? "text-white"
                    : "text-charcoal-600"
                }
              >
                {s.emoji} {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Brand */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-2">
          品牌（可选）
        </Text>
        <TextInput
          className="bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100 mb-4"
          placeholder="例如：ZARA, UNIQLO..."
          placeholderTextColor="#B0B0AA"
          value={brand}
          onChangeText={setBrand}
        />

        {/* Tags */}
        <Text className="text-sm font-semibold text-charcoal-400 mb-2">
          标签（可选）
        </Text>
        <View className="flex-row items-center mb-2">
          <TextInput
            className="flex-1 bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100"
            placeholder="添加标签..."
            placeholderTextColor="#B0B0AA"
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
          />
          <TouchableOpacity
            onPress={addTag}
            className="ml-2 bg-charcoal-900 w-10 h-10 rounded-xl items-center justify-center"
          >
            <Text className="text-white text-xl">+</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {tags.map((tag) => (
            <View
              key={tag}
              className="flex-row items-center bg-gold-100 px-3 py-1.5 rounded-full"
            >
              <Text className="text-gold-700 text-sm mr-1">{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <X size={14} color="#D4A83A" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={uploadAndSave}
          disabled={isUploading}
          className="bg-gold-500 py-4 rounded-2xl items-center mb-10"
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">保存到衣橱</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
