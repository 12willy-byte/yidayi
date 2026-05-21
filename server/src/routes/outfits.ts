import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { page = "1", limit = "20" } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const result = await db.execute({
    sql: `SELECT o.*, u.username, u.avatar_url
     FROM outfits o JOIN users u ON o.user_id = u.id
     WHERE o.is_public = 1 OR o.user_id = ?
     ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    args: [req.userId!, Number(limit), offset],
  });
  const outfits = result.rows as any[];

  const data = await Promise.all(outfits.map(async (o: any) => {
    const itemsResult = await db.execute({
      sql: `SELECT oi.*, ci.name, ci.image_url, ci.removed_bg_url, ci.category
       FROM outfit_items oi JOIN clothing_items ci ON oi.clothing_item_id = ci.id
       WHERE oi.outfit_id = ? ORDER BY oi.position`,
      args: [o.id],
    });
    return { ...o, items: itemsResult.rows, is_public: !!o.is_public };
  }));

  res.json(data);
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const outfitResult = await db.execute({
    sql: `SELECT o.*, u.username, u.avatar_url
     FROM outfits o JOIN users u ON o.user_id = u.id WHERE o.id = ?`,
    args: [req.params.id],
  });
  const outfit = outfitResult.rows[0] as any;
  if (!outfit) { res.status(404).json({ error: "未找到" }); return; }

  const itemsResult = await db.execute({
    sql: `SELECT oi.*, ci.name, ci.image_url, ci.removed_bg_url, ci.category
     FROM outfit_items oi JOIN clothing_items ci ON oi.clothing_item_id = ci.id
     WHERE oi.outfit_id = ? ORDER BY oi.position`,
    args: [outfit.id],
  });

  res.json({ ...outfit, items: itemsResult.rows, is_public: !!outfit.is_public });
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, occasion, weather, is_public, items } = req.body;
  const id = uuid();

  await db.execute({
    sql: "INSERT INTO outfits (id, user_id, name, occasion, weather, is_public) VALUES (?, ?, ?, ?, ?, ?)",
    args: [id, req.userId!, name || null, occasion || null, weather || null, is_public ? 1 : 0],
  });

  if (items && Array.isArray(items)) {
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      await db.execute({
        sql: "INSERT INTO outfit_items (id, outfit_id, clothing_item_id, reason, position) VALUES (?, ?, ?, ?, ?)",
        args: [uuid(), id, item.clothing_item_id, item.reason || null, idx],
      });
    }
  }

  res.json({ id, message: "创建成功" });
});

router.post("/:id/like", requireAuth, async (req: AuthRequest, res: Response) => {
  await db.execute({ sql: "UPDATE outfits SET likes_count = likes_count + 1 WHERE id = ?", args: [req.params.id] });
  res.json({ message: "已点赞" });
});

export default router;
