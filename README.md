<div align="center">

![Career Copilot V2 Banner](assets/banner.png)

# Career Copilot V2

**证据驱动的 AI 求职操作系统**

聚合岗位 · 定制简历 · 管理投递 · 面试复盘 · 数据洞察

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-98%2F98%20passing-brightgreen)](package.json)
[![Deployment](https://img.shields.io/badge/deploy-Cloudflare%20Workers-orange)](https://career-copilot-v2.photomagic.workers.dev)
[![Expert](https://img.shields.io/badge/WorkBuddy-Expert-purple)](https://codebuddy.cn)
[![GitHub issues](https://img.shields.io/github/issues/ronineymessjr-sudo/public-apis-resource)](https://github.com/ronineymessjr-sudo/public-apis-resource/issues)

</div>

---

## 为什么做这个项目

海投 100 份简历、换 N 个 AI 对话、聊天记录越堆越多——求职变成了一场没有记忆的数据游击战。

**Career Copilot** 不是又一个 AI 聊天机器人，而是一个围绕你的画像、证据和投递历史构建的可解释求职工作台。每个 AI 结论都可以展开查看证据来源，每一次推荐都经过资格核验，每一次状态变更都停在人工确认之前。

> "AI 应该帮你做决策，而不是代替你做决定。"

---

## 六大核心能力

![核心能力](assets/features.png)

| 能力 | 一句话说明 |
|------|-----------|
| **岗位发现** | 聚合 ATS（Greenhouse、Lever、Ashby）与国内平台（BOSS、实习僧、牛客、智联、前程无忧、猎聘）的公开职位 |
| **JD 深拆** | 自动提取必备条件、加分项、隐性偏好，生成匹配证据与能力缺口清单 |
| **AI 简历定制** | 基于真实项目证据生成岗位定制版简历，并检查 ATS 关键词覆盖率 |
| **投递管理** | 从「待投」到「Offer」的管线管理，默认停在人工确认前 |
| **面试复盘** | 面试准备包、结构化复盘、技能缺口追踪 |
| **数据洞察** | 渠道、公司规模、简历版本转化率分析，每周自动回顾 |

---

## 多入口使用

同一个后端，四种使用方式：

| 入口 | 适合场景 | 使用方式 |
|------|---------|---------|
| **Web App** | 日常求职操作、可视化看板 | 打开线上地址或本地 `npm run web:dev` |
| **CLI** | 命令行快速搜索、生成简历 | `npm run cli -- search` |
| **WorkBuddy Expert** | 对话式求职顾问 | 在 WorkBuddy 专家中心搜索「职业副驾」 |
| **MCP 工具** | 接入任意支持 MCP 的 Agent | 配置 `/api/mcp` 端点 |

---

## 系统架构

![系统架构](assets/architecture.svg)

- **用户入口层**：Web App / CLI / WorkBuddy Expert / MCP
- **API 与控制层**：Next.js App Router + Agent Runtime + 异步队列 + Feedback API
- **AI 服务层**：OpenAI（简历、JD 分析、语义搜索）+ Tavily（免费网页搜索）
- **数据与调度层**：Supabase（PostgreSQL、Auth、Storage、pgvector）+ Cloudflare Scheduler Worker（Cron）

---

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
# 编辑 .env.local 填入 Supabase、OpenAI、Tavily 等密钥
```

完整环境变量说明见 [.env.example](.env.example)。

### 3. 初始化数据库

在 Supabase SQL Editor 中按顺序执行 `supabase/migrations/` 目录下的所有 SQL 文件。

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

---

## 技术栈

- **前端**: [Next.js 15](https://nextjs.org) / React 19 / TypeScript
- **部署**: [Cloudflare Workers](https://workers.cloudflare.com) (via OpenNext)
- **后端**: [Supabase](https://supabase.com) (PostgreSQL + Auth + Storage + pgvector)
- **定时任务**: Cloudflare Scheduler Worker (Cron)
- **AI**: [OpenAI](https://platform.openai.com) Responses API（Web Search + Embeddings）
- **搜索**: [Tavily](https://tavily.com) API（免费网页搜索）
- **备用 API**: Python FastAPI

---

## 项目结构

```
public-apis-resource/
├── apps/web/                 # Next.js 前端 + API Routes
│   ├── app/                  # App Router 页面
│   ├── components/           # UI 组件
│   ├── lib/                  # 核心模块（岗位、简历、队列、Agent）
│   └── tests/                # 测试（98 JS tests）
├── workers/scheduler/        # Cloudflare Scheduler Worker
├── supabase/migrations/      # 数据库迁移（26 个 SQL 文件）
├── scripts/                  # 验证、部署、监控脚本
├── cli/                      # 命令行工具
├── docs/                     # 架构、PRD、设计系统文档
├── .github/workflows/        # GitHub Actions CI/CD
├── .workbuddy/skills/        # WorkBuddy 项目技能
└── assets/                   # README 用图片资源
```

---

## 部署

### 前置条件

1. [Supabase](https://supabase.com) 项目（PostgreSQL + Auth + Storage）
2. [Cloudflare](https://cloudflare.com) 账号（Workers）
3. [OpenAI](https://platform.openai.com) API Key
4. [Tavily](https://tavily.com) API Key（免费）
5. [GitHub](https://github.com) 仓库（CI/CD）

### 部署步骤

1. **数据库**：在 Supabase SQL Editor 执行 `supabase/migrations/*.sql`
2. **环境变量**：在 Cloudflare Workers Settings 和 `.env.local` 中配置
3. **CI 自动部署**：推送到 `main` 分支，GitHub Actions 自动构建并部署
4. **手动部署**（CI token 过期时）：下载 CI artifact + `npx wrangler deploy`

详细部署指南见 [`.workbuddy/skills/cf-worker-deploy/SKILL.md`](.workbuddy/skills/cf-worker-deploy/SKILL.md)。

---

## 测试与验证

```bash
# 全量测试
npm run test:complete

# TypeScript 类型检查
npm --workspace apps/web run check
npm --workspace workers/scheduler run check

# 部署前验证
python scripts/validate_cloudflare.py
python scripts/verify_deployment_adaptations.py
python scripts/verify_complete_package.py
```

---

## 关键规则

- 不把校招正式岗、提前批正式岗或收费培训混入实习池
- 毕业年份、出勤天数、实习时长是硬过滤条件
- 推荐不等于已投递；只有用户确认后才标记 `submitted`
- 生成材料只能引用 Career Vault 中的真实证据
- 平台投递默认停在人工确认前；邮件默认只生成草稿
- 缺失信息用「待核验」而不是模型猜测

---

## 反馈与社区

你的反馈会直接影响下一版迭代：

- 🐛 [提交 Bug](https://github.com/ronineymessjr-sudo/public-apis-resource/issues/new?template=bug_report.yml)
- ✨ [功能建议](https://github.com/ronineymessjr-sudo/public-apis-resource/issues/new?template=feature_request.yml)
- 💬 [综合反馈](https://github.com/ronineymessjr-sudo/public-apis-resource/issues/new?template=feedback.yml)
- ⭐ 如果觉得有用，欢迎在右上角点一颗 Star

Web 端和 CLI 端也内置了反馈入口，随时随地可以提交。

---

## WorkBuddy 专家包

本项目已封装为 WorkBuddy 专家包，可在 WorkBuddy 中直接使用：

1. 在 WorkBuddy 的**专家中心**搜索「职业副驾」或「Career Copilot」
2. 或手动安装：解压 `career-copilot.zip` 到 `~/.workbuddy/plugins/marketplaces/my-experts/plugins/`
3. 运行注册脚本后即可在 WorkBuddy 对话中使用

---

## 路线图

- [x] Web 端求职工作台
- [x] CLI 命令行工具
- [x] WorkBuddy Expert 封装
- [x] MCP 工具接入
- [x] 异步队列 + Scheduler Worker
- [x] 跨端反馈系统
- [ ] Data Hub 数据看板
- [ ] 多语言简历生成
- [ ] 邮件自动化（草稿 + 人工确认）
- [ ] 与更多 ATS 直连同步

---

## 许可证

[MIT License](LICENSE) — 自由使用、修改、分发。

<div align="center">

**Made with ❤️ by Career Copilot Team**

如果这个项目帮到了你，请给我们一个 ⭐ Star

</div>
