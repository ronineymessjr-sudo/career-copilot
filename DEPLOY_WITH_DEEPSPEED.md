# 给 DeepSpeed / DeepSeek 执行端的最终部署任务

你正在部署 Career Copilot V2 Complete Platform 完整源码。当前目录就是项目根目录，不要寻找、叠加或恢复任何旧补丁。

## 部署目标

- Web Worker：`career-copilot-v2`
- Scheduler Worker：`career-copilot-scheduler`
- Supabase project ref：`woywgfoqurumrkyoznnb`
- Web：`https://career-copilot-v2.photomagic.workers.dev`

## 必须保留的产品能力

- 今日简报和数据看板
- 完整岗位池
- 岗位来源管理
- Greenhouse / Lever / Ashby 公开 ATS 聚合
- 其他招聘平台 URL/JD 导入
- 多用户中性画像和独立推荐
- 平台共享岗位与个人私有岗位
- 简历匹配、材料缺口、用户确认投递

不得重新精简成只有“选岗位 / 待投递”两个页面。

## 安全边界

不得自动外部投递、自动发送邮件、绕过登录或验证码、保存平台密码/Cookie，或把打开页面伪报成已投递。

## 1. 检查环境

```bash
node --version
npm --version
python --version
npx wrangler whoami
```

需要 Node.js 20+、Python 3.11+、npm，以及 Cloudflare 登录或有效 Token。

## 2. 安装依赖

```bash
npm install --no-audit --no-fund
```

若代理 npm 镜像缺少锁定依赖，切换到官方 npm registry 重试；不要私自更换依赖版本。

## 3. 数据库迁移：先检查，禁止 reset

```bash
npx supabase link --project-ref woywgfoqurumrkyoznnb
npx supabase migration list
npx supabase db push --dry-run
```

目标是只应用尚未部署的迁移，当前功能迁移为：

```text
0014_complete_platform_job_pool.sql
```

如果 dry-run 只显示预期的待部署迁移，再执行：

```bash
npx supabase db push
```

如果 migration history 不一致，立即停止；不得运行 `db reset`，不得自动执行 `migration repair`，不得删除表或 schema。先比对生产数据库与迁移历史。

## 4. 运行完整门禁

```bash
npm --workspace workers/scheduler run cf-typegen
npm run test:complete
python -m pytest apps/api/tests -q
python scripts/validate_cloudflare.py
python scripts/verify_complete_package.py
npm run smoke:m08.1
npm --workspace apps/web run check
npm --workspace workers/scheduler run check
```

任何失败都应停止部署并修复，不能跳过。

## 5. 构建

```bash
npm --workspace apps/web run cf:build
```

## 6. 部署 Web 与 Scheduler

```bash
cd apps/web
npx opennextjs-cloudflare deploy
cd ../..

cd workers/scheduler
npx wrangler deploy
cd ../..
```

部署同名 Worker 时保留已有 secrets，不得清空。

## 7. 线上验收

```bash
curl -fsS https://career-copilot-v2.photomagic.workers.dev/api/runtime
curl -s -o /dev/null -w "%{http_code}\n" https://career-copilot-v2.photomagic.workers.dev/playground
curl -s -o /dev/null -w "%{http_code}\n" https://career-copilot-v2.photomagic.workers.dev/api/control/jobs
curl -fsS https://career-copilot-scheduler.photomagic.workers.dev/health
```

登录后逐页验收：

- `/` 今日简报与数据概览
- `/jobs` 完整岗位池、搜索、来源/地点筛选、推荐排序
- `/sources` Greenhouse/Lever/Ashby 与共享/私有来源
- `/applications` 空状态、补齐、待投递、已投递
- `/analytics` 招聘数据看板
- `/profile` 中性画像与个性化偏好
- `/resumes` 通用岗位简历版本
- `/career-vault` 项目证据

再创建第二个测试账号，确认：

- 能看到平台共享岗位。
- 看不到第一个账号的私有岗位和个人资料。
- 推荐排序随第二个账号画像变化。
- 投递记录互不共享。

## 8. 最终汇报

回报数据库迁移结果、82 项基础测试结果、TypeScript/构建结果、两个 Worker 版本 ID、端点状态、多用户隔离验收和任何未完成项。
