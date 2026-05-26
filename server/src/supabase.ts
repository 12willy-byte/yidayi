import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// =============================================================================
// Supabase Client Initialization
// =============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Whether the server is configured to use Supabase (instead of Turso/SQLite). */
export const isSupabaseMode = !!SUPABASE_URL;

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_ANON_KEY are required in Supabase mode. " +
      "Set them in server/.env"
    );
  }
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

/**
 * Returns a Supabase client initialized with the service_role key.
 * This client bypasses RLS — use only for server-side internal operations.
 */
function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for admin operations. " +
      "Set them in server/.env"
    );
  }
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return _supabaseAdmin;
}

/** Public Supabase client (respects RLS). */
export const supabase = isSupabaseMode ? getSupabase() : (null as unknown as SupabaseClient);

/** Admin Supabase client (bypasses RLS). Used by the query() adapter. */
export const supabaseAdmin = isSupabaseMode ? getSupabaseAdmin() : (null as unknown as SupabaseClient);

// =============================================================================
// SQL Translation Helpers
// =============================================================================

/**
 * Translates SQLite-specific date/time functions to PostgreSQL equivalents.
 * Called on raw SQL strings before executing against Supabase.
 */
function translateSqliteToPg(sql: string): string {
  return sql
    // datetime('now', '-N days')  → NOW() - INTERVAL 'N days'
    .replace(/datetime\('now',\s*'(-?\d+)\s*days?'\)/gi, "NOW() + INTERVAL '$1 days'")
    // datetime('now') → NOW()
    .replace(/datetime\('now'\)/gi, "NOW()")
    // date('now')  → CURRENT_DATE
    .replace(/date\('now'\)/gi, "CURRENT_DATE")
    // strftime('%Y', col)  → TO_CHAR(col, 'YYYY')
    .replace(/strftime\('%Y',\s*([\w.]+)\)/gi, "TO_CHAR($1, 'YYYY')")
    // strftime('%m', col)  → TO_CHAR(col, 'MM')
    .replace(/strftime\('%m',\s*([\w.]+)\)/gi, "TO_CHAR($1, 'MM')");
}

/**
 * Escapes a JavaScript value into a PostgreSQL-safe literal string.
 * - null/undefined → NULL
 * - number        → unquoted number
 * - boolean       → TRUE / FALSE
 * - string        → 'escaped string literal' (single quotes doubled per SQL standard)
 * - other (array/object) → JSON string literal
 */
function pgEscapeLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "number") {
    // NaN and Infinity don't exist in PG — coerce to NULL
    if (!Number.isFinite(value)) return "NULL";
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }
  if (typeof value === "string") {
    // Double any single quotes, then wrap in single quotes
    return "'" + value.replace(/'/g, "''") + "'";
  }
  // Arrays, objects, etc. → JSON string
  return pgEscapeLiteral(JSON.stringify(value));
}

/**
 * Replaces `?` positional placeholders in a SQL string with properly escaped
 * PostgreSQL literal values.  Produces a complete, self-contained SQL string
 * suitable for passing to exec_sql().
 *
 * Example:
 *   buildPgQuery("SELECT * FROM t WHERE a = ? AND b = ?", [1, "hello"])
 *   → "SELECT * FROM t WHERE a = 1 AND b = 'hello'"
 */
export function buildPgQuery(sql: string, args?: unknown[]): string {
  const translated = translateSqliteToPg(sql);

  if (!args || args.length === 0) {
    return translated;
  }

  let result = "";
  let argIndex = 0;
  let i = 0;

  while (i < translated.length) {
    const ch = translated[i];
    // Check for unescaped `?` placeholder
    if (ch === "?" && (i === 0 || translated[i - 1] !== "\\")) {
      if (argIndex >= args.length) {
        throw new Error(
          `buildPgQuery: not enough arguments for placeholders in SQL: ${sql.slice(0, 100)}`
        );
      }
      result += pgEscapeLiteral(args[argIndex]);
      argIndex++;
    } else {
      result += ch;
    }
    i++;
  }

  return result;
}

/**
 * Raw SQL query execution against Supabase PostgreSQL via the exec_sql RPC.
 *
 * Returns `{ rows: any[] }` — compatible with the Turso `query()` return shape
 * that all existing routes expect.
 */
export async function supabaseQuery(
  sql: string,
  args?: unknown[]
): Promise<{ rows: Record<string, unknown>[] }> {
  const queryText = buildPgQuery(sql, args);

  const { data, error } = await supabaseAdmin.rpc("exec_sql", {
    query_text: queryText,
  });

  if (error) {
    // PostgreSQL errors come through as { message, code, ... }
    throw new Error(`Supabase query error: ${error.message || JSON.stringify(error)}`);
  }

  // exec_sql always returns JSONB (either an array of rows or [])
  const rows: Record<string, unknown>[] = Array.isArray(data) ? (data as any[]) : [];
  return { rows };
}

// =============================================================================
// Supabase Auth Helpers
// =============================================================================

/**
 * Register a new user via Supabase Auth, then create the public.users row
 * and public.profiles row (if not already created by the DB trigger).
 */
