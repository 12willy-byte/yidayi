import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

// GET /api/outfits — public feed + own outfits
router.get("/", requireAuth, (req: AuthRequest, res: Response) => {
  const { page = "1", limit = "20" } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const outfits = db.prepare(`
    SELECT o.*, u.username, u.avatar_url
    FROM outfits o JOIN users u ON o.user_id = u.id
    WHERE o.is_public = 1 OR o.user_id = ?
    ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(req.userId!, Number(limit), offset) as any[];

  res.json(outfits.map((o: any) => {
    const items = db.prepare(`
      SELECT oi.*, ci.name, ci.image_url, ci.removed_bg_url, ci.category
      FROM outfit_items oi JOIN clothing_items ci ON oi.clothing_item_id = ci.id
      WHERE oi.outfit_id = ?
      ORDER BY oi.position
    `).all(o.id);

    return { ...o, items, is_public: !!o.is_public };
  }));
});

// GET /api/outfits/:id
router.get("/:id", requireAuth, (req: AuthRequest, res: Response) => {
  const outfit = db.prepare(`
    SELECT o.*, u.username, u.avatar_url
    FROM outfits o JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).get(req.params.id) as any;

  if (!outfit) { res.status(404).json({ error: "未找到" }); return; }

  const items = db.prepare(`
    SELECT oi.*, ci.name, ci.image_url, ci.removed_bg_url, ci.category
    FROM outfit_items oi JOIN clothing_items ci ON oi.clothing_item_id = ci.id
    WHERE oi.outfit_id = ? ORDER BY oi.position
  `).all(outfit.id);

  res.json({ ...outfit, items, is_public: !!outfit.is_public });
});

// POST /api/outfits
router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  const { name, occasion, weather, is_public, items } = req.body;
  const id = uuid();

  db.prepare(
    `INSERT INTO outfits (id, user_id, name, occasion, weather, is_public)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId!, name || null, occasion || null, weather || null, is_public ? 1 : 0);

  if (items && Array.isArray(items)) {
    items.forEach((item: any, idx: number) => {
      db.prepare(
        `INSERT INTO outfit_items (id, outfit_id, clothing_item_id, reason, position)
         VALUES (?, ?, ?, ?, ?)`
      ).run(uuid(), id, item.clothing_item_id, item.reason || null, idx);
    });
  }

  res.json({ id, message: "创建成功" });
});

// POST /api/outfits/:id/like
router.post("/:id/like", requireAuth, (req: AuthRequest, res: Response) => {
  db.prepare("UPDATE outfits SET likes_count = likes_count + 1 WHERE id = ?")
    .run(req.params.id);
  res.json({ message: "已点赞" });
});

export default router;
