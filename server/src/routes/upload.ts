import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { image, filename } = req.body;
    if (!image) { res.status(400).json({ error: "请提供图片数据(base64)" }); return; }

    // Validate MIME type
    const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
    if (!mimeMatch || !ALLOWED_MIME_TYPES.includes(mimeMatch[1])) {
      res.status(400).json({ error: `不支持的图片格式，仅允许: ${ALLOWED_MIME_TYPES.join(', ')}` });
      return;
    }

    // Validate file size (base64 decoded size approximation)
    const base64Data = image.split(';base64,')[1] || '';
    const fileSizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    if (fileSizeInBytes > MAX_FILE_SIZE) {
      res.status(400).json({ error: `图片大小超过限制，最大允许 10MB` });
      return;
    }

    const id = uuid();
    const name = filename || `${id}.jpg`;

    await query(
      "INSERT INTO files (id, user_id, filename, data) VALUES (?, ?, ?, ?)",
      [id, req.userId!, name, image],
    );

    res.json({ url: `/api/file/${id}`, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
