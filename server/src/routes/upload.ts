import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { AuthRequest, requireAuth } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".heic"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router = Router();

// POST /api/upload
router.post("/", requireAuth, upload.single("file"), (req: AuthRequest, res: Response) => {
  if (!req.file) { res.status(400).json({ error: "请选择图片文件" }); return; }

  const baseUrl = `${req.protocol}://${req.get("host")}`;
  res.json({ url: `${baseUrl}/uploads/${req.file.filename}` });
});

// Serve static files from uploads
export { UPLOADS };

export default router;
