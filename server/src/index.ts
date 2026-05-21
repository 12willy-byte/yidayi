import 'dotenv/config';
import express from "express";
import cors from "cors";
import { initDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import clothingRoutes from "./routes/clothing.js";
import outfitsRoutes from "./routes/outfits.js";
import diaryRoutes from "./routes/diary.js";
import aiRoutes from "./routes/ai.js";
import uploadRoutes from "./routes/upload.js";
import { db } from "./db.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

let dbReady = false;

async function ensureDB() {
  if (!dbReady) {
    await initDB();
    dbReady = true;
  }
}

// Init database before first request
app.use(async (_req, _res, next) => {
  await ensureDB();
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/clothing", clothingRoutes);
app.use("/api/outfits", outfitsRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);

// Serve uploaded files from Turso
app.get("/api/file/:id", async (req, res) => {
  try {
    const result = await db.execute({
      sql: "SELECT filename, data FROM files WHERE id = ?",
      args: [req.params.id],
    });
    const row = result.rows[0] as any;
    if (!row) { res.status(404).json({ error: "文件不存在" }); return; }

    const data = row.data as string;
    if (data.startsWith("data:")) {
      const [header, body] = data.split(";base64,");
      const mime = header.replace("data:", "");
      res.setHeader("Content-Type", mime);
      res.send(Buffer.from(body, "base64"));
    } else {
      res.setHeader("Content-Type", "image/jpeg");
      res.send(Buffer.from(data, "base64"));
    }
  } catch {
    res.status(500).json({ error: "读取文件失败" });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Dev: listen on port
if (process.env.NODE_ENV !== "production" || process.env.LISTEN === "1") {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`衣搭衣服务器已启动: http://localhost:${PORT}`);
  });
}

export default app;
