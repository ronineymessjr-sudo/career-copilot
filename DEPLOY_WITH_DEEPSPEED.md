# 给 DeepSpeed / DeepSeek 执行端的完整部署任务

你正在部署 Career Copilot V2 完整源码包。请直接执行，不要把它当成增量补丁，也不要再次寻找旧 ZIP。

## 目标

将当前目录构建并部署到：

- Web Worker：`career-copilot-v2`
- Scheduler Worker：`career-copilot-scheduler`
- 生产入口：`https://career-copilot-v2.photomagic.workers.dev`

## 不可改变的产品边界

1. 保持 approval-first。
2. 不启用自动外部投递。
3. 不启用自动邮件发送。
4. 不绕过登录、验证码、设备验证或反机器人验证。
5. 不保存招聘平台密码、Cookie 或验证码。
6. 不把打开外部页面伪报成提交成功。
7. 不提交任何真实密钥到 Git。

## 执行顺序

### 1. 检查环境

需要：

- Node.js 20 或更高版本
- npm
- Python 3.11 或更高版本
- Cloudflare Wrangler 已登录，或存在有效的 `CLOUDFLARE_API_TOKEN`

运行：

```bash
node --version
npm --version
python --version
npx wrangler whoami
```

### 2. 安装依赖

```bash
npm install --no-audit --no-fund
```

如果公司或代理 npm 镜像缺少 `@langchain/core@1.2.3`，切换到官方 npm registry 后重试；不要擅自更改依赖版本来绕过安装错误。

### 3. 生成 Cloudflare 类型

```bash
npm --workspace workers/scheduler run cf-typegen
```

### 4. 运行全部门禁

```bash
npm run test:m08.1
npm run test:integrations
python -m pytest apps/api/tests -q
npm --workspace apps/web run check
npm --workspace workers/scheduler run check
python scripts/validate_cloudflare.py
```

任何代码测试失败都应停止部署并修复。不要跳过失败的门禁。

### 5. 构建 Web Worker

```bash
npm --workspace apps/web run cf:build
```

### 6. 部署 Web

```bash
cd apps/web
npx opennextjs-cloudflare deploy
cd ../..
```

部署同名 Worker 时保留已有 secrets。不要清空线上 secrets。

### 7. 部署 Scheduler

```bash
cd workers/scheduler
npx wrangler deploy
cd ../..
```

### 8. 线上验收

```bash
curl -fsS https://career-copilot-v2.photomagic.workers.dev/api/runtime
curl -s -o /dev/null -w "%{http_code}\n" https://career-copilot-v2.photomagic.workers.dev/playground
curl -s -o /dev/null -w "%{http_code}\n" https://career-copilot-v2.photomagic.workers.dev/api/control/jobs
curl -fsS https://career-copilot-scheduler.photomagic.workers.dev/health
```

期望：

- `/api/runtime` 返回版本信息且 `supabaseConfigured: true`
- `/playground` 返回 200
- 未登录访问 `/api/control/jobs` 返回 401
- Scheduler `/health` 返回正常

### 9. 登录态与 Cron

部署后用用户账号完成一次登录。Cron 需要唯一的已登录 Career Copilot 用户才能真正运行。

### 10. 最终汇报

必须回报：

- Web Worker 新版本 ID
- Scheduler Worker 新版本 ID
- 四项线上验收结果
- 测试总数与失败数
- 是否保留了原 Worker secrets
- `/jobs` 和 `/applications` 的桌面、手机验收结果
- 任何未完成项和准确原因