export async function supabaseSignUp(
  email: string,
  password: string,
  username: string
): Promise<{ token: string; user: Record<string, unknown> } | { error: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: username || email.split("@")[0] },
    },
  });

  if (error) {
    // Map Supabase error messages to Chinese for the frontend
    if (error.message?.includes("already registered") || error.message?.includes("already exists")) {
      return { error: "该邮箱已注册" };
    }
    return { error: error.message || "注册失败" };
  }

  const supabaseUser = data.user;
  if (!supabaseUser) {
    return { error: "注册失败：未返回用户信息" };
  }

  // Ensure the public.users row exists (the DB trigger handle_new_user should
  // have created it, but we manually insert as a fallback).
  await supabaseAdmin.rpc("exec_sql", {
    query_text: buildPgQuery(
      `INSERT INTO users (id, email, username, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [supabaseUser.id, supabaseUser.email, username || email.split("@")[0]]
    ),
  });

  await supabaseAdmin.rpc("exec_sql", {
    query_text: buildPgQuery(
      `INSERT INTO profiles (id) VALUES (?) ON CONFLICT (id) DO NOTHING`,
      [supabaseUser.id]
    ),
  });

  return {
    token: data.session?.access_token || "",
    user: { id: supabaseUser.id, email: supabaseUser.email, username },
  };
}

/**
 * Sign in an existing user via Supabase Auth.
 */
export async function supabaseSignIn(
  email: string,
  password: string
): Promise<{ token: string; user: Record<string, unknown> } | { error: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message?.includes("Invalid login") || error.message?.includes("invalid")) {
      return { error: "邮箱或密码错误" };
    }
    if (error.message?.includes("Email not confirmed")) {
      return { error: "请先验证邮箱" };
    }
    return { error: error.message || "登录失败" };
  }

  const supabaseUser = data.user;
  if (!supabaseUser) {
    return { error: "登录失败：未返回用户信息" };
  }

  // Look up the public.users row for the username
  const { data: userRows } = await supabaseAdmin.rpc("exec_sql", {
    query_text: buildPgQuery(
      "SELECT id, email, username FROM users WHERE id = ?",
      [supabaseUser.id]
    ),
  });

  const row = Array.isArray(userRows) ? (userRows[0] as any) : null;

  return {
    token: data.session?.access_token || "",
    user: {
      id: supabaseUser.id,
      email: supabaseUser.email,
      username: row?.username || supabaseUser.email?.split("@")[0],
    },
  };
}

/**
 * Verify a Supabase-issued JWT and return the authenticated user's ID.
 * Calls Supabase GoTrue GET /auth/v1/user with the provided token.
 * Returns `userId` on success, or `null` if the token is invalid/expired.
 */
export async function supabaseVerifyToken(token: string): Promise<{
  userId: string;
  email?: string;
} | null> {
  // Call GoTrue /auth/v1/user with the provided JWT
  const res = await fetch(`${SUPABASE_URL!}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY!,
    },
  });

  if (!res.ok) {
    return null;
  }

  const user = await res.json();
  if (!user || !user.id) {
    return null;
  }

  return { userId: user.id as string, email: user.email as string };
}

// =============================================================================
// WeChat Login (Supabase mode)
// =============================================================================
// Supabase Auth does not natively support WeChat OAuth.  We implement a custom
// flow that bridges WeChat identity with Supabase Auth:
//
//   1. Exchange WeChat code for openid / userinfo (handled in the route)
//   2. Derive a deterministic email (wx_{openid}@wechat.yidayi) and password
//   3. Attempt sign-in → if it succeeds the user already exists in auth.users
//   4. On failure, look up or create the auth user via the Admin API
//   5. Sync wechat_openid / profile info into public.users
//
// The deterministic password is derived from the openid and a server-side
// secret so we never store plaintext passwords.

/** Derives a deterministic password for a WeChat user from their openid. */
function deriveWeChatPassword(openid: string): string {
  const secret = process.env.WECHAT_PASSWORD_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || "yidayi-wechat-fallback-secret";
  // Scramble openid with secret to produce a unique-but-deterministic password
  const mixed = openid + ":" + secret.slice(0, 24);
  // Simple hash — not cryptographic; only used as a password seed
  let hash = 0;
  for (let i = 0; i < mixed.length; i++) {
    hash = ((hash << 5) - hash + mixed.charCodeAt(i)) | 0;
  }
  return `Wx${Math.abs(hash).toString(36).slice(0, 14)}!`;
}

