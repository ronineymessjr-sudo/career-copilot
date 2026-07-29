# Career Copilot 应用集成运行说明

Career Copilot 的投递辅助不使用开发机、Codex 或浏览器临时令牌。运行时只使用部署到 Cloudflare Web Worker 的私有密钥，并将第三方刷新令牌以 AES-GCM 密文保存在 `career_copilot.provider_connections`。

## 已接入的能力

- Greenhouse / Lever：使用公开 ATS API 发现岗位；不伪造平台申请 API。
- Gmail：标准 OAuth 2.0 授权码 + PKCE；系统仅创建草稿，绝不自动发送。
- Bonjour：保留为人工确认后的平台交接渠道。没有公开、受授权的投递 API 时，系统不会模拟提交。

## Cloudflare Web Worker 私有变量

始终必需：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `OWNER_USER_ID`
- `CRON_SHARED_SECRET`
- `INTEGRATION_ENCRYPTION_KEY`：32 字节随机值的 Base64URL 编码；只写入 Worker secret。

启用 Gmail 后再配置：

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`：生产地址为 `https://career-copilot-v2.photomagic.workers.dev/api/integrations/gmail/callback`。

Google Cloud OAuth 客户端必须将该回调地址列入 Authorized redirect URIs，并申请最小权限 `https://www.googleapis.com/auth/gmail.compose`。用户首次点击“连接 Gmail”后在 Google 的正式授权页登录；回调只保存加密后的运行时凭据。撤销连接会删除应用内保存的凭据。

`CLOUDFLARE_API_TOKEN` 只用于 CI 或部署命令，不是 Career Copilot 的业务运行时凭据，也不会进入应用数据库。
