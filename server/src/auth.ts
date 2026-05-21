import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db } from "./db.js";

const JWT_SECRET: string = process.env.JWT_SECRET ?? (() => {
  throw new Error("FATAL: JWT_SECRET environment variable is required. Set it before starting the server.");
})();
const JWT_EXPIRES = "30d";

export interface TokenPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as TokenPayload;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Email registration
export async function registerByEmail(email: string, password: string, username: string) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return { error: "该邮箱已注册" };

  const id = uuid();
  const password_hash = await hashPassword(password);

  db.prepare(
    "INSERT INTO users (id, email, password_hash, username) VALUES (?, ?, ?, ?)"
  ).run(id, email, password_hash, username || email.split("@")[0]);

  db.prepare(
    "INSERT INTO profiles (id) VALUES (?)"
  ).run(id);

  return { user: { id, email, username } };
}

// Email login
export async function loginByEmail(email: string, password: string) {
  const user = db.prepare(
    "SELECT id, email, password_hash, username FROM users WHERE email = ?"
  ).get(email) as any;

  if (!user) return { error: "邮箱未注册" };
  if (!user.password_hash) return { error: "该账号使用微信登录，请用微信扫码" };

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) return { error: "密码错误" };

  const token = generateToken({ userId: user.id, email: user.email });
  return { token, user: { id: user.id, email: user.email, username: user.username } };
}

// WeChat OAuth — find or create user
export async function loginByWeChat(wechatInfo: {
  openid: string;
  unionid?: string;
  nickname: string;
  avatar_url: string;
}) {
  const { openid, unionid, nickname, avatar_url } = wechatInfo;

  // Try to find existing user
  const existing = db.prepare(
    "SELECT id, email, username FROM users WHERE wechat_openid = ?"
  ).get(openid) as any;

  if (existing) {
    // Update WeChat info
    db.prepare(
      "UPDATE users SET wechat_nickname = ?, wechat_avatar_url = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(nickname, avatar_url, avatar_url, existing.id);

    const token = generateToken({ userId: existing.id, email: existing.email });
    return { token, user: { id: existing.id, email: existing.email, username: existing.username }, isNew: false };
  }

  // Create new user
  const id = uuid();
  const email = `wx_${openid}@wechat.yidayi`;

  db.prepare(
    "INSERT INTO users (id, email, wechat_openid, wechat_unionid, wechat_nickname, wechat_avatar_url, username, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, email, openid, unionid || null, nickname, avatar_url, nickname, avatar_url);

  db.prepare("INSERT INTO profiles (id) VALUES (?)").run(id);

  const token = generateToken({ userId: id, email });
  return { token, user: { id, email, username: nickname }, isNew: true };
}
