# 衣搭衣 (yidayi) — AI 智能衣橱搭配助手

## 失败论证 (Failure Arguments)

1. **搭配推荐价值存疑**: 用户是否愿意手动录入全部衣物到数字衣橱？录入摩擦极高（拍照→去背景→打标签），留存率可能断崖式下跌。
2. **AI 功能未落地**: README 宣传的 GPT-4o 搭配生成、Replicate 虚拟试穿均未实现。当前代码是纯 CRUD API，没有任何 AI 集成代码。实际后端是 Express + SQLite，不是 README 描述的 Supabase + Edge Functions。
3. **冷启动问题**: 新用户衣橱为空时无搭配可生成，产品核心价值无法第一时间感知。
4. **穿搭日记频次低**: 用户打开 app 拍照记录穿搭的频次可能是每周 1-3 次，DAU 天花板低。

## 架构决策

- **后端**: Express (port 3001) + better-sqlite3，路由在 `server/src/` 下
- **前端**: React Native Expo SDK 54，Expo Router (基于文件的路由系统)
- **认证**: JWT (jsonwebtoken + bcryptjs)，邮箱注册/登录 + 微信 OAuth
- **AI 集成**: 阿里云百炼 API `qwen-plus`（OpenAI 兼容），后端代理模式。已实现 `POST /api/ai/suggest-outfit` 搭配推荐接口。免费 7000万 tokens/90天
- **样式**: NativeWind v4 (Tailwind CSS)
- **存储**: 本地 SQLite (`yidayi.db`), 文件上传到 `server/uploads/`
- **APK**: 115MB，已构建 v1.0 和 v1.1

## 待办/技术债

- [ ] **SECURITY**: JWT secret 硬编码在 `server/src/auth.ts:6`（`yidayi-dev-secret-key-change-in-production`）
- [ ] README 描述的技术栈 (Supabase/OpenAI/Replicate) 与实际代码完全不符，需更新为真实架构
- [ ] `CLAUDE.md` 之前只写了 `@AGENTS.md`，AGENTS.md 也只有 Expo 版本说明，缺乏项目上下文
- [ ] 微信 OAuth 的 app secret 需从环境变量读取，不可硬编码
- [ ] 文件上传无文件类型/大小校验，存在安全风险

## 关键文件

| 路径 | 作用 |
|------|------|
| `server/src/auth.ts` | 认证逻辑（注册/登录/JWT 签发） |
| `server/src/db.ts` | SQLite schema & 初始化 |
| `server/src/index.ts` | Express 入口，路由挂载 |
| `src/lib/api.ts` | 移动端 API 客户端 (SecureStore token) |
| `app/` | Expo Router 页面路由 |
| `supabase/schema.sql` | 数据库 schema 参考（实际由 db.ts 执行） |
