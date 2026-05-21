declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
      EXPO_PUBLIC_OPENWEATHER_API_KEY?: string;
      EXPO_PUBLIC_WECHAT_APP_ID?: string;
      EXPO_PUBLIC_WECHAT_REDIRECT_URI?: string;
    }
  }
}

export {};
