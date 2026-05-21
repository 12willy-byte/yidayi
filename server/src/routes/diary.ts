import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { year, month } = req.query;
  let sql = "SELECT * FROM diary_entries WHERE user_id = ?";
  const args: any[] = [req.userId!];

  if (year && month) {
    sql += " AND strftime('%Y', date) = ? AND strftime('%m', date) = ?";
    args.push(String(year), String(month).padStart(2, "0"));
  }

  sql += " ORDER BY date DESC";
  const result = await db.execute({ sql, args });
  res.json(result.rows);
});

router.get("/:date", requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await db.execute({
    sql: "SELECT * FROM diary_entries WHERE user_id = ? AND date = ?",
    args: [req.userId!, req.params.date],
  });
  const entry = result.rows[0] as any;
  if (!entry) { res.json(null); return; }
  res.json(entry);
});

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const { date, photo_url, note, weather, temperature, outfit_id } = req.body;
  const id = uuid();

  try {
    await db.execute({
      sql: `INSERT INTO diary_entries (id, user_id, date, photo_url, note, weather, temperature, outfit_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, req.userId!, date, photo_url || null, note || null, weather || null, temperature || null, outfit_id || null],
    });
    res.json({ id, message: "保存成功" });
  } catch {
    res.status(409).json({ error: "当天已有记录" });
  }
});

router.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const { photo_url, note, weather, temperature, outfit_id } = req.body;
  await db.execute({
    sql: `UPDATE diary_entries SET photo_url = COALESCE(?, photo_url), note = COALESCE(?, note),
     weather = COALESCE(?, weather), temperature = COALESCE(?, temperature),
     outfit_id = COALESCE(?, outfit_id) WHERE id = ? AND user_id = ?`,
    args: [photo_url || null, note || null, weather || null, temperature || null, outfit_id || null, req.params.id, req.userId!],
  });
  res.json({ message: "更新成功" });
});

export default router;
