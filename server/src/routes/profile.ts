import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const u = await db.execute({
    sql: "SELECT id, email, username, avatar_url, wechat_nickname FROM users WHERE id = ?",
    args: [req.userId!],
  });
  const user = u.rows[0] as any;

  const p = await db.execute({ sql: "SELECT * FROM profiles WHERE id = ?", args: [req.userId!] });
  const profile = p.rows[0] as any;

  res.json({
    ...user,
    bio: profile?.bio || null,
    height: profile?.height || null,
    weight: profile?.weight || null,
    body_type: profile?.body_type || null,
    style_tags: JSON.parse((profile?.style_tags as string) || "[]"),
    is_public: !!profile?.is_public,
  });
});

router.put("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { username, bio, height, weight, body_type, style_tags, is_public, avatar_url } = req.body;

  await db.execute({
    sql: "UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?",
    args: [username || null, avatar_url || null, req.userId!],
  });

  await db.execute({
    sql: `UPDATE profiles SET bio = COALESCE(?, bio), height = COALESCE(?, height), weight = COALESCE(?, weight),
     body_type = COALESCE(?, body_type), style_tags = COALESCE(?, style_tags),
     is_public = COALESCE(?, is_public), updated_at = datetime('now') WHERE id = ?`,
    args: [
      bio || null, height || null, weight || null, body_type || null,
      style_tags ? JSON.stringify(style_tags) : null,
      is_public !== undefined ? (is_public ? 1 : 0) : null,
      req.userId!,
    ],
  });

  const updated = await db.execute({
    sql: "SELECT id, email, username, avatar_url FROM users WHERE id = ?",
    args: [req.userId!],
  });

  res.json(updated.rows[0]);
});

export default router;
