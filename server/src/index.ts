import 'dotenv/config';
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { initDB } from "./db.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";
import clothingRoutes from "./routes/clothing.js";
import outfitsRoutes from "./routes/outfits.js";
import diaryRoutes from "./routes/diary.js";
import aiRoutes from "./routes/ai.js";
import uploadRoutes, { UPLOADS } from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(UPLOADS));

// Init database
initDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/clothing", clothingRoutes);
app.use("/api/outfits", outfitsRoutes);
app.use("/api/diary", diaryRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`衣搭衣服务器已启动: http://localhost:${PORT}`);
  console.log(`API: http://localhost:${PORT}/api`);
});
