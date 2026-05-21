import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { db } from '../db.js';
import { suggestOutfit } from '../services/bailian.service.js';

const router = Router();

// POST /api/ai/suggest-outfit — AI 搭配推荐
router.post('/suggest-outfit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { occasion, weather, stylePreference, itemIds } = req.body;

    // 获取用户衣橱
    let wardrobeItems: any[];
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      wardrobeItems = db.prepare(
        `SELECT name, category, colors FROM clothing_items WHERE id IN (${placeholders}) AND user_id = ?`
      ).all(...itemIds, req.userId!) as any[];
    } else {
      wardrobeItems = db.prepare(
        'SELECT name, category, colors FROM clothing_items WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
      ).all(req.userId!) as any[];
    }

    if (wardrobeItems.length < 2) {
      res.status(400).json({ error: '衣橱中至少需要 2 件衣物才能获得搭配建议' });
      return;
    }

    // 解析 colors JSON
    const items = wardrobeItems.map((i: any) => ({
      name: i.name,
      category: i.category,
      colors: JSON.parse(i.colors || '[]'),
    }));

    const result = await suggestOutfit({
      wardrobeItems: items,
      occasion: occasion || undefined,
      weather: weather || undefined,
      stylePreference: stylePreference || undefined,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[AI] suggest-outfit error:', err.message);
    res.status(500).json({ error: err.message || 'AI 搭配推荐失败' });
  }
});

// GET /api/ai/status — 检查 AI 服务是否可用
router.get('/status', (_req: AuthRequest, res: Response) => {
  const configured = !!process.env.BAILIAN_API_KEY;
  res.json({
    available: configured,
    provider: '阿里云百炼',
    model: 'qwen-plus',
    tip: configured ? '已配置' : '请在 server/.env 中设置 BAILIAN_API_KEY',
  });
});

export default router;
