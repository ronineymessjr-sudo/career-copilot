# 任毅文

**AI 应用与项目实践｜技术产品协作｜数据分析**  
南通崇川 / 南京浦口 / Remote｜GitHub: https://github.com/ronineymessjr-sudo/career-copilot

## 个人简介

人工智能方向本科生，围绕三个可运行项目形成了“业务理解—技术实现—验证交付”的完整实践：Career Copilot 负责 Agent 与求职流程，PhotoAtelier 负责摄影工作流产品和 Agent 实验，Camera Market Strategy System 负责价格证据、策略与异步任务。能够在产品、前端、后端、数据和部署之间协作，适合 AI 应用、技术产品、数据分析和项目支持类实习。

## 关键能力

Python｜FastAPI｜SQL/PostgreSQL｜Next.js/React/TypeScript｜LangChain/LangGraph｜RAG/pgvector｜MCP｜PRD/Figma｜Docker｜Cloudflare｜Supabase｜GitHub Actions｜测试与验收

## 项目经历

### Career Copilot V2｜证据驱动的 AI 求职操作系统

- **产品化求职任务：** 构建岗位发现、JD 拆解、资格筛选、混合排名、证据检索、简历版本、申请材料、面试准备和转化分析的端到端工作台。
- **技术实现：** Next.js/React 前端配合 Cloudflare OpenNext Worker；Supabase/PostgreSQL/pgvector 负责 Auth、Storage、用户数据和检索；LangGraph 编排 Agent；MCP 暴露跨客户端工具。
- **可信生成：** 通过 verified evidence 过滤、citation refs、grounding evaluation 和 human approval gate，保证生成简历只能引用已核验项目，不能自动发送或提交。
- **系统交付：** 实现多入口 Web/CLI/MCP、异步 queue API、Scheduler daily/weekly/consume、GitHub Actions 部署和 runtime/smoke evidence；公网 Web、Playground 和 Scheduler health 均已验证。
- **质量验证：** 当前仓库完整 Node 测试 100 项通过；公开 fixture 的 retrieval/grounding 评估明确记录为回归夹具，不冒充外部数据集 benchmark。

### PhotoAtelier Agent Lab｜摄影工作流与结构化 Agent

- 将摄影项目 Brief、参考素材和规则作为 RAG 上下文，生成可编辑的拍摄计划而非无约束文本。
- 使用 LangGraph 组织需求规范化、上下文检索、方案生成、Schema 校验、摄影规则校验、审批和正式写入。
- 使用 LangChain 统一 Prompt、Retriever、Tool 和 Structured Output；保留 prompt/schema version、context snapshot、output JSON、validation JSON 和 trace_id。
- 通过本地 deterministic fallback、FastAPI API 和 Node/pytest 测试让流程在没有外部模型密钥时仍可复现；不把 local design 误报成线上生产接入。

### Camera Market Strategy System｜价格分析与可信策略

- 使用 Python/FastAPI、SQLAlchemy、PostgreSQL/Supabase、Next.js、Docker/GHCR 和 Cloudflare 构建单运营者价格情报平台。
- 将公开价格线索、未验证导入和已验证结账证据分层；通过私有 Storage、SHA-256 hash、上传 provenance 和 freshness/currency 检查保护策略触发。
- 使用 PostgreSQL asynchronous jobs、worker/scheduler 和 `FOR UPDATE SKIP LOCKED` 处理 daily flow、crawls、reports 和 provider sync。
- 提供 health/readiness、reviews、evidence upload、notifications、source health 和 job status 入口；本地验证包含 43 个后端测试、生产构建和 cloud runtime guard。

## 教育经历

南京中悦大学｜人工智能方向本科｜2024.09–2028.09

## 适用岗位

AI 应用开发实习、AI 产品实习、技术产品助理、数据分析实习、AI 项目支持、远程项目制实习。

## 版本说明

该版本不抢占明确岗位的关键词；遇到工程 JD 使用工程版，遇到 PRD/用户流程 JD 使用产品版，遇到实施/交付 JD 使用解决方案版。
