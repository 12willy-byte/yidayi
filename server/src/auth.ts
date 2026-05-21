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

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerByEmail(email: string, password: string, username: string) {
  const existing = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
  if (existing.rows.length > 0) return { error: "该邮箱已注册" };

  const id = uuid();
  const password_hash = await hashPassword(password);

  await db.execute({
    sql: "INSERT INTO users (id, email, password_hash, username) VALUES (?, ?, ?, ?)",
    args: [id, email, password_hash, username || email.split("@")[0]],
  });

  await db.execute({ sql: "INSERT INTO profiles (id) VALUES (?)", args: [id] });

  return { user: { id, email, username } };
}

export async function loginByEmail(email: string, password: string) {
  const result = await db.execute({
    sql: "SELECT id, email, password_hash, username FROM users WHERE email = ?",
    args: [email],
  });
  const user = result.rows[0] as any;

  if (!user) return { error: "邮箱未注册" };
  if (!user.password_hash) return { error: "该账号使用微信登录，请用微信扫码" };

  const valid = await comparePassword(password, user.password_hash as string);
  if (!valid) return { error: "密码错误" };

  const token = generateToken({ userId: user.id as string, email: user.email as string });
  return { token, user: { id: user.id, email: user.email, username: user.username } };
}

export async function loginByWeChat(wechatInfo: {
  openid: string;
  unionid?: string;
  nickname: string;
  avatar_url: string;
}) {
  const { openid, unionid, nickname, avatar_url } = wechatInfo;

  const existing = await db.execute({
    sql: "SELECT id, email, username FROM users WHERE wechat_openid = ?",
    args: [openid],
  });
  const row = existing.rows[0] as any;

  if (row) {
    await db.execute({
      sql: "UPDATE users SET wechat_nickname = ?, wechat_avatar_url = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?",
      args: [nickname, avatar_url, avatar_url, row.id],
    });

    const token = generateToken({ userId: row.id, email: row.email });
    return { token, user: { id: row.id, email: row.email, username: row.username }, isNew: false };
  }

  const id = uuid();
  const email = `wx_${openid}@wechat.yidayi`;

  await db.execute({
    sql: "INSERT INTO users (id, email, wechat_openid, wechat_unionid, wechat_nickname, wechat_avatar_url, username, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, email, openid, unionid || null, nickname, avatar_url, nickname, avatar_url],
  });

  await db.execute({ sql: "INSERT INTO profiles (id) VALUES (?)", args: [id] });

  const token = generateToken({ userId: id, email });
  return { token, user: { id, email, username: nickname }, isNew: true };
}
