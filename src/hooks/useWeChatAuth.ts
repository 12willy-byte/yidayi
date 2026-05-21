import { useState } from "react";
import { Alert, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { api, setToken } from "../lib/api";
import { useAuthStore } from "../stores/authStore";

WebBrowser.maybeCompleteAuthSession();

export function useWeChatAuth() {
  const [loading, setLoading] = useState(false);
  const setUser = useAuthStore((s) => s.setUser);

  const makeRedirectUri = () => {
    if (Platform.OS === "web") {
      return typeof window !== "undefined" ? window.location.origin : "";
    }
    return AuthSession.makeRedirectUri({
      scheme: "yidayi",
      path: "wechat-auth",
    });
  };

  const signInWithWeChat = async () => {
    const wechatAppId =
      process.env.EXPO_PUBLIC_WECHAT_APP_ID || "";

    if (!wechatAppId) {
      Alert.alert(
        "微信登录未配置",
        "请在 .env 中设置 EXPO_PUBLIC_WECHAT_APP_ID（微信开放平台 AppID）\n\n" +
          "当前环境也可使用邮箱注册/登录。"
      );
      return null;
    }

    setLoading(true);
    try {
      const redirectUri = makeRedirectUri();
      const state = Math.random().toString(36).substring(7);

      // Step 1: Open WeChat OAuth page
      const authUrl =
        `https://open.weixin.qq.com/connect/qrconnect?` +
        `appid=${wechatAppId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=snsapi_login&` +
        `state=${state}` +
        `#wechat_redirect`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== "success" || !result.url) {
        setLoading(false);
        return null;
      }

      // Step 2: Parse code
      const url = new URL(result.url);
      const code = url.searchParams.get("code");
      const returnedState = url.searchParams.get("state");

      if (!code || returnedState !== state) {
        Alert.alert("微信授权失败", "未能获取授权码，请重试。");
        setLoading(false);
        return null;
      }

      // Step 3: Exchange code for user info via our API
      const { data, error } = await api.auth.wechat(code);

      if (error || !data) {
        Alert.alert("微信登录失败", error || "未知错误");
        setLoading(false);
        return null;
      }

      // Step 4: Save token and update state
      await setToken(data.token);
      setUser(data.user);

      if (data.isNew) {
        Alert.alert("欢迎", "微信注册成功！");
      }

      return data;
    } catch (err: any) {
      Alert.alert("微信登录出错", err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { signInWithWeChat, loading };
}
