import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { api, setToken } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import { useWeChatAuth } from "../../src/hooks/useWeChatAuth";
import { Mail, Lock, User, Eye, EyeOff, ArrowRight } from "lucide-react-native";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithWeChat, loading: wechatLoading } = useWeChatAuth();
  const setUser = useAuthStore((s) => s.setUser);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert("提示", "请填写所有字段");
      return;
    }
    if (password.length < 6) {
      Alert.alert("提示", "密码至少需要6个字符");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await api.auth.register(
        email.trim(),
        password,
        username.trim()
      );

      if (error) {
        Alert.alert("注册失败", error);
        return;
      }

      // Auto-login after registration
      await setToken(data!.token);
      setUser(data!.user);

      Alert.alert("注册成功", `欢迎加入衣搭衣，${username}！`, [
        { text: "进入应用", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch {
      Alert.alert("连接失败", "无法连接服务器，请确保后端已启动。");
    } finally {
      setLoading(false);
    }
  };

  const handleWeChatLogin = async () => {
    const result = await signInWithWeChat();
    if (result) {
      router.replace("/(tabs)");
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-ivory-200"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-8 py-12">
          <View className="items-center mb-10">
            <Text className="text-4xl mb-3">✨</Text>
            <Text className="text-3xl font-bold text-charcoal-900">创建账号</Text>
            <Text className="text-charcoal-400 text-base mt-2">
              加入衣搭衣，开启智能穿搭之旅
            </Text>
          </View>

          <View className="space-y-4">
            <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center border border-charcoal-100">
              <User size={20} color="#8C8C84" />
              <TextInput
                className="flex-1 ml-3 text-charcoal-900 text-base"
                placeholder="用户名"
                placeholderTextColor="#B0B0AA"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center border border-charcoal-100">
              <Mail size={20} color="#8C8C84" />
              <TextInput
                className="flex-1 ml-3 text-charcoal-900 text-base"
                placeholder="邮箱地址"
                placeholderTextColor="#B0B0AA"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center border border-charcoal-100">
              <Lock size={20} color="#8C8C84" />
              <TextInput
                className="flex-1 ml-3 text-charcoal-900 text-base"
                placeholder="密码 (至少6位)"
                placeholderTextColor="#B0B0AA"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={20} color="#8C8C84" />
                ) : (
                  <Eye size={20} color="#8C8C84" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={loading}
              className="bg-gold-500 py-4 rounded-2xl items-center flex-row justify-center"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white font-semibold text-lg mr-2">注册</Text>
                  <ArrowRight size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 微信快捷注册 */}
          <View className="mt-8">
            <View className="flex-row items-center mb-6">
              <View className="flex-1 h-px bg-charcoal-200" />
              <Text className="mx-4 text-charcoal-400 text-sm">快捷注册</Text>
              <View className="flex-1 h-px bg-charcoal-200" />
            </View>

            <TouchableOpacity
              onPress={handleWeChatLogin}
              disabled={wechatLoading || loading}
              className="bg-[#07C160] py-4 rounded-2xl items-center flex-row justify-center"
            >
              {wechatLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white text-xl mr-3">💬</Text>
                  <Text className="text-white font-semibold text-lg">微信一键注册</Text>
                </>
              )}
            </TouchableOpacity>
            <Text className="text-center text-charcoal-400 text-xs mt-3">
              授权即注册，自动获取微信头像和昵称
            </Text>
          </View>

          <View className="flex-row justify-center mt-8">
            <Text className="text-charcoal-400">已有账号？</Text>
            <Link href="/(auth)/login" className="ml-1">
              <Text className="text-gold-600 font-semibold">返回登录</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
