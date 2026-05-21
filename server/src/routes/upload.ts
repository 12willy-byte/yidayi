import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { db } from "../db.js";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { image, filename } = req.body;
    if (!image) { res.status(400).json({ error: "请提供图片数据(base64)" }); return; }

    const id = uuid();
    const name = filename || `${id}.jpg`;

    await db.execute({
      sql: "INSERT INTO files (id, user_id, filename, data) VALUES (?, ?, ?, ?)",
      args: [id, req.userId!, name, image],
    });

    res.json({ url: `/api/file/${id}`, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
