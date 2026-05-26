import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../db.js";
import { AuthRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

// POST /api/analytics/event — generic event tracking (user_id optional for anonymous events)
router.post("/event", async (req: AuthRequest, res: Response) => {
  try {
    const { event_name, event_data } = req.body;

    if (!event_name || typeof event_name !== "string") {
      res.status(400).json({ error: "event_name 不能为空" });
      return;
    }

    // user_id from auth token if available, otherwise from body (for anonymous analytics)
    const userId = req.userId || req.body.user_id || null;

    const id = uuid();
    const dataStr = event_data
      ? typeof event_data === "string"
        ? event_data
        : JSON.stringify(event_data)
      : "{}";

    await query(
      "INSERT INTO analytics_events (id, user_id, event_name, event_data) VALUES (?, ?, ?, ?)",
      [id, userId, event_name, dataStr]
    );

    res.json({ id, recorded: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/stats — key metrics (requires auth)
router.get("/stats", requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalResult,
      dauResult,
      wauResult,
      eventBreakdownResult,
    ] = await Promise.all([
      query("SELECT COUNT(*) as count FROM analytics_events"),
      query(
        "SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE user_id IS NOT NULL AND created_at >= date('now')"
      ),
      query(
        "SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE user_id IS NOT NULL AND created_at >= datetime('now', '-7 days')"
      ),
      query(
        "SELECT event_name, COUNT(*) as count FROM analytics_events GROUP BY event_name ORDER BY count DESC"
      ),
    ]);

    const totalEvents = (totalResult.rows[0] as any).count as number;
    const dau = (dauResult.rows[0] as any).count as number;
    const wau = (wauResult.rows[0] as any).count as number;

    const eventBreakdown: Record<string, number> = {};
    for (const row of eventBreakdownResult.rows) {
      const r = row as any;
      eventBreakdown[r.event_name as string] = r.count as number;
    }

    res.json({
      totalEvents,
      dailyActiveUsers: dau,
      weeklyActiveUsers: wau,
      eventBreakdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
