import { Router, Response } from "express";
import { registerByEmail, loginByEmail, loginByWeChat } from "../auth.js";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { query } from "../db.js";

const router = Router();

router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, username } = req.body;
    if (!email || !password) { res.status(400).json({ error: "邮箱和密码不能为空" }); return; }
    if (password.length < 6) { res.status(400).json({ error: "密码至少6位" }); return; }

    const result = await registerByEmail(email, password, username);
    if ("error" in result) { res.status(400).json({ error: result.error }); return; }

    const { generateToken } = await import("../auth.js");
    const token = generateToken({ userId: result.user.id, email: result.user.email });

    res.json({ token, user: result.user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: "邮箱和密码不能为空" }); return; }

    const result = await loginByEmail(email, password);
    if ("error" in result) { res.status(400).json({ error: result.error }); return; }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/wechat", async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: "缺少微信授权码" }); return; }

    const WECHAT_APP_ID = process.env.WECHAT_APP_ID;
    const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET;
    if (!WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      res.status(500).json({ error: "微信登录未配置" }); return;
    }

    const tokenRes = await fetch(
      `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`
    );
    const tokenData = await tokenRes.json();
    if ((tokenData as any).errcode) {
      res.status(400).json({ error: (tokenData as any).errmsg || "微信授权失败" }); return;
    }

    const { access_token, openid, unionid } = tokenData as any;
    const userRes = await fetch(
      `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`
    );
    const userData = await userRes.json();
    if ((userData as any).errcode) {
      res.status(400).json({ error: (userData as any).errmsg || "获取微信用户信息失败" }); return;
    }

    const result = await loginByWeChat({
      openid, unionid,
      nickname: (userData as any).nickname,
      avatar_url: (userData as any).headimgurl,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const u = await query(
    "SELECT id, email, username, avatar_url, wechat_openid, wechat_nickname, wechat_avatar_url FROM users WHERE id = ?",
    [req.userId!],
  );
  const user = u.rows[0] as any;
  if (!user) { res.status(404).json({ error: "用户不存在" }); return; }

  const p = await query("SELECT * FROM profiles WHERE id = ?", [req.userId!]);
  const profile = p.rows[0] as any;

  res.json({
    user: {
      ...user,
      profile: profile ? {
        bio: profile.bio,
        height: profile.height,
        weight: profile.weight,
        body_type: profile.body_type,
        style_tags: JSON.parse((profile.style_tags as string) || "[]"),
        is_public: !!profile.is_public,
      } : null,
    },
  });
});

export default router;
