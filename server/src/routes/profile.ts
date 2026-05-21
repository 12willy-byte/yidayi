import { Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

// GET /api/profile
router.get("/", requireAuth, (req: AuthRequest, res: Response) => {
  const user = db.prepare(
    "SELECT id, email, username, avatar_url, wechat_nickname FROM users WHERE id = ?"
  ).get(req.userId!) as any;

  const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(req.userId!) as any;

  res.json({
    ...user,
    bio: profile?.bio || null,
    height: profile?.height || null,
    weight: profile?.weight || null,
    body_type: profile?.body_type || null,
    style_tags: JSON.parse(profile?.style_tags || "[]"),
    is_public: !!profile?.is_public,
  });
});

// PUT /api/profile
router.put("/", requireAuth, (req: AuthRequest, res: Response) => {
  const { username, bio, height, weight, body_type, style_tags, is_public, avatar_url } = req.body;

  db.prepare(
    "UPDATE users SET username = COALESCE(?, username), avatar_url = COALESCE(?, avatar_url), updated_at = datetime('now') WHERE id = ?"
  ).run(username || null, avatar_url || null, req.userId!);

  db.prepare(
    `UPDATE profiles SET bio = COALESCE(?, bio), height = COALESCE(?, height), weight = COALESCE(?, weight),
     body_type = COALESCE(?, body_type), style_tags = COALESCE(?, style_tags),
     is_public = COALESCE(?, is_public), updated_at = datetime('now') WHERE id = ?`
  ).run(
    bio || null, height || null, weight || null, body_type || null,
    style_tags ? JSON.stringify(style_tags) : null,
    is_public !== undefined ? (is_public ? 1 : 0) : null,
    req.userId!
  );

  const updated = db.prepare(
    "SELECT id, email, username, avatar_url FROM users WHERE id = ?"
  ).get(req.userId!) as any;

  res.json(updated);
});

export default router;
