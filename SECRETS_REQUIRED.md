# 部署所需变量、Secrets 与 Auth 配置

不要把真实值写入仓库、源码包或日志。

## Web Worker：career-copilot-v2

生产必需：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `CRON_SHARED_SECRET`
- `OWNER_USER_ID`：平台公开来源发现的运营账号；每日推荐本身会遍历全部用户，不再只服务该账号。

可选：

- `OPENAI_API_KEY`：公开网页索引岗位搜索需要；未配置时，已连接 Greenhouse、Lever、Ashby 仍可搜索，但 Workday、BOSS、LinkedIn 等平台会明确显示“当前不可用”。
- `OPENAI_SEARCH_MODEL`：可选，默认 `gpt-5-mini`；这是普通环境变量，不应包含密钥。
- `CAREER_COPILOT_API_URL`：可选 FastAPI 备用服务。

```bash
cd apps/web
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put CRON_SHARED_SECRET
npx wrangler secret put OWNER_USER_ID
npx wrangler secret put OPENAI_API_KEY
```

## Scheduler Worker

- `CRON_SHARED_SECRET`，必须与 Web Worker 完全一致。

```bash
cd workers/scheduler
npx wrangler secret put CRON_SHARED_SECRET
```

## Supabase Auth 控制台

这部分不是 Worker secret，但登录功能必须配置：

- 启用 Email provider。
- Site URL 设置为生产 Worker 地址。
- Redirect URLs 包含 `https://career-copilot-v2.photomagic.workers.dev/**`。
- 按产品需要决定是否强制邮箱验证；生产环境建议开启。

## 部署前后检查

```bash
npx wrangler secret list
```

只核对名称，不输出或记录真实值。
