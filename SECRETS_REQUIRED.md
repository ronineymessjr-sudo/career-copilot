# 部署所需变量与 Secrets

不要把真实值写入仓库或日志。

## Web Worker：career-copilot-v2

生产必需：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `CRON_SHARED_SECRET`

根据环境可能需要：

- `OWNER_USER_ID`
- `OPENAI_API_KEY`（可选；未配置时使用确定性 lexical fallback）
- `CAREER_COPILOT_API_URL`（可选 FastAPI 备用服务）

设置示例：

```bash
cd apps/web
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put CRON_SHARED_SECRET
```

## Scheduler Worker：career-copilot-scheduler

- `CRON_SHARED_SECRET`，必须与 Web Worker 使用同一个值。

```bash
cd workers/scheduler
npx wrangler secret put CRON_SHARED_SECRET
```

## 重新部署同名 Worker

在同一 Cloudflare 账户中重新部署同名 Worker，一般会保留已经配置的 secrets。部署前后都应运行：

```bash
npx wrangler secret list
```

只核对名称，不输出或记录值。
