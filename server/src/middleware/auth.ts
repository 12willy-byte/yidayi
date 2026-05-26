import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../auth.js";
import { isSupabaseMode, supabaseVerifyToken } from "../supabase.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "未登录" });
    return;
  }

  const token = header.slice(7);

  if (isSupabaseMode) {
    // Supabase mode: verify the Supabase-issued JWT via Supabase Auth API
    supabaseVerifyToken(token)
      .then((payload) => {
        if (!payload) {
          res.status(401).json({ error: "登录已过期，请重新登录" });
          return;
        }
        req.userId = payload.userId;
        next();
      })
      .catch(() => {
        res.status(401).json({ error: "登录已过期，请重新登录" });
      });
    return;
  }

  // Turso mode: verify the manually-signed JWT
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}
