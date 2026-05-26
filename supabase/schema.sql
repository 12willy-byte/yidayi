-- =============================================================================
-- 衣搭衣 (yidayi) — Supabase PostgreSQL Schema
-- =============================================================================
-- Usage: Run this entire file in Supabase SQL Editor
--   https://app.supabase.com → Your Project → SQL Editor → New Query → Paste & Run
-- =============================================================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER: Raw SQL execution function (used by server-side query() adapter)
-- =============================================================================
-- This enables the server's db.ts query() function to execute arbitrary SQL
-- while preserving backward compatibility with the Turso SQLite query interface.
-- SECURITY DEFINER bypasses RLS — routes enforce user isolation via WHERE clauses.

CREATE OR REPLACE FUNCTION exec_sql(query_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Attempt to wrap as a subquery (works for SELECT, and for INSERT/UPDATE/DELETE
  -- that include a RETURNING clause). If wrapping fails (e.g., plain INSERT without
  -- RETURNING), fall through to the exception handler and execute raw.
  BEGIN
    EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || query_text || ') t'
      INTO result;
  EXCEPTION WHEN OTHERS THEN
    -- Mutation without RETURNING: execute directly and return empty result set
    EXECUTE query_text;
    result := '[]'::jsonb;
  END;

  RETURN result;
END;
$$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Users table (extends Supabase auth.users)
-- When users sign up via Supabase Auth, a trigger copies auth.users → public.users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,            -- Must match auth.users.id
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,              -- NULL for OAuth-only users (WeChat, etc.)
  wechat_openid TEXT UNIQUE,
  wechat_unionid TEXT,
  wechat_nickname TEXT,
  wechat_avatar_url TEXT,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create public.users row when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  );
  -- Also create a profile row
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger: after insert on auth.users, create public.users + public.profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  bio TEXT,
  height REAL,
  weight REAL,
  body_type TEXT,
  style_tags JSONB DEFAULT '[]'::JSONB,
  is_public BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clothing_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('top','bottom','outerwear','dress','shoes','accessories')),
  colors JSONB DEFAULT '[]'::JSONB,
  seasons JSONB DEFAULT '[]'::JSONB,
  brand TEXT,
  tags JSONB DEFAULT '[]'::JSONB,
  image_url TEXT NOT NULL,
  removed_bg_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clothing_user ON public.clothing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_clothing_category ON public.clothing_items(category);

-- =============================================================================

CREATE TABLE IF NOT EXISTS public.outfits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT,
  occasion TEXT,
  weather TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfits_user ON public.outfits(user_id);

-- =============================================================================

CREATE TABLE IF NOT EXISTS public.outfit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  clothing_item_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
  reason TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit ON public.outfit_items(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_clothing ON public.outfit_items(clothing_item_id);

-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tryon_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  outfit_id UUID NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
  model_type TEXT NOT NULL CHECK (model_type IN ('virtual','user')),
  user_photo_url TEXT,
  result_url TEXT,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
  feedback INTEGER CHECK (feedback >= 1 AND feedback <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================

CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
  photo_url TEXT,
  note TEXT,
  weather TEXT,
  temperature REAL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_diary_user ON public.diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_date ON public.diary_entries(date);

-- =============================================================================

-- Internal file storage (base64 blobs — for backward compatibility with Turso)
-- With Supabase, consider migrating to Supabase Storage for production use.
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  data TEXT NOT NULL,              -- base64-encoded file content
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Defense-in-depth: RLS restricts access even if WHERE clauses are missing.
-- The server-side exec_sql function bypasses RLS (SECURITY DEFINER), so routes
-- must still enforce user isolation via WHERE user_id = ? patterns.
-- These policies protect against direct API access using the anon key.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tryon_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Users: owners can read/update their own row; admins can read all
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own user record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own user record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: INSERT on public.users is handled by the handle_new_user() trigger.
-- Direct INSERT is restricted to the trigger (which runs as SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Clothing Items
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own clothing"
  ON public.clothing_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clothing"
  ON public.clothing_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clothing"
  ON public.clothing_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clothing"
  ON public.clothing_items FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Outfits
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own outfits"
  ON public.outfits FOR SELECT
  USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can insert own outfits"
  ON public.outfits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own outfits"
  ON public.outfits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own outfits"
  ON public.outfits FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Outfit Items (join table — scoped via outfit ownership)
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own outfit items"
  ON public.outfit_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.outfits
      WHERE outfits.id = outfit_items.outfit_id
      AND (outfits.user_id = auth.uid() OR outfits.is_public = TRUE)
    )
  );

CREATE POLICY "Users can insert own outfit items"
  ON public.outfit_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.outfits
      WHERE outfits.id = outfit_items.outfit_id
      AND outfits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own outfit items"
  ON public.outfit_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.outfits
      WHERE outfits.id = outfit_items.outfit_id
      AND outfits.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Try-on Sessions
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own tryon sessions"
  ON public.tryon_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tryon sessions"
  ON public.tryon_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tryon sessions"
  ON public.tryon_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Diary Entries
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own diary entries"
  ON public.diary_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diary entries"
  ON public.diary_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diary entries"
  ON public.diary_entries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Files (internal base64 storage)
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can view own files"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- NPS Feedback
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.nps_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nps_feedback_user ON public.nps_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_nps_feedback_created ON public.nps_feedback(created_at);

ALTER TABLE public.nps_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own NPS feedback"
  ON public.nps_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own NPS feedback"
  ON public.nps_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================================================
-- Analytics Events
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON public.analytics_events(created_at);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own analytics events"
  ON public.analytics_events FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- =============================================================================
-- Push Tokens
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
  ON public.push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- DONE — Paste this entire file into Supabase SQL Editor and run it.
-- =============================================================================
