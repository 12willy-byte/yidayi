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
} from "react-native";
import { Link, router } from "expo-router";
import { api, setToken } from "../../src/lib/api";
import { useAuthStore } from "../../src/stores/authStore";
import { useWeChatAuth } from "../../src/hooks/useWeChatAuth";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react-native";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithWeChat, loading: wechatLoading } = useWeChatAuth();
  const setUser = useAuthStore((s) => s.setUser);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("提示", "请输入邮箱和密码");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await api.auth.login(email.trim(), password);

      if (error) {
        Alert.alert("登录失败", error);
        return;
      }

      await setToken(data!.token);
      setUser(data!.user);
      router.replace("/(tabs)");
    } catch {
      Alert.alert("连接失败", "无法连接服务器，请确保后端已启动。");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    Alert.alert(
      `${provider} 登录`,
      `需要配置 ${provider} OAuth 才能使用。\n\n推荐使用微信一键登录或邮箱登录。`
    );
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
      <View className="flex-1 justify-center px-8">
        <View className="items-center mb-12">
          <Text className="text-5xl mb-4">👗</Text>
          <Text className="text-4xl font-bold text-charcoal-900">衣搭衣</Text>
          <Text className="text-charcoal-400 text-base mt-2">
            你的AI智能衣橱助手
          </Text>
        </View>

        <View className="space-y-4">
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
              placeholder="密码"
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
            onPress={handleLogin}
            disabled={loading}
            className="bg-charcoal-900 py-4 rounded-2xl items-center flex-row justify-center"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white font-semibold text-lg mr-2">登录</Text>
                <ArrowRight size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 快捷登录 */}
        <View className="mt-8">
          <View className="flex-row items-center mb-6">
            <View className="flex-1 h-px bg-charcoal-200" />
            <Text className="mx-4 text-charcoal-400 text-sm">快捷登录</Text>
            <View className="flex-1 h-px bg-charcoal-200" />
          </View>

          <TouchableOpacity
            onPress={handleWeChatLogin}
            disabled={wechatLoading}
            className="bg-[#07C160] py-4 rounded-2xl items-center flex-row justify-center mb-4"
          >
            {wechatLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text className="text-white text-xl mr-3">💬</Text>
                <Text className="text-white font-semibold text-lg">微信一键登录</Text>
              </>
            )}
          </TouchableOpacity>

          <View className="flex-row justify-center space-x-4">
            <TouchableOpacity
              onPress={() => handleSocialLogin("Google")}
              className="w-12 h-12 rounded-full bg-white items-center justify-center border border-charcoal-200"
            >
              <Text className="text-lg font-bold text-[#4285F4]">G</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleSocialLogin("Apple")}
              className="w-12 h-12 rounded-full bg-black items-center justify-center"
            >
              <Text className="text-lg text-white"></Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row justify-center mt-10">
          <Text className="text-charcoal-400">还没有账号？</Text>
          <Link href="/(auth)/register" className="ml-1">
            <Text className="text-gold-600 font-semibold">立即注册</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
