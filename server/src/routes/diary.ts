import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

// GET /api/diary
router.get("/", requireAuth, (req: AuthRequest, res: Response) => {
  const { year, month } = req.query;
  let sql = "SELECT * FROM diary_entries WHERE user_id = ?";
  const params: any[] = [req.userId!];

  if (year && month) {
    sql += " AND strftime('%Y', date) = ? AND strftime('%m', date) = ?";
    params.push(String(year), String(month).padStart(2, "0"));
  }

  sql += " ORDER BY date DESC";
  const entries = db.prepare(sql).all(...params) as any[];
  res.json(entries);
});

// GET /api/diary/:date
router.get("/:date", requireAuth, (req: AuthRequest, res: Response) => {
  const entry = db.prepare(
    "SELECT * FROM diary_entries WHERE user_id = ? AND date = ?"
  ).get(req.userId!, req.params.date) as any;

  if (!entry) { res.json(null); return; }
  res.json(entry);
});

// POST /api/diary
router.post("/", requireAuth, (req: AuthRequest, res: Response) => {
  const { date, photo_url, note, weather, temperature, outfit_id } = req.body;
  const id = uuid();

  try {
    db.prepare(
      `INSERT INTO diary_entries (id, user_id, date, photo_url, note, weather, temperature, outfit_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, req.userId!, date, photo_url || null, note || null, weather || null, temperature || null, outfit_id || null);
    res.json({ id, message: "保存成功" });
  } catch {
    res.status(409).json({ error: "当天已有记录" });
  }
});

// PUT /api/diary/:id
router.put("/:id", requireAuth, (req: AuthRequest, res: Response) => {
  const { photo_url, note, weather, temperature, outfit_id } = req.body;
  db.prepare(
    `UPDATE diary_entries SET photo_url = COALESCE(?, photo_url), note = COALESCE(?, note),
     weather = COALESCE(?, weather), temperature = COALESCE(?, temperature),
     outfit_id = COALESCE(?, outfit_id) WHERE id = ? AND user_id = ?`
  ).run(photo_url || null, note || null, weather || null, temperature || null, outfit_id || null,
    req.params.id, req.userId!);
  res.json({ message: "更新成功" });
});

export default router;