export async function supabaseWeChatLogin(wechatInfo: {
  openid: string;
  unionid?: string;
  nickname: string;
  avatar_url: string;
}): Promise<{
  token: string;
  user: Record<string, unknown>;
  isNew: boolean;
} | { error: string }> {
  const { openid, unionid, nickname, avatar_url } = wechatInfo;
  const email = `wx_${openid}@wechat.yidayi`;
  const password = deriveWeChatPassword(openid);

  // ------------------------------------------------------------------
  // Step 1: Try signing in — works if this WeChat user already exists
  //         in Supabase Auth (auth.users).
  // ------------------------------------------------------------------
  let signInResult = await supabase.auth.signInWithPassword({ email, password });

  if (!signInResult.error && signInResult.data.session) {
    // Existing user — sync profile info into public.users
    await syncWeChatProfile(
      signInResult.data.user.id,
      openid, unionid, nickname, avatar_url
    );

    const userRow = await getPublicUser(signInResult.data.user.id);
    return {
      token: signInResult.data.session.access_token,
      user: {
        id: signInResult.data.user.id,
        email: signInResult.data.user.email,
        username: userRow?.username || nickname,
      },
      isNew: false,
    };
  }

  // ------------------------------------------------------------------
  // Step 2: Sign-in failed — the user may not exist yet, or their
  //         password was changed.  Check public.users for wechat_openid.
  // ------------------------------------------------------------------
  const existingPublic = await getPublicUserByWeChatOpenId(openid);
  let authUserId: string;
  let isNew = false;

  if (existingPublic) {
    // Migration scenario: public.users row exists but auth.users may not.
    // Try to ensure an auth.user exists with this email.
    authUserId = existingPublic.id;

    try {
      // Attempt to create — if the user already exists this will fail,
      // so we fall through to password reset.
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { wechat_openid: openid, wechat_nickname: nickname },
      });
    } catch {
      // auth.users entry already exists — update its password so we can sign in
      try {
        // Find auth user by email (admin API lookup)
        const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
        const match = authUsers?.users?.find(
          (u: any) => u.email === email || u.id === authUserId
        );
        if (match) {
          authUserId = match.id;
          await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
        }
      } catch {
        // If everything fails, create a new auth user and update public.users
        const newAuth = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { wechat_openid: openid },
        });
        if (!newAuth.error && newAuth.data.user) {
          authUserId = newAuth.data.user.id;
          // Update public.users id to match new auth.users id
          await supabaseAdmin.rpc("exec_sql", {
            query_text: buildPgQuery(
              "UPDATE users SET id = ? WHERE id = ?",
              [authUserId, existingPublic.id]
            ),
          });
        }
      }
    }
  } else {
    // ------------------------------------------------------------------
    // Step 3: Brand-new WeChat user — create auth.users + public.users
    // ------------------------------------------------------------------
    const { data: createdUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          wechat_openid: openid,
          wechat_unionid: unionid,
          wechat_nickname: nickname,
          wechat_avatar_url: avatar_url,
        },
      });

    if (createError || !createdUser.user) {
      return { error: `创建微信用户失败: ${createError?.message || "未知错误"}` };
    }

    authUserId = createdUser.user.id;
    isNew = true;
  }

  // ------------------------------------------------------------------
  // Step 4: Sync public.users with WeChat profile info
  // ------------------------------------------------------------------
  await syncWeChatProfile(authUserId, openid, unionid, nickname, avatar_url);

  // ------------------------------------------------------------------
  // Step 5: Sign in to get a valid Supabase JWT
  // ------------------------------------------------------------------
  signInResult = await supabase.auth.signInWithPassword({ email, password });

  if (signInResult.error || !signInResult.data.session) {
    return { error: "微信登录失败：无法获取会话" };
  }

  return {
    token: signInResult.data.session.access_token,
    user: { id: authUserId, email, username: nickname },
    isNew,
  };
}

// ---- WeChat helpers (internal) ------------------------------------------------

async function getPublicUserByWeChatOpenId(openid: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabaseAdmin.rpc("exec_sql", {
    query_text: buildPgQuery(
      "SELECT id, email, username FROM users WHERE wechat_openid = ?",
      [openid]
    ),
  });
  const rows = Array.isArray(data) ? data : [];
  return (rows[0] as Record<string, unknown>) || null;
}

async function getPublicUser(userId: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabaseAdmin.rpc("exec_sql", {
    query_text: buildPgQuery(
      "SELECT id, email, username FROM users WHERE id = ?",
      [userId]
    ),
  });
  const rows = Array.isArray(data) ? data : [];
  return (rows[0] as Record<string, unknown>) || null;
}

async function syncWeChatProfile(
  userId: string,
  openid: string,
  unionid: string | undefined,
  nickname: string,
  avatar_url: string
): Promise<void> {
  // Upsert: insert if not exists, update if exists
  await supabaseAdmin.rpc("exec_sql", {
    query_text: buildPgQuery(
      `INSERT INTO users (id, email, wechat_openid, wechat_unionid, wechat_nickname, wechat_avatar_url, username, avatar_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         wechat_nickname = EXCLUDED.wechat_nickname,
         wechat_avatar_url = EXCLUDED.wechat_avatar_url,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = NOW()`,
      [userId, `wx_${openid}@wechat.yidayi`, openid, unionid || null, nickname, avatar_url, nickname, avatar_url]
    ),
  });

  // Ensure profile row exists
  await supabaseAdmin.rpc("exec_sql", {
    query_text: buildPgQuery(
      "INSERT INTO profiles (id) VALUES (?) ON CONFLICT (id) DO NOTHING",
      [userId]
    ),
  });
}
