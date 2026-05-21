import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { category, search } = req.query;
  let sql = "SELECT * FROM clothing_items WHERE user_id = ?";
  const args: any[] = [req.userId!];

  if (category && category !== "all") { sql += " AND category = ?"; args.push(category); }
  if (search) { sql += " AND name LIKE ?"; args.push(`%${search}%`); }
  sql += " ORDER BY created_at DESC";

  const result = await db.execute({ sql, args });
  const items = result.rows as any[];
  res.json(items.map((i: any) => ({
    ...i,
    colors: JSON.parse(i.colors || "[]"),
    seasons: JSON.parse(i.seasons || "[]"),
    tags: JSON.parse(i.tags || "[]"),
  })));
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await db.execute({
    sql: "SELECT * FROM clothing_items WHERE id = ? AND user_id = ?",
    args: [req.params.id, req.userId!],
  });
  const item = result.rows[0] as any;
  if (!item) { res.status(404).json({ error: "未找到" }); return; }

  res.json({
    ...item,
    colors: JSON.parse(item.colors || "[]"),
    seasons: JSON.parse(item.seasons || "[]"),
    tags: JSON.parse(item.tags || "[]"),
  });
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, category, colors, seasons, brand, tags, image_url } = req.body;
  if (!name || !category) { res.status(400).json({ error: "名称和分类必填" }); return; }

  const id = uuid();
  await db.execute({
    sql: `INSERT INTO clothing_items (id, user_id, name, category, colors, seasons, brand, tags, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, req.userId!, name, category,
      JSON.stringify(colors || []), JSON.stringify(seasons || []),
      brand || null, JSON.stringify(tags || []), image_url || ""],
  });

  res.json({ id, message: "添加成功" });
});

router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { name, category, colors, seasons, brand, tags, image_url, removed_bg_url } = req.body;

  await db.execute({
    sql: `UPDATE clothing_items SET name = COALESCE(?, name), category = COALESCE(?, category),
     colors = COALESCE(?, colors), seasons = COALESCE(?, seasons), brand = COALESCE(?, brand),
     tags = COALESCE(?, tags), image_url = COALESCE(?, image_url),
     removed_bg_url = COALESCE(?, removed_bg_url), updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
    args: [name || null, category || null,
      colors ? JSON.stringify(colors) : null, seasons ? JSON.stringify(seasons) : null,
      brand || null, tags ? JSON.stringify(tags) : null,
      image_url || null, removed_bg_url || null,
      req.params.id, req.userId!],
  });

  res.json({ message: "更新成功" });
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  await db.execute({
    sql: "DELETE FROM clothing_items WHERE id = ? AND user_id = ?",
    args: [req.params.id, req.userId!],
  });
  res.json({ message: "已删除" });
});

export default router;
