export type ClothingCategory =
  | "top"
  | "bottom"
  | "outerwear"
  | "dress"
  | "shoes"
  | "accessories";

export type Season = "spring" | "summer" | "autumn" | "winter";

export type Occasion =
  | "casual"
  | "work"
  | "date"
  | "sports"
  | "party"
  | "formal"
  | "travel";

export interface Profile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  height: number | null;
  weight: number | null;
  body_type: string | null;
  style_tags: string[];
  is_public: boolean;
  wechat_openid: string | null;
  wechat_unionid: string | null;
  wechat_nickname: string | null;
  wechat_avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: ClothingCategory;
  colors: string[];
  seasons: Season[];
  brand: string | null;
  tags: string[];
  image_url: string;
  removed_bg_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  name: string;
  occasion: Occasion | null;
  weather: string | null;
  is_public: boolean;
  likes_count: number;
  created_at: string;
  updated_at: string;
  items?: OutfitItem[];
  profile?: Profile;
}

export interface OutfitItem {
  id: string;
  outfit_id: string;
  clothing_item_id: string;
  reason: string | null;
  position: number;
  clothing_item?: ClothingItem;
}

export interface TryOnSession {
  id: string;
  user_id: string;
  outfit_id: string;
  model_type: "virtual" | "user";
  user_photo_url: string | null;
  result_url: string | null;
  status: "processing" | "completed" | "failed";
  feedback: number | null;
  created_at: string;
}

export interface DiaryEntry {
  id: string;
  user_id: string;
  outfit_id: string | null;
  photo_url: string | null;
  note: string | null;
  weather: string | null;
  temperature: number | null;
  date: string;
  created_at: string;
  outfit?: Outfit;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  image: string;
}
