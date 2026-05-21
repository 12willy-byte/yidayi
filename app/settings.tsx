import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { api } from "../src/lib/api";
import { useAuthStore } from "../src/stores/authStore";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  LogOut,
  Trash2,
  Shield,
  Globe,
  Bell,
  HelpCircle,
  Info,
} from "lucide-react-native";

export default function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? false);

  const togglePublic = async (value: boolean) => {
    setIsPublic(value);
    await api.profile.update({ is_public: value });
    fetchProfile();
  };

  const clearCache = async () => {
    queryClient.clear();
    Alert.alert("已清除", "缓存已清除");
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

  return (
    <View className="flex-1 bg-ivory-200">
      <View className="pt-14 px-5 flex-row items-center mb-6">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <ArrowLeft size={24} color="#2A2A25" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-charcoal-900">设置</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Privacy */}
        <Text className="text-xs font-semibold text-charcoal-400 mb-2 ml-2">
          隐私
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden mb-6 border border-charcoal-100">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100">
            <View className="flex-row items-center">
              <Globe size={20} color="#8C8C84" />
              <Text className="ml-3 text-charcoal-900">公开衣橱</Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={togglePublic}
              trackColor={{ false: "#D1D1CD", true: "#F0D18E" }}
              thumbColor={isPublic ? "#D4A83A" : "#F5F5F4"}
            />
          </View>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Shield size={20} color="#8C8C84" />
              <Text className="ml-3 text-charcoal-900">隐私政策</Text>
            </View>
            <ChevronRight size={20} color="#B0B0AA" />
          </View>
        </View>

        {/* General */}
        <Text className="text-xs font-semibold text-charcoal-400 mb-2 ml-2">
          通用
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden mb-6 border border-charcoal-100">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100">
            <View className="flex-row items-center">
              <Bell size={20} color="#8C8C84" />
              <Text className="ml-3 text-charcoal-900">通知</Text>
            </View>
            <Switch
              value={true}
              trackColor={{ false: "#D1D1CD", true: "#F0D18E" }}
              thumbColor="#D4A83A"
            />
          </View>
          <TouchableOpacity
            onPress={clearCache}
            className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100"
          >
            <View className="flex-row items-center">
              <Trash2 size={20} color="#8C8C84" />
              <Text className="ml-3 text-charcoal-900">清除缓存</Text>
            </View>
            <ChevronRight size={20} color="#B0B0AA" />
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text className="text-xs font-semibold text-charcoal-400 mb-2 ml-2">
          关于
        </Text>
        <View className="bg-white rounded-2xl overflow-hidden mb-6 border border-charcoal-100">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-charcoal-100">
            <View className="flex-row items-center">
              <HelpCircle size={20} color="#8C8C84" />
              <Text className="ml-3 text-charcoal-900">帮助与反馈</Text>
            </View>
            <ChevronRight size={20} color="#B0B0AA" />
          </View>
          <View className="flex-row items-center justify-between px-5 py-4">
            <View className="flex-row items-center">
              <Info size={20} color="#8C8C84" />
              <Text className="ml-3 text-charcoal-900">关于衣搭衣</Text>
            </View>
            <Text className="text-charcoal-400 text-sm">v1.0.0</Text>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleSignOut}
          className="bg-white rounded-2xl px-5 py-4 mb-10 flex-row items-center justify-center border border-red-200"
        >
          <LogOut size={20} color="#DC2626" />
          <Text className="ml-2 text-red-500 font-semibold">退出登录</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
