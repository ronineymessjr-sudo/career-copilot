<div align="center">

![Career Copilot Banner](assets/banner.png)

# Career Copilot

**证据驱动的 AI 求职工作台**

把岗位发现、JD 拆解、简历定制、投递跟踪和面试复盘，收进一条可解释、可复核的工作流。

[![Cloudflare deploy](https://github.com/ronineymessjr-sudo/career-copilot/actions/workflows/cloudflare-deploy.yml/badge.svg)](https://github.com/ronineymessjr-sudo/career-copilot/actions/workflows/cloudflare-deploy.yml)
[![Public smoke](https://github.com/ronineymessjr-sudo/career-copilot/actions/workflows/public-smoke.yml/badge.svg)](https://github.com/ronineymessjr-sudo/career-copilot/actions/workflows/public-smoke.yml)
[![Engineering evidence](https://github.com/ronineymessjr-sudo/career-copilot/actions/workflows/engineering-evidence.yml/badge.svg)](https://github.com/ronineymessjr-sudo/career-copilot/actions/workflows/engineering-evidence.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MCP Ready](https://img.shields.io/badge/MCP-ready-6366f1)](https://modelcontextprotocol.io)

<p>
  <a href="https://career-copilot-v2.photomagic.workers.dev/playground"><strong>立即体验公开 Demo</strong></a>
  ·
  <a href="https://career-copilot-v2.photomagic.workers.dev/login">进入个人工作台</a>
  ·
  <a href="https://github.com/ronineymessjr-sudo/career-copilot/issues">提交反馈</a>
</p>

</div>

---

## 项目介绍

Career Copilot 是一个面向求职者的 AI 工作台，把岗位搜索、JD 分析、项目证据整理、简历定制、求职信生成、投递跟踪和面试复盘放在同一个地方。

它适合需要同时管理多个求职方向的人：你可以为 AI、产品、运营、研究、解决方案等岗位维护不同版本的材料，并根据每份 JD 快速生成匹配内容。

从一份岗位描述开始，Career Copilot 会提炼岗位要求，匹配你的项目经历，指出能力缺口，再生成可继续编辑的简历、求职信和面试准备内容。

## 主要能力

| 模块 | 产出 |
| --- | --- |
| 岗位发现 | 聚合公开 ATS 来源，去重并保留原始岗位链接 |
| JD 分析 | 提取必备条件、加分项、职责、隐含要求和风险 |
| 匹配与证据 | 用已核验项目证据解释匹配点、缺口和推荐档位 |
| 简历工作流 | 维护多份 Persona，生成岗位定制简历、求职信和回答包 |
| 投递管理 | 记录待确认、已打开、已提交、面试和 Offer 状态 |
| 复盘与学习 | 追踪渠道转化、面试反馈和下一步行动 |

![核心能力](assets/features.png)

## 选择你的入口

| 入口 | 适合场景 | 位置 |
| --- | --- | --- |
| Web 公开 Demo | 第一次体验，不登录 | [career-copilot-v2.photomagic.workers.dev/playground](https://career-copilot-v2.photomagic.workers.dev/playground) |
| Web 个人工作台 | 保存画像、简历、岗位和投递进度 | [career-copilot-v2.photomagic.workers.dev/login](https://career-copilot-v2.photomagic.workers.dev/login) |
| 微信小程序内部版 | 微信登录、内部工作台和隐私边界 | [`apps/miniprogram`](apps/miniprogram) · [`docs/WECHAT_MINIPROGRAM_REVIEW.md`](docs/WECHAT_MINIPROGRAM_REVIEW.md) |
| CLI | 本地搜索、排序、生成材料 | [`cli/index.mjs`](cli/index.mjs) |
| MCP | 接入支持 MCP 的 Agent | [career-copilot-v2.photomagic.workers.dev/api/mcp](https://career-copilot-v2.photomagic.workers.dev/api/mcp) |
| GitHub Actions | 构建、校验、部署和公开 Smoke | [`.github/workflows`](.github/workflows) |

兼容的 AI 入口包括 WorkBuddy、Claude Code、OpenAI Codex、OpenCode 和其他 MCP 客户端。入口不同，但使用的是同一套岗位分析和材料工作流。

## 本地 CLI：最快开始

CLI 的数据全部保存在本地 `career-data/`，不需要部署 Web，也不需要 OpenAI key；岗位网页搜索使用 Tavily。

```bash
git clone https://github.com/ronineymessjr-sudo/career-copilot.git
cd career-copilot
npm install

# macOS / Linux / Git Bash
cp .env.example .env.local
# PowerShell：Copy-Item .env.example .env.local
# 编辑 .env.local，填入 TAVILY_API_KEY

npm run cli -- init
# 编辑 career-data/profile.json 和 career-data/evidence.json
npm run cli -- pipeline
```

常用命令：

```bash
npm run cli -- search         # 搜索并累积去重岗位
npm run cli -- rank           # 评价、排序和档位推荐
npm run cli -- resume         # 生成多档位简历
npm run cli -- resume:review  # 复盘摘要、关键词和证据覆盖
npm run cli -- cover-letter   # 为选定岗位生成求职信
npm run cli -- jd <文本或URL>  # 深拆一份 JD
npm run cli -- interview      # 生成面试准备包
npm run cli -- outcome list   # 查看投递结果
```

完整命令和逐步引导见 [`AGENTS.md`](AGENTS.md)。

## 本地 Web 开发

```bash
npm install
npm run web:dev
```

打开 `http://localhost:3737`。公开 Demo 可独立演示；个人工作台需要配置 Supabase URL、Publishable Key 和对应迁移。生产密钥只放在本地环境、Cloudflare Secrets 或 GitHub Actions Secrets，不要提交到仓库。

## 系统架构

![系统架构](assets/architecture.svg)

```text
Next.js / React Web
        │
        ├── Cloudflare OpenNext Web Worker
        ├── Scheduler Worker（每日任务）
        ├── Supabase Auth + PostgreSQL + Storage + pgvector
        ├── FastAPI evidence service（可选）
        └── CLI / MCP / WorkBuddy / 其他 Agent 入口
```

所有入口共享同一套岗位发现、证据匹配、材料准备和复盘能力。

## 测试与校验

提交前建议运行：

```bash
npm run test:complete
npm run check
python scripts/validate_cloudflare.py
python scripts/verify_deployment_adaptations.py
python scripts/verify_complete_package.py
```

生产部署由 GitHub Actions 自动执行构建、Cloudflare 校验和公开 Smoke 检查。

## 反馈与贡献

- [报告 Bug](https://github.com/ronineymessjr-sudo/career-copilot/issues/new?template=bug_report.yml)
- [提出功能建议](https://github.com/ronineymessjr-sudo/career-copilot/issues/new?template=feature_request.yml)
- [提交综合反馈](https://github.com/ronineymessjr-sudo/career-copilot/issues/new?template=feedback.yml)

欢迎围绕可复现的岗位解析、证据匹配、简历质量和使用体验提交改进建议。

## 路线图

- [x] 公开 Demo、Web 工作台和本地 CLI
- [x] 多 Persona 简历与证据核验
- [x] MCP 接入和 GitHub Actions 发布链路
- [ ] 更完整的公开访客与注册漏斗分析
- [ ] 更多公开 ATS 来源与岗位质量反馈
- [ ] 简历版本对比和更细的面试学习闭环

## 许可证

[MIT License](LICENSE)。

<div align="center">

**Made with ❤️ by Career Copilot Team**

</div>
