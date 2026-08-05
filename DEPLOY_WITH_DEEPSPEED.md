# 给 DeepSpeed / DeepSeek 执行端的完整部署任务

你正在部署 Career Copilot V2 Complete Platform R2。当前目录就是项目根目录，不要寻找或叠加旧补丁。

## 部署目标

- Web Worker：`career-copilot-v2`
- Scheduler Worker：`career-copilot-scheduler`
- Supabase project ref：`woywgfoqurumrkyoznnb`
- Web：`https://career-copilot-v2.photomagic.workers.dev`

## 必须保留的产品能力

- 登录、注册、邮箱验证、找回密码和退出登录
- 今日简报与每用户每日推荐
- 完整岗位池和岗位来源聚合
- 完整用户画像
- 私有多版本简历库和原文件上传
- 项目证据
- 自动选择简历、材料缺口检查和投递包准备
- 投递管理、批准和最终浏览器接力

不得重新精简成只有“选岗位 / 待投递”两个页面。

## 安全边界

自动化只负责推荐、简历选择、材料生成和队列准备。不得自动外部提交、自动发送邮件、绕过登录/验证码、保存招聘平台密码或 Cookie，也不得把打开页面记录成已投递。

## 1. 环境检查

```bash
node --version
npm --version
python --version
npx wrangler whoami
npx supabase --version
```

需要 Node.js 22+ 和 Python 3.11+。当前 Wrangler 与 Supabase SDK 锁定版本要求 Node 22。

## 2. 安装依赖

优先使用官方 npm registry：

```bash
npm install --registry=https://registry.npmjs.org --no-audit --no-fund
```

不得私自升级、删除或替换依赖。若安装失败，先报告具体包和 registry，不得跳过 TypeScript 或构建门禁。

## 3. Supabase Auth 配置

在 Supabase Authentication 的 URL Configuration 中确认：

- Site URL：`https://career-copilot-v2.photomagic.workers.dev`
- Redirect URLs 至少包含：
  - `https://career-copilot-v2.photomagic.workers.dev/**`
  - 本地验收地址（仅开发环境）

确认 Email 登录已启用。注册、验证邮件和密码恢复都依赖这些回调地址。

## 4. 数据库迁移：先检查，禁止 reset

```bash
npx supabase link --project-ref woywgfoqurumrkyoznnb
npx supabase migration list
npx supabase db push --dry-run
```

上一版已经部署 0014 时，本次通常只应出现：

```text
0015_profile_resume_daily_recommendations.sql
```

确认无误后执行：

```bash
npx supabase db push
```

若历史不一致，立即停止。不得运行 `db reset`、自动 `migration repair`、DROP TABLE 或 DROP SCHEMA。

## 5. 运行完整门禁

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

预期基础测试：72 项 Node + 14 项 Python，合计 86 项。

## 6. OpenNext 构建

```bash
npm --workspace apps/web run cf:build
```

## 7. 部署

```bash
cd apps/web
npx opennextjs-cloudflare deploy
cd ../..

cd workers/scheduler
npx wrangler deploy
cd ../..
```

部署同名 Worker 时保留已有 secrets，不得清空。

## 8. 线上验收

公开端点：

```bash
curl -fsS https://career-copilot-v2.photomagic.workers.dev/api/runtime
curl -fsS https://career-copilot-scheduler.photomagic.workers.dev/health
```

浏览器验收：

1. 打开 `/login`，完成注册、验证、登录和找回密码测试。
2. `/profile` 填写完整画像并刷新，确认数据仍存在。
3. `/resumes` 上传 PDF 或 DOCX，建立主简历，再建立第二份方向版本。
4. 确认原始文件可下载、其他账号不可读取。
5. `/career-vault` 新增并核验项目证据。
6. `/applications` 点击“立即生成今日推荐”。
7. 确认当天推荐写入首页，符合条件的岗位自动匹配简历并进入待批准区。
8. 批准材料后打开招聘入口，最终提交仍需要用户确认。
9. 创建第二个测试账号，确认画像、简历、证据、推荐和投递记录完全隔离。

## 9. Scheduler 验收

`workers/scheduler/wrangler.jsonc` 的每日任务是：

```text
0 0 * * *
```

即 UTC+8 地区每天 08:00。Scheduler `/health` 应报告 `daily-recommendations-08:00-Asia`。

## 10. 最终汇报

回报：

- 0015 迁移结果和 `resume-files` 私有桶状态
- Auth 回调配置结果
- 86 项基础测试结果
- TypeScript 与 OpenNext 构建结果
- 两个 Worker 版本 ID
- 注册、画像保存、两份简历、每日推荐、自动准备和多用户隔离验收结果
- 任何未完成项
