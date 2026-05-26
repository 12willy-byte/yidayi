import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { query } from "../db.js";
import { AuthRequest, requireAuth } from "../middleware/auth.js";

const router = Router();

// All feedback routes require authentication
router.use(requireAuth);

// POST /api/feedback/nps — submit NPS score (0-10) with optional text feedback
router.post("/nps", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { score, feedback_text } = req.body;

    if (score === undefined || score === null) {
      res.status(400).json({ error: "评分不能为空" });
      return;
    }

    const numScore = Number(score);
    if (!Number.isInteger(numScore) || numScore < 0 || numScore > 10) {
      res.status(400).json({ error: "评分必须是 0-10 的整数" });
      return;
    }

    const id = uuid();
    await query(
      "INSERT INTO nps_feedback (id, user_id, score, feedback_text) VALUES (?, ?, ?, ?)",
      [id, userId, numScore, feedback_text || null]
    );

    res.json({ id, message: "感谢您的反馈！" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback/nps/stats — NPS statistics
router.get("/nps/stats", async (_req: AuthRequest, res: Response) => {
  try {
    // Total submissions
    const totalResult = await query("SELECT COUNT(*) as count FROM nps_feedback");
    const totalCount = (totalResult.rows[0] as any).count as number;

    if (totalCount === 0) {
      res.json({
        totalSubmissions: 0,
        averageScore: 0,
        npsScore: 0,
        distribution: {},
      });
      return;
    }

    // Average score
    const avgResult = await query("SELECT AVG(score) as avg_score FROM nps_feedback");
    const avgScore = Math.round(((avgResult.rows[0] as any).avg_score as number) * 10) / 10;

    // Score distribution by NPS categories:
    //   Promoters: 9-10
    //   Passives:  7-8
    //   Detractors: 0-6
    const [promotersResult, passivesResult, detractorsResult] = await Promise.all([
      query("SELECT COUNT(*) as count FROM nps_feedback WHERE score >= 9"),
      query("SELECT COUNT(*) as count FROM nps_feedback WHERE score >= 7 AND score <= 8"),
      query("SELECT COUNT(*) as count FROM nps_feedback WHERE score <= 6"),
    ]);

    const promoters = (promotersResult.rows[0] as any).count as number;
    const passives = (passivesResult.rows[0] as any).count as number;
    const detractors = (detractorsResult.rows[0] as any).count as number;

    // NPS = (% Promoters - % Detractors) * 100
    const npsScore = Math.round(
      ((promoters - detractors) / totalCount) * 100
    );

    // Full distribution (each score 0-10)
    const distribution: Record<string, number> = {};
    const distResult = await query(
      "SELECT score, COUNT(*) as count FROM nps_feedback GROUP BY score ORDER BY score"
    );
    for (const row of distResult.rows) {
      const r = row as any;
      distribution[String(r.score)] = r.count as number;
    }

    res.json({
      totalSubmissions: totalCount,
      averageScore: avgScore,
      npsScore,
      promoters,
      passives,
      detractors,
      promoterPercent: Math.round((promoters / totalCount) * 1000) / 10,
      passivePercent: Math.round((passives / totalCount) * 1000) / 10,
      detractorPercent: Math.round((detractors / totalCount) * 1000) / 10,
      distribution,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
