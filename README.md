<div align="center">

# Career Copilot V2

**证据驱动的 AI 求职操作系统**

聚合岗位 · 定制简历 · 管理投递 · 面试复盘 · 数据洞察

</div>

---

## 这是什么

Career Copilot 不是海投机器人，而是一个可解释的求职工作台。它把岗位发现、资格核验、匹配分析、简历定制、投递管理、面试复盘和 Offer 管理放在一个系统中，每个 AI 结论都可展开查看证据。

## 核心能力

| 能力 | 说明 |
|------|------|
| **岗位发现** | 从 Greenhouse、Lever、Ashby、BOSS、LinkedIn、实习僧、牛客、智联、前程无忧、猎聘聚合岗位 |
| **JD 深拆** | 提取必备条件/加分项/隐性偏好，对照画像生成匹配证据与缺口清单 |
| **AI 简历定制** | 基于真实项目证据生成岗位定制版简历，ATS 关键词覆盖率检查 |
| **投递管理** | 投递管线（待投→已投递→面试→Offer），审批优先，默认停在人工确认前 |
| **面试复盘** | 面试准备包、结构化复盘、技能缺口追踪 |
| **数据洞察** | 渠道/地区/公司规模/简历版本转化率分析，周度回顾报告 |

## 技术栈

- **前端**: Next.js 15 / React 19 / TypeScript
- **部署**: Cloudflare Workers (via OpenNext)
- **后端**: Supabase (PostgreSQL + Auth + Storage + pgvector)
- **定时任务**: Cloudflare Scheduler Worker (Cron)
- **AI**: OpenAI Responses API (Web Search + Embeddings)
- **搜索**: Tavily API (免费网页搜索)
- **备用 API**: Python FastAPI

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/ronineymessjr-sudo/public-apis-resource.git
cd public-apis-resource
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local 填入你的 Supabase、OpenAI、Tavily 密钥
```

### 3. 初始化数据库

在 Supabase SQL Editor 中按顺序执行 `supabase/migrations/` 下的所有 SQL 文件。

### 4. 本地开发

```bash
npm run web:dev
# 打开 http://localhost:3000
```

### 5. CLI 模式（无需部署）

```bash
# 初始化求职画像
npm run cli -- init

# 搜索岗位
npm run cli -- search

# 评价排序
npm run cli -- rank

# 深拆 JD
npm run cli -- jd "粘贴 JD 文本"

# 生成简历
npm run cli -- resume

# 投递跟踪
npm run cli -- outcome <公司> <岗位> applied
```

## 项目结构

```
public-apis-resource/
├── apps/web/              # Next.js 前端 + API Routes
│   ├── app/               # App Router 页面
│   ├── components/        # UI 组件
│   ├── lib/               # 核心模块（岗位、简历、队列）
│   └── tests/             # 测试 (98 JS tests)
├── workers/scheduler/    # Cloudflare Worker (Cron 定时任务)
├── supabase/migrations/   # 数据库迁移 (25 个 SQL 文件)
├── scripts/               # 验证、部署、CLI 脚本
├── docs/                  # 架构、PRD、设计系统文档
├── .github/workflows/     # GitHub Actions CI/CD
└── .workbuddy/skills/    # WorkBuddy 项目技能（含 cf-worker-deploy）
```

## 部署

### 前置条件

1. [Supabase](https://supabase.com) 项目（PostgreSQL + Auth + Storage）
2. [Cloudflare](https://cloudflare.com) 账号（Workers）
3. [OpenAI](https://platform.openai.com) API Key
4. [Tavily](https://tavily.com) API Key（免费）
5. [GitHub](https://github.com) 仓库（CI/CD）

### 部署步骤

1. **数据库**: 在 Supabase SQL Editor 执行 migrations
2. **环境变量**: 在 Cloudflare Workers Settings 和 `.env.local` 中配置
3. **CI 自动部署**: 推送到 `main` 分支，GitHub Actions 自动构建部署
4. **手动部署**（CI token 过期时）: 下载 CI artifact + `npx wrangler deploy`

详细部署指南见 [`.workbuddy/skills/cf-worker-deploy/SKILL.md`](.workbuddy/skills/cf-worker-deploy/SKILL.md)。

## 测试与验证

```bash
# 全量测试
npm run test:complete

# TypeScript 类型检查
npm --workspace apps/web run check
npm --workspace workers/scheduler run check

# Cloudflare 配置验证
python scripts/validate_cloudflare.py

# 部署适配验证
python scripts/verify_deployment_adaptations.py

# 完整性验证
python scripts/verify_complete_package.py
```

## 平台覆盖

| 平台 | 类型 | 状态 |
|------|------|------|
| Greenhouse | ATS 直连 | 已连接 |
| Lever | ATS 直连 | 已连接 |
| Ashby | ATS 直连 | 已连接 |
| BOSS 直聘 | 公开网页索引 | 可搜索 |
| LinkedIn | 公开网页索引 | 可搜索 |
| 实习僧 | 公开网页索引 | 可搜索 |
| 牛客 | 公开网页索引 | 可搜索 |
| 智联招聘 | 公开网页索引 | 可搜索 |
| 前程无忧 | 公开网页索引 | 可搜索 |
| 猎聘 | 公开网页索引 | 可搜索 |

## 关键规则

- 不把校招正式岗、提前批正式岗或收费培训混入实习池
- 毕业年份、出勤天数、实习时长是硬过滤条件
- 推荐不等于已投递；只有用户确认后才标记 submitted
- 生成材料只能引用 Career Vault 中的真实证据
- 平台投递默认停在人工确认前；邮件默认只生成草稿
- 缺失信息用"待核验"而不是模型猜测

## WorkBuddy 专家包

本项目已封装为 WorkBuddy 专家包，可在 WorkBuddy 中直接使用：

1. 在 WorkBuddy 的**专家中心**搜索「职业副驾」或「Career Copilot」
2. 或手动安装：解压 `career-copilot.zip` 到 `~/.workbuddy/plugins/marketplaces/my-experts/plugins/`
3. 运行注册脚本后即可在 WorkBuddy 对话中使用

## 许可证

MIT License — 自由使用、修改、分发。
