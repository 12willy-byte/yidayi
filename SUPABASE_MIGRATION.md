# Supabase 迁移指南 (Migration Guide)

本文档描述如何将衣搭衣后端从 Turso (SQLite/libsql) 迁移到 Supabase (PostgreSQL)。

## 目录

1. [概述](#概述)
2. [步骤 1：创建 Supabase 项目](#步骤-1创建-supabase-项目)
3. [步骤 2：执行数据库 Schema](#步骤-2执行数据库-schema)
4. [步骤 3：配置环境变量](#步骤-3配置环境变量)
5. [步骤 4：从 Turso 导出数据并导入 Supabase](#步骤-4从-turso-导出数据并导入-supabase)
6. [步骤 5：验证迁移](#步骤-5验证迁移)
7. [步骤 6：部署](#步骤-6部署)
8. [认证迁移注意事项](#认证迁移注意事项)
9. [回滚方案](#回滚方案)

---

## 概述

### 架构变化

| 方面 | Turso 模式 (当前) | Supabase 模式 (目标) |
|------|-------------------|---------------------|
| 数据库 | SQLite (libsql) | PostgreSQL 15 |
| 认证 | 手动 JWT (HMAC-SHA256) | Supabase Auth (built-in) |
| 文件存储 | base64 存入 `files` 表 | base64 存入 `files` 表 (兼容) |
| Schema 管理 | `db.ts` → `initDB()` 自动建表 | `supabase/schema.sql` → SQL Editor 手动执行 |
| 查询方式 | `db.execute({ sql, args })` | `exec_sql()` RPC (自动适配) |

### 向后兼容

代码层面完全向后兼容。只需设置环境变量 `SUPABASE_URL`，所有路由自动切换到 Supabase 模式，无需修改任何业务代码。

---

## 步骤 1：创建 Supabase 项目

1. 访问 [https://supabase.com](https://supabase.com) 并注册/登录
2. 点击 **"New project"**
3. 填写信息：
   - **Name**: `yidayi` (或任意名称)
   - **Database Password**: 生成一个强密码并妥善保存
   - **Region**: 选择离用户最近的区域 (如 `Asia Pacific (Singapore)` 或 `East Asia (Hong Kong)`)
   - **Pricing Plan**: Free 计划即可起步
4. 等待项目创建完成 (约 2 分钟)

记录以下信息 (在 **Settings → API** 页面)：
- `Project URL`: `https://<project-ref>.supabase.co`
- `anon public key`: 公开的匿名密钥
- `service_role key`: 服务端密钥 (**保密，仅服务器使用**)

---

## 步骤 2：执行数据库 Schema

### 2.1 打开 SQL Editor

1. 进入 Supabase Dashboard
2. 左侧菜单 → **SQL Editor**
3. 点击 **"New query"**

### 2.2 执行 schema.sql

1. 打开项目中的 `supabase/schema.sql` 文件
2. 将**全部内容**复制粘贴到 SQL Editor 中
3. 点击 **"Run"** 执行

执行成功后，你应该看到：
- 8 张业务表已创建 (users, profiles, clothing_items, outfits, outfit_items, tryon_sessions, diary_entries, files)
- 所有表已启用 Row Level Security (RLS)
- `exec_sql` 函数已创建 (用于 server 端的 query() 适配)
- `handle_new_user` 触发器已创建 (自动同步 auth.users → public.users)

### 2.3 验证 Schema

在 SQL Editor 中运行以下查询确认表已创建：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

你应该看到列出的 8 张表名称。

---

## 步骤 3：配置环境变量

### 3.1 更新 server/.env

在 `server/.env` 文件中添加以下 Supabase 配置：

```env
# ============================================================
# Supabase 模式 (设置 SUPABASE_URL 即启用 Supabase)
# ============================================================
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================
# 切换回 Turso 模式：只需注释或删除 SUPABASE_URL
# ============================================================
# 如果不设置 SUPABASE_URL，系统自动使用 Turso：
# TURSO_DATABASE_URL=libsql://...
# TURSO_AUTH_TOKEN=...
```

### 3.2 环境变量说明

| 变量 | 必需 | 用途 |
|------|------|------|
| `SUPABASE_URL` | 是 | Supabase 项目 URL。设置此变量即启用 Supabase 模式 |
| `SUPABASE_ANON_KEY` | 是 | 公开密钥，用于前端和无需 RLS 绕过的操作 |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | 服务端密钥，用于绕过 RLS 的 server 端操作 |
| `JWT_SECRET` | 否 | Supabase 模式下不再使用 (JWT 由 Supabase 签发)，但可以设置用于其他用途 |

### 3.3 新增依赖

在 `server/package.json` 中确认 `@supabase/supabase-js` 依赖已存在：

```bash
cd server
npm ls @supabase/supabase-js
```

如果未安装：

```bash
cd server
npm install @supabase/supabase-js
```

> 注意：根目录 `package.json` 已包含 `@supabase/supabase-js: ^2.106.0`，如果 server 的 node_modules 不能解析，需要单独安装。

---

## 步骤 4：从 Turso 导出数据并导入 Supabase

### 4.1 从 Turso 导出数据

Turso 提供 CLI 工具导出数据：

```bash
# 安装 Turso CLI (如未安装)
# macOS/Linux: curl -sSfL https://get.turso.tech/install.sh | bash
# 或使用 npm: npm install -g turso

# 登录 Turso
turso auth login

# 导出 SQL
turso db dump <database-name> > turso_dump.sql
```

或者使用 Turso Web Console 的导出功能。

### 4.2 转换 SQLite → PostgreSQL

导出的 SQLite dump 需要手动转换为 PostgreSQL 语法。主要差异：

| SQLite | PostgreSQL |
|--------|------------|
| `TEXT` 主键 UUID | `UUID PRIMARY KEY DEFAULT uuid_generate_v4()` |
| `INTEGER DEFAULT 0` (boolean) | `BOOLEAN DEFAULT FALSE` |
| `TEXT DEFAULT (datetime('now'))` | `TIMESTAMPTZ DEFAULT NOW()` |
| `TEXT DEFAULT (date('now'))` | `DATE DEFAULT CURRENT_DATE` |
| 单引号内的字符串 | 相同 (SQL 标准) |
| `CHECK (col IN (...))` | 相同 |
| `UNIQUE(col1, col2)` | 相同 |

### 4.3 导入数据到 Supabase

1. 在 Supabase SQL Editor 中打开一个新查询
2. 粘贴转换后的 SQL INSERT 语句
3. 执行

或者使用 Supabase 的 CSV 导入：
1. Table Editor → 选择表 → "Import data via CSV"
2. 上传转换后的 CSV 文件

### 4.4 用户密码注意事项

Turso 中的密码使用 bcrypt 哈希存储。迁移到 Supabase Auth 后：

- **邮箱注册用户**：密码哈希无法直接迁移到 Supabase Auth。建议让用户通过 "忘记密码" 流程重置密码。或者，在迁移期间同时支持两套认证系统。
- **微信登录用户**：Supabase Auth 不原生支持微信 OAuth。微信用户继续通过现有的 `/api/auth/wechat` 端点登录 (代码已适配)。

---

## 步骤 5：验证迁移

### 5.1 启动服务器

```bash
cd server
npm run dev
```

控制台应显示：
```
[db] Supabase connection verified.
衣搭衣服务器已启动: http://localhost:3001
```

### 5.2 测试 API 端点

```bash
# 健康检查
curl http://localhost:3001/api/health

# 注册新用户 (Supabase Auth)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456","username":"testuser"}'

# 登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 获取用户信息 (使用返回的 token)
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer <token>"

# 创建衣物
curl -X POST http://localhost:3001/api/clothing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"白色T恤","category":"top","image_url":"/api/file/xxx"}'
```

### 5.3 检查 Supabase Dashboard

在 Supabase Dashboard 中：
- **Table Editor**：确认 `users` 表中有新创建的用户记录
- **Authentication → Users**：确认 Supabase Auth 中有注册的用户
- **SQL Editor**：运行 `SELECT * FROM profiles;` 确认 profile 记录已自动创建

---

## 步骤 6：部署

### 6.1 Netlify 部署

当前项目部署在 Netlify。更新环境变量：

1. Netlify Dashboard → Site Settings → Environment Variables
2. 添加以下变量：
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. 如果之前设置了 `TURSO_DATABASE_URL` 和 `TURSO_AUTH_TOKEN`，可以保留不删除 (作为回退方案)
4. 重新部署

### 6.2 其他平台

同样的模式适用于任何部署平台 (Vercel, Railway, Render 等)：在平台的环境变量设置中添加 `SUPABASE_URL` 即可激活 Supabase 模式。

---

## 认证迁移注意事项

### Supabase Auth vs 手动 JWT

| 特性 | Turso 模式 (手动 JWT) | Supabase 模式 |
|------|----------------------|---------------|
| 签发方 | 服务器 (HMAC-SHA256) | Supabase Auth |
| 密钥 | `JWT_SECRET` 环境变量 | Supabase 自动管理 |
| Token 格式 | 自定义 payload `{ userId, email }` | Supabase 标准 JWT `{ sub, email, ... }` |
| 验证方式 | `jwt.verify(token, secret)` | `supabase.auth.getUser(token)` |
| 邮箱验证 | 不支持 | 内置支持 |
| 密码重置 | 不支持 | 内置支持 |
| 第三方登录 | 手动微信 OAuth | Google, GitHub 等内置，微信需自定义 |

### 用户 ID 映射

- **Turso 模式**：用户 ID 是 `uuid()` 生成的字符串
- **Supabase 模式**：用户 ID 是 `auth.users.id` (UUID)，与 `public.users.id` 保持一致

`handle_new_user` 触发器确保 Supabase Auth 创建用户时自动在 `public.users` 表中插入对应记录。

### 微信登录

Supabase Auth 不原生支持微信 OAuth。代码保留原有的微信登录流程：交换 code → 获取 openid/userinfo → 查找/创建用户 → 签发 token。

在 Supabase 模式下，微信用户通过 `supabaseAdmin.auth.admin.createUser()` 在 Supabase Auth 中创建对应的用户记录。

### 密码安全性

Supabase Auth 内置：
- bcrypt/scrypt 密码哈希
- 自动 salt
- 密码强度策略
- 速率限制

服务端不再需要手动管理 `password_hash` 列 (Supabase Auth 在 `auth.users` 中管理密码)。

---

## 回滚方案

### 从 Supabase 切回 Turso

只需在环境变量中移除 `SUPABASE_URL`：

```bash
# 在 server/.env 中注释掉：
# SUPABASE_URL=https://...
# SUPABASE_ANON_KEY=...
# SUPABASE_SERVICE_ROLE_KEY=...

# 恢复 Turso 配置：
TURSO_DATABASE_URL=libsql://...
TURSO_AUTH_TOKEN=...
```

重启服务器即可。代码检测不到 `SUPABASE_URL` 会自动降级到 Turso 模式。

### 数据回滚

如果需要将 Supabase 中的数据迁移回 Turso，可参考步骤 4 的反向操作：从 Supabase 导出 → 转换为 SQLite 语法 → 导入 Turso。

---

## 常见问题

### Q: 为什么 `query()` 函数在 Supabase 模式下不直接用 Supabase client 的 `.from().select()` 方法？

A: 现有所有路由使用原始 SQL 字符串 + `?` 占位符的查询模式。改为 Supabase client 的 ORM 风格需要重写所有路由代码。`exec_sql` RPC 适配器实现了零业务代码修改的目标。

### Q: `exec_sql` 函数安全吗？

A: `exec_sql` 使用了 `SECURITY DEFINER` 模式，并且：
1. 仅在 server 端通过 `service_role` key 调用 (不暴露给客户端)
2. 所有参数在传入前已在 JavaScript 层完成 SQL 转义 (`pgEscapeLiteral`)
3. 路由层独立通过 `WHERE user_id = ?` 实施用户隔离

### Q: 文件存储需要迁移到 Supabase Storage 吗？

A: 当前保持向后兼容，文件仍以 base64 存储在 `files` 表中。未来可以将文件迁移到 Supabase Storage (推荐)，但不在本次迁移范围内。

### Q: 性能对比如何？

A: Supabase PostgreSQL 比 Turso SQLite 更适合多用户并发场景：
- 支持连接池 (PgBouncer)
- 更好的并发控制 (MVCC)
- 更丰富的索引类型 (GIN, GiST)
- 内置查询计划分析 (`EXPLAIN ANALYZE`)
