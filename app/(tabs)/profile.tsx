import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { api } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import {
  Settings,
  Camera,
  ChevronRight,
  LogOut,
  Grid3x3,
  Sparkles,
} from "lucide-react-native";
import { BODY_TYPES, STYLE_TAGS } from "../../src/constants/theme";

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [height, setHeight] = useState(profile?.height?.toString() || "");
  const [weight, setWeight] = useState(profile?.weight?.toString() || "");
  const [bodyType, setBodyType] = useState(profile?.body_type || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    profile?.style_tags || []
  );
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ items: 0, outfits: 0 });

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      // Load stats
      (async () => {
        const [itemsRes, outfitsRes] = await Promise.all([
          api.clothing.list(),
          api.outfits.list(),
        ]);
        setStats({
          items: itemsRes.data?.length || 0,
          outfits: outfitsRes.data?.length || 0,
        });
      })();
    }, [])
  );

  const updateAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const ext = uri.split(".").pop() || "jpg";
      const formData = new FormData();
      (formData.append as any)("file", {
        uri,
        name: `avatar.${ext}`,
        type: `image/${ext}`,
      });
      const { data, error } = await api.upload(formData as any);
      if (data?.url) {
        await api.profile.update({ avatar_url: data.url });
        fetchProfile();
      } else {
        Alert.alert("上传失败", error);
      }
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await api.profile.update({
        username,
        bio,
        height: height ? Number(height) : null,
        weight: weight ? Number(weight) : null,
        body_type: bodyType || null,
        style_tags: selectedTags,
      });
      if (error) {
        Alert.alert("保存失败", error);
        return;
      }
      await fetchProfile();
      setEditMode(false);
    } catch (err: any) {
      Alert.alert("保存失败", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert("退出登录", "确定要退出吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (editMode) {
    return (
      <View className="flex-1 bg-ivory-200">
        <View className="pt-14 px-5 flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => setEditMode(false)}>
            <Text className="text-charcoal-500 text-base">取消</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-charcoal-900">编辑资料</Text>
          <TouchableOpacity onPress={saveProfile} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#D4A83A" />
            ) : (
              <Text className="text-gold-500 font-semibold text-base">保存</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <Text className="text-sm font-semibold text-charcoal-400 mb-2">用户名</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100 mb-4"
            value={username}
            onChangeText={setUsername}
          />

          <Text className="text-sm font-semibold text-charcoal-400 mb-2">简介</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100 mb-4"
            multiline
            value={bio}
            onChangeText={setBio}
            placeholder="介绍一下自己..."
            placeholderTextColor="#B0B0AA"
          />

          <Text className="text-sm font-semibold text-charcoal-400 mb-2">身高 (cm)</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100 mb-4"
            keyboardType="numeric"
            value={height}
            onChangeText={setHeight}
          />

          <Text className="text-sm font-semibold text-charcoal-400 mb-2">体重 (kg)</Text>
          <TextInput
            className="bg-white rounded-xl px-4 py-3 text-charcoal-900 border border-charcoal-100 mb-4"
            keyboardType="numeric"
            value={weight}
            onChangeText={setWeight}
          />

          <Text className="text-sm font-semibold text-charcoal-400 mb-2">体型</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {BODY_TYPES.map((bt) => (
              <TouchableOpacity
                key={bt}
                onPress={() => setBodyType(bodyType === bt ? "" : bt)}
                className={`px-4 py-2 rounded-full ${
                  bodyType === bt
                    ? "bg-charcoal-900"
                    : "bg-white border border-charcoal-200"
                }`}
              >
                <Text className={bodyType === bt ? "text-white" : "text-charcoal-600"}>{bt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-semibold text-charcoal-400 mb-2">风格标签</Text>
          <View className="flex-row flex-wrap gap-2 mb-10">
            {STYLE_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() =>
                  setSelectedTags(
                    selectedTags.includes(tag)
                      ? selectedTags.filter((t) => t !== tag)
                      : [...selectedTags, tag]
                  )
                }
                className={`px-4 py-2 rounded-full ${
                  selectedTags.includes(tag)
                    ? "bg-gold-500"
                    : "bg-white border border-charcoal-200"
                }`}
              >
                <Text className={selectedTags.includes(tag) ? "text-white" : "text-charcoal-600"}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-ivory-200">
      <View className="pt-14 pb-4 px-5 bg-ivory-200 flex-row items-center justify-between">
        <Text className="text-3xl font-bold text-charcoal-900">我的</Text>
        <TouchableOpacity onPress={() => router.push("/settings")}>
          <Settings size={24} color="#2A2A25" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-5 bg-white rounded-3xl p-6 mb-4 items-center border border-charcoal-100">
          <TouchableOpacity onPress={updateAvatar}>
            <View className="w-24 h-24 rounded-full bg-charcoal-200 overflow-hidden mb-3">
              {(profile?.avatar_url || user?.avatar_url) ? (
                <Image
                  source={{ uri: profile?.avatar_url || user?.avatar_url || "" }}
                  style={{ width: 96, height: 96 }}
                  contentFit="cover"
                />
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Camera size={32} color="#8C8C84" />
                </View>
              )}
            </View>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-charcoal-900">
            {profile?.username || user?.username || "用户"}
          </Text>
          {profile?.bio && (
            <Text className="text-charcoal-500 mt-1 text-center">{profile.bio}</Text>
          )}
          {profile?.style_tags && profile.style_tags.length > 0 && (
            <View className="flex-row flex-wrap justify-center gap-1 mt-2">
              {profile.style_tags.slice(0, 5).map((tag: string) => (
                <View key={tag} className="bg-gold-50 px-2 py-0.5 rounded-full">
                  <Text className="text-gold-700 text-xs">{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="flex-row mx-5 space-x-3 mb-4">
          <View className="flex-1 bg-white rounded-2xl p-4 items-center border border-charcoal-100">
            <Grid3x3 size={24} color="#D4A83A" />
            <Text className="text-2xl font-bold text-charcoal-900 mt-2">{stats.items}</Text>
            <Text className="text-charcoal-400 text-sm">衣物</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 items-center border border-charcoal-100">
            <Sparkles size={24} color="#D4A83A" />
            <Text className="text-2xl font-bold text-charcoal-900 mt-2">{stats.outfits}</Text>
            <Text className="text-charcoal-400 text-sm">搭配</Text>
          </View>
        </View>

        {(profile?.height || profile?.weight || profile?.body_type) && (
          <View className="mx-5 bg-white rounded-2xl p-4 mb-4 border border-charcoal-100">
            <Text className="text-sm font-semibold text-charcoal-400 mb-2">身材信息</Text>
            <View className="flex-row flex-wrap gap-3">
              {profile.height && <Text className="text-charcoal-600">{profile.height}cm</Text>}
              {profile.weight && <Text className="text-charcoal-600">{profile.weight}kg</Text>}
              {profile.body_type && <Text className="text-charcoal-600">{profile.body_type}</Text>}
            </View>
          </View>
        )}

        <View className="mx-5 bg-white rounded-3xl overflow-hidden mb-4 border border-charcoal-100">
          <TouchableOpacity
            onPress={() => {
              setEditMode(true);
              setUsername(profile?.username || user?.username || "");
              setBio(profile?.bio || "");
              setHeight(profile?.height?.toString() || "");
              setWeight(profile?.weight?.toString() || "");
              setBodyType(profile?.body_type || "");
              setSelectedTags(profile?.style_tags || []);
            }}
            className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100"
          >
            <Text className="text-charcoal-900">编辑资料</Text>
            <ChevronRight size={20} color="#B0B0AA" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/feedback")}
            className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100"
          >
            <Text className="text-charcoal-900">帮助与反馈</Text>
            <ChevronRight size={20} color="#B0B0AA" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100"
          >
            <Text className="text-charcoal-900">设置</Text>
            <ChevronRight size={20} color="#B0B0AA" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSignOut}
            className="flex-row items-center justify-between px-5 py-4"
          >
            <Text className="text-red-500">退出登录</Text>
            <LogOut size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>

        <View className="h-24" />
      </ScrollView>
    </View>
  );
}
