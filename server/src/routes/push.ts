import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../db.js";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { sendPush, sendDailyOutfitPush } from "../services/push.service.js";

const router = Router();

// POST /api/push/register — save ExpoPushToken (requires auth)
router.post("/register", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "token 不能为空" });
      return;
    }

    // Upsert: if this user+token combo exists, update created_at; otherwise insert
    const existing = await query(
      "SELECT id FROM push_tokens WHERE user_id = ? AND token = ?",
      [userId, token]
    );

    if (existing.rows.length > 0) {
      await query(
        "UPDATE push_tokens SET created_at = datetime('now') WHERE id = ?",
        [(existing.rows[0] as any).id]
      );
    } else {
      const id = uuid();
      await query(
        "INSERT INTO push_tokens (id, user_id, token) VALUES (?, ?, ?)",
        [id, userId, token]
      );
    }

    res.json({ registered: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/push/send — send push notification (admin auth via X-Admin-Key)
router.post("/send", async (req: AuthRequest, res: Response) => {
  try {
    const ADMIN_KEY = process.env.ADMIN_KEY || "yidayi-admin";
    const key = req.headers["x-admin-key"];
    if (!key || key !== ADMIN_KEY) {
      res.status(401).json({ error: "未授权：无效的 Admin Key" });
      return;
    }

    const { user_id, title, body, data } = req.body;

    if (!user_id) {
      res.status(400).json({ error: "user_id 不能为空" });
      return;
    }
    if (!title || !body) {
      res.status(400).json({ error: "title 和 body 不能为空" });
      return;
    }

    // Get all push tokens for this user
    const tokensResult = await query(
      "SELECT token FROM push_tokens WHERE user_id = ?",
      [user_id]
    );

    const tokens = tokensResult.rows.map((r: any) => r.token as string);

    if (tokens.length === 0) {
      res.json({ sent: 0, errors: 0, message: "用户未注册推送设备" });
      return;
    }

    const results = await Promise.all(
      tokens.map((token) =>
        sendPush({
          to: token,
          title,
          body,
          data: data || { type: "admin" },
        })
      )
    );

    const sent = results.filter((r) => r.status === "ok").length;
    const errors = results.filter((r) => r.status === "error").length;

    res.json({ sent, errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/push/daily-outfit — trigger daily outfit push (admin auth)
router.post("/daily-outfit", async (req: AuthRequest, res: Response) => {
  try {
    const ADMIN_KEY = process.env.ADMIN_KEY || "yidayi-admin";
    const key = req.headers["x-admin-key"];
    if (!key || key !== ADMIN_KEY) {
      res.status(401).json({ error: "未授权：无效的 Admin Key" });
      return;
    }

    const { user_id } = req.body;
    if (!user_id) {
      res.status(400).json({ error: "user_id 不能为空" });
      return;
    }

    const result = await sendDailyOutfitPush(
      user_id,
      "今日穿搭推荐",
      "打开衣搭衣，看看今天为你推荐的搭配吧！"
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
