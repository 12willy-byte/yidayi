import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "yidayi_auth_token";

// 生产环境设置 EXPO_PUBLIC_API_URL，开发环境自动用本地地址
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || Platform.select({
  android: "http://10.0.2.2:3001",
  ios: "http://localhost:3001",
  default: "http://localhost:3001",
}) as string;

async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function getStoredToken(): Promise<string | null> {
  return getToken();
}

// Generic API request
async function request(
  method: string,
  path: string,
  body?: any,
  isFormData?: boolean
): Promise<any> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json();
    if (!response.ok) {
      return { error: json.error || `请求失败 (${response.status})` };
    }
    return { data: json };
  } catch (err: any) {
    return { error: `网络错误: ${err.message}` };
  }
}

export const api = {
  get: (path: string) => request("GET", path),
  post: (path: string, body?: any) => request("POST", path, body),
  put: (path: string, body?: any) => request("PUT", path, body),
  delete: (path: string) => request("DELETE", path),
  upload: (formData: FormData) => request("POST", "/api/upload", formData, true),

  auth: {
    register: (email: string, password: string, username: string) =>
      request("POST", "/api/auth/register", { email, password, username }),

    login: (email: string, password: string) =>
      request("POST", "/api/auth/login", { email, password }),

    wechat: (code: string) =>
      request("POST", "/api/auth/wechat", { code }),

    me: () => request("GET", "/api/auth/me"),
  },

  profile: {
    get: () => request("GET", "/api/profile"),
    update: (data: any) => request("PUT", "/api/profile", data),
  },

  clothing: {
    list: (params?: { category?: string; search?: string }) => {
      const qs = new URLSearchParams();
      if (params?.category) qs.set("category", params.category);
      if (params?.search) qs.set("search", params.search);
      return request("GET", "/api/clothing?" + qs.toString());
    },
    get: (id: string) => request("GET", `/api/clothing/${id}`),
    create: (data: any) => request("POST", "/api/clothing", data),
    update: (id: string, data: any) => request("PUT", `/api/clothing/${id}`, data),
    delete: (id: string) => request("DELETE", `/api/clothing/${id}`),
  },

  outfits: {
    list: (page = 1) => request("GET", "/api/outfits?page=" + page),
    get: (id: string) => request("GET", `/api/outfits/${id}`),
    create: (data: any) => request("POST", "/api/outfits", data),
    like: (id: string) => request("POST", `/api/outfits/${id}/like`),
  },

  diary: {
    list: (year?: number, month?: number) => {
      const qs = new URLSearchParams();
      if (year) qs.set("year", String(year));
      if (month) qs.set("month", String(month));
      return request("GET", "/api/diary?" + qs.toString());
    },
    get: (date: string) => request("GET", `/api/diary/${date}`),
    create: (data: any) => request("POST", "/api/diary", data),
    update: (id: string, data: any) => request("PUT", `/api/diary/${id}`, data),
  },

  ai: {
    status: () => request("GET", "/api/ai/status"),
    suggestOutfit: (params: {
      occasion?: string;
      weather?: string;
      stylePreference?: string;
      itemIds?: string[];
    }) => request("POST", "/api/ai/suggest-outfit", params),
  },
};
