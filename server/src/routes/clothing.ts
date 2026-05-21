import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

// GET /api/clothing
router.get("/", requireAuth, (req: AuthRequest, res: Response) => {
  const { category, search } = req.query;
  let sql = "SELECT * FROM clothing_items WHERE user_id = ?";
  const params: any[] = [req.userId!];

  if (category && category !== "all") {
    sql += " AND category = ?";
    params.push(category);
  }
  if (search) {
    sql += " AND name LIKE ?";
    params.push(`%${search}%`);
  }
  sql += " ORDER BY created_at DESC";

  const items = db.prepare(sql).all(...params) as any[];
  res.json(items.map((i: any) => ({
    ...i,
    colors: JSON.parse(i.colors || "[]"),
    seasons: JSON.parse(i.seasons || "[]"),
    tags: JSON.parse(i.tags || "[]"),
  })));
});

// GET /api/clothing/:id
router.get("/:id", requireAuth, (req: AuthRequest, res: Response) => {
  const item = db.prepare(
    "SELECT * FROM clothing_items WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.userId!) as any;

  if (!item) { res.status(404).json({ error: "未找到" }); return; }

  res.json({
    ...item,
    colors: JSON.parse(item.colors || "[]"),
    seasons: JSON.parse(item.seasons || "[]"),
    tags: JSON.parse(item.tags || "[]"),
  });
});

// POST /api/clothing
router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  const { name, category, colors, seasons, brand, tags, image_url } = req.body;
  if (!name || !category) { res.status(400).json({ error: "名称和分类必填" }); return; }

  const id = uuid();
  db.prepare(
    `INSERT INTO clothing_items (id, user_id, name, category, colors, seasons, brand, tags, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, req.userId!, name, category,
    JSON.stringify(colors || []), JSON.stringify(seasons || []),
    brand || null, JSON.stringify(tags || []), image_url || "");

  res.json({ id, message: "添加成功" });
});

// PUT /api/clothing/:id
router.put("/:id", requireAuth, (req: AuthRequest, res: Response) => {
  const { name, category, colors, seasons, brand, tags, image_url, removed_bg_url } = req.body;

  db.prepare(
    `UPDATE clothing_items SET name = COALESCE(?, name), category = COALESCE(?, category),
     colors = COALESCE(?, colors), seasons = COALESCE(?, seasons), brand = COALESCE(?, brand),
     tags = COALESCE(?, tags), image_url = COALESCE(?, image_url),
     removed_bg_url = COALESCE(?, removed_bg_url), updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`
  ).run(
    name || null, category || null,
    colors ? JSON.stringify(colors) : null,
    seasons ? JSON.stringify(seasons) : null,
    brand || null,
    tags ? JSON.stringify(tags) : null,
    image_url || null, removed_bg_url || null,
    req.params.id, req.userId!
  );

  res.json({ message: "更新成功" });
});

// DELETE /api/clothing/:id
router.delete("/:id", requireAuth, (req: AuthRequest, res: Response) => {
  db.prepare("DELETE FROM clothing_items WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.userId!);
  res.json({ message: "已删除" });
});

export default router;
