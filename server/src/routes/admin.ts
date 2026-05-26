import { Router, Request, Response, NextFunction } from "express";
import { query } from "../db.js";

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY || "yidayi-admin";

// Admin authentication middleware — validates X-Admin-Key header
function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-key"];
  if (!key || key !== ADMIN_KEY) {
    res.status(401).json({ error: "未授权：无效的 Admin Key" });
    return;
  }
  next();
}

// Apply admin auth to all routes in this router
router.use(adminAuth);

// GET /api/admin/stats — dashboard statistics
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [
      usersResult,
      clothingResult,
      outfitsResult,
      diaryResult,
      recentResult,
      categoriesResult,
      npsAvgResult,
      eventsTotalResult,
    ] = await Promise.all([
      query("SELECT COUNT(*) as count FROM users"),
      query("SELECT COUNT(*) as count FROM clothing_items"),
      query("SELECT COUNT(*) as count FROM outfits"),
      query("SELECT COUNT(*) as count FROM diary_entries"),
      query(
        "SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-7 days')"
      ),
      query(
        "SELECT category, COUNT(*) as count FROM clothing_items GROUP BY category ORDER BY count DESC"
      ),
      query("SELECT AVG(score) as avg_score FROM nps_feedback"),
      query("SELECT COUNT(*) as count FROM analytics_events"),
    ]);

    res.json({
      totalUsers: (usersResult.rows[0] as any).count,
      totalClothing: (clothingResult.rows[0] as any).count,
      totalOutfits: (outfitsResult.rows[0] as any).count,
      totalDiaryEntries: (diaryResult.rows[0] as any).count,
      recentUsers: (recentResult.rows[0] as any).count,
      npsAverageScore: Math.round(((npsAvgResult.rows[0] as any).avg_score || 0) * 10) / 10,
      totalAnalyticsEvents: (eventsTotalResult.rows[0] as any).count,
      topCategories: categoriesResult.rows.map((r: any) => ({
        category: r.category,
        count: r.count,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users — paginated user list with search
router.get("/users", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    let whereClause = "";
    const params: any[] = [];

    if (search) {
      whereClause = " WHERE email LIKE ? OR username LIKE ? OR wechat_nickname LIKE ?";
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam);
    }

    const countSql = `SELECT COUNT(*) as total FROM users${whereClause}`;
    const dataSql = `SELECT id, email, username, avatar_url, wechat_nickname, wechat_avatar_url, created_at, updated_at FROM users${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const [countResult, dataResult] = await Promise.all([
      query(countSql, params),
      query(dataSql, [...params, limit, offset]),
    ]);

    const total = (countResult.rows[0] as any).total;

    res.json({
      users: dataResult.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/activity — recent activity feed
router.get("/activity", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const result = await query(
      `SELECT * FROM (
        SELECT 'user_registered' as type, u.id, u.username as title, u.id as user_id, u.created_at FROM users u
        UNION ALL
        SELECT 'clothing_added' as type, ci.id, ci.name as title, ci.user_id, ci.created_at FROM clothing_items ci
        UNION ALL
        SELECT 'outfit_created' as type, o.id, COALESCE(o.name, '未命名搭配') as title, o.user_id, o.created_at FROM outfits o
        UNION ALL
        SELECT 'diary_recorded' as type, d.id, COALESCE(d.note, '穿搭日记') as title, d.user_id, d.created_at FROM diary_entries d
      ) combined ORDER BY created_at DESC LIMIT ?`,
      [limit]
    );

    res.json({ activity: result.rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
