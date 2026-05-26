import { Router, Response } from 'express';
import { AuthRequest, requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { suggestOutfit, rateOutfit, categorizeClothing, virtualTryOn } from '../services/bailian.service.js';

const router = Router();

router.post('/suggest-outfit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { occasion, weather, stylePreference, itemIds } = req.body;

    let wardrobeItems: any[];
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      const placeholders = itemIds.map(() => '?').join(',');
      const result = await query(
        `SELECT name, category, colors FROM clothing_items WHERE id IN (${placeholders}) AND user_id = ?`,
        [...itemIds, req.userId!],
      );
      wardrobeItems = result.rows as any[];
    } else {
      const result = await query(
        'SELECT name, category, colors FROM clothing_items WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
        [req.userId!],
      );
      wardrobeItems = result.rows as any[];
    }

    if (wardrobeItems.length < 2) {
      res.status(400).json({ error: '衣橱中至少需要 2 件衣物才能获得搭配建议' });
      return;
    }

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

router.post('/rate-outfit', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { items, occasion } = req.body;
    if (!items || !Array.isArray(items) || items.length < 2) {
      res.status(400).json({ error: '请提供至少 2 件衣物进行搭配评分' });
      return;
    }

    const result = await rateOutfit({ items, occasion });
    res.json(result);
  } catch (err: any) {
    console.error('[AI] rate-outfit error:', err.message);
    res.status(500).json({ error: err.message || 'AI 搭配评分失败' });
  }
});

router.post('/categorize-clothing', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: '请提供衣物名称' });
      return;
    }

    const result = await categorizeClothing({ name: name.trim(), description });
    res.json(result);
  } catch (err: any) {
    console.error('[AI] categorize-clothing error:', err.message);
    res.status(500).json({ error: err.message || 'AI 衣物分类失败' });
  }
});

router.post('/virtual-tryon', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { clothingUrls, clothingNames, userInfo } = req.body;
    if (!clothingNames || !Array.isArray(clothingNames) || clothingNames.length === 0) {
      res.status(400).json({ error: '请提供衣物列表' });
      return;
    }

    const result = await virtualTryOn({ clothingUrls: clothingUrls || [], clothingNames, userInfo });
    res.json(result);
  } catch (err: any) {
    console.error('[AI] virtual-tryon error:', err.message);
    res.status(500).json({ error: err.message || 'AI 虚拟试穿失败' });
  }
});

router.get('/status', (_req: AuthRequest, res: Response) => {
  const configured = !!process.env.BAILIAN_API_KEY;
  res.json({
    available: configured,
    provider: '阿里云百炼',
    model: 'qwen-plus',
    tip: configured ? '已配置' : '请在环境变量中设置 BAILIAN_API_KEY',
  });
});

export default router;
