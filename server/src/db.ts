import { createClient, type Client } from "@libsql/client/web";

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  throw new Error("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required. Set them in .env");
}

export const db: Client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function query(sql: string, args?: any[]) {
  return db.execute({ sql, args: args as any });
}

export async function initDB() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      wechat_openid TEXT UNIQUE,
      wechat_unionid TEXT,
      wechat_nickname TEXT,
      wechat_avatar_url TEXT,
      username TEXT,
      avatar_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY REFERENCES users(id),
      bio TEXT,
      height REAL,
      weight REAL,
      body_type TEXT,
      style_tags TEXT DEFAULT '[]',
      is_public INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clothing_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('top','bottom','outerwear','dress','shoes','accessories')),
      colors TEXT DEFAULT '[]',
      seasons TEXT DEFAULT '[]',
      brand TEXT,
      tags TEXT DEFAULT '[]',
      image_url TEXT NOT NULL,
      removed_bg_url TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT,
      occasion TEXT,
      weather TEXT,
      is_public INTEGER DEFAULT 0,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outfit_items (
      id TEXT PRIMARY KEY,
      outfit_id TEXT NOT NULL REFERENCES outfits(id),
      clothing_item_id TEXT NOT NULL REFERENCES clothing_items(id),
      reason TEXT,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tryon_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      outfit_id TEXT NOT NULL REFERENCES outfits(id),
      model_type TEXT NOT NULL CHECK (model_type IN ('virtual','user')),
      user_photo_url TEXT,
      result_url TEXT,
      status TEXT DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
      feedback INTEGER CHECK (feedback >= 1 AND feedback <= 5),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS diary_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      outfit_id TEXT REFERENCES outfits(id),
      photo_url TEXT,
      note TEXT,
      weather TEXT,
      temperature REAL,
      date TEXT NOT NULL DEFAULT (date('now')),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_clothing_user ON clothing_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id);
    CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit ON outfit_items(outfit_id);
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      filename TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_clothing_user ON clothing_items(user_id);
    CREATE INDEX IF NOT EXISTS idx_outfits_user ON outfits(user_id);
    CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit ON outfit_items(outfit_id);
    CREATE INDEX IF NOT EXISTS idx_diary_user ON diary_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_diary_date ON diary_entries(date);
  `);
}
