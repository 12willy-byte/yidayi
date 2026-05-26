import { createClient, type Client } from "@libsql/client/web";
import { isSupabaseMode, supabaseQuery } from "./supabase.js";

// =============================================================================
// Backend Selection: Turso (SQLite/libsql) vs Supabase (PostgreSQL)
// =============================================================================
//
// Set SUPABASE_URL in server/.env to switch to Supabase mode.
// Without it, the server uses Turso as before (backward compatible).
//
// The `query()` function signature stays identical regardless of backend.
// All existing routes work without any code changes.

// ---------------------------------------------------------------------------
// Turso (SQLite) Mode
// ---------------------------------------------------------------------------

let _tursoDb: Client | null = null;

function getTursoDb(): Client {
  if (isSupabaseMode) {
    throw new Error("Turso client accessed in Supabase mode — this is a bug");
  }
  if (!_tursoDb) {
    const TURSO_URL = process.env.TURSO_DATABASE_URL;
    const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;
    if (!TURSO_URL || !TURSO_TOKEN) {
      throw new Error(
        "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required. " +
        "Set them in server/.env, or set SUPABASE_URL to use Supabase instead."
      );
    }
    _tursoDb = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  }
  return _tursoDb;
}

let _dbInstance: Client | null = null;

function getDb(): Client {
  if (isSupabaseMode) return null as unknown as Client;
  if (!_dbInstance) _dbInstance = getTursoDb();
  return _dbInstance;
}

/** @deprecated Use `query()` instead. Retained for backward compat only. */
export const db: Client = isSupabaseMode
  ? (null as unknown as Client)
  : getTursoDb();

// ---------------------------------------------------------------------------
// Unified query() — Works with BOTH backends
// ---------------------------------------------------------------------------

/**
 * Execute a SQL query against the active database backend.
 *
 * Turso mode (default):
 *   Uses `?` placeholders, SQLite syntax. `datetime('now')` etc.
 *
 * Supabase mode (SUPABASE_URL is set):
 *   `?` placeholders are translated to PostgreSQL-safe literals,
 *   SQLite date functions are translated to PG equivalents,
 *   and the query is executed via the `exec_sql` Postgres RPC function.
 *
 * Returns `{ rows: Record<string, unknown>[] }` — the same shape both backends provide.
 */
export async function query(
  sql: string,
  args?: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  if (isSupabaseMode) {
    return supabaseQuery(sql, args);
  }

  // Turso mode
  const db_ = getTursoDb();
  const result = await db_.execute({ sql, args: args as any });
  return { rows: result.rows as unknown as Record<string, unknown>[] };
}

// ---------------------------------------------------------------------------
// Database Initialization (Turso only — Supabase uses schema.sql migration)
// ---------------------------------------------------------------------------

export async function initDB(): Promise<void> {
  if (isSupabaseMode) {
    // Tables are created by running supabase/schema.sql in Supabase SQL Editor.
    // Verify the connection works by running a lightweight health check.
    try {
      await supabaseQuery("SELECT 1 AS ok");
      console.log("[db] Supabase connection verified.");
    } catch (err: any) {
      console.error("[db] Supabase connection failed:", err.message);
      throw err;
    }
    return;
  }

  // Turso mode — create tables if they don't exist
  const db_ = getTursoDb();
  await db_.executeMultiple(`
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

    CREATE INDEX IF NOT EXISTS idx_diary_user ON diary_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_diary_date ON diary_entries(date);

    CREATE TABLE IF NOT EXISTS nps_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
      feedback_text TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_name TEXT NOT NULL,
      event_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS push_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      token TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, token)
    );

    CREATE INDEX IF NOT EXISTS idx_nps_feedback_user ON nps_feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_nps_feedback_created ON nps_feedback(created_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
  `);
}
