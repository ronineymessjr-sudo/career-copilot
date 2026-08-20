# 任毅文

**AI Agent 应用研发实习生｜LLM 应用开发｜Python/FastAPI**  
南通崇川 / 南京浦口 / Remote｜GitHub: https://github.com/ronineymessjr-sudo/career-copilot

## 个人简介

人工智能方向本科生，持续构建可运行、可测试、可解释的 AI 应用。项目经历覆盖 Agent 工作流、RAG/pgvector、MCP 工具、异步任务、FastAPI/Next.js 全栈交付和 Cloudflare/Supabase 生产部署。擅长把开放式需求拆成可追踪的状态、接口、证据和验收规则；关注生成结果是否可复核，以及最终动作是否经过人工确认。

## 技术栈

**语言与后端：** Python、TypeScript/JavaScript、FastAPI、Node.js、SQL、REST、JSON-RPC  
**AI/Agent：** LangChain、LangGraph、RAG、pgvector、MCP、Prompt/Tool Calling、Grounding、Retrieval Evaluation  
**前端与数据：** Next.js、React、Tailwind、PostgreSQL、Supabase Auth/Storage、SQLAlchemy  
**交付与质量：** Docker、GHCR、Cloudflare Workers/OpenNext、Cloudflare Scheduler、GitHub Actions、Node Test、pytest、Smoke Test

## 项目经历

### Career Copilot V2｜Evidence-driven AI 求职智能体平台

**项目定位：** 个人项目 / 独立开发｜Web + CLI + MCP 多入口｜生产 Worker：`career-copilot-v2.photomagic.workers.dev`

- **设计 Agent 工作流：** 将岗位发现、JD 解析、资格硬约束、混合排序、证据检索、定制简历、面试准备和投递跟踪拆成 supervisor、job ranker、JD analyst、resume agent、grounding evaluator 等可审计节点；每次运行记录任务类型、输入摘要、输出摘要、trace 和 evidence refs。
- **实现可解释匹配：** 在 `rankJobHybrid` 中组合规则分、语义证据分和历史反馈分；对“非实习、仅毕业生、届别不符、出勤不足”等条件设置硬阻断，并把 `matched_skills`、`missing_skills`、`blockers` 和引用一起返回，避免只给一个不可解释的总分。
- **实现证据约束生成：** 只接受 active 且 verification status 为 verified 的 Career Vault 证据；简历草稿包含 `evidence_refs`、`generation_contract`、`truth_check` 和 `final_confirmation_required`，通过 grounding 检查后才进入待审状态。
- **实现 MCP 与安全边界：** 提供 `search_jobs`、`analyze_job`、`rank_jobs`、`find_evidence`、`list_resume_versions`、`generate_resume_draft` 等工具；创建邮件草稿、更新投递状态等有副作用的操作标记为 `approval_required`，运行时明确关闭自动投递和自动发信。
- **完成生产链路：** 使用 Next.js/React 构建工作台，Supabase 提供 Auth、Storage、PostgreSQL 和 pgvector，Cloudflare OpenNext 承载 Web Worker，Scheduler 通过私有 Service Binding 触发 daily/weekly/queue consumer；GitHub Actions 负责构建、密钥注入、部署和 Smoke Test。
- **交付异步队列：** 实现 `/api/queue/submit`、`/api/queue/poll`、`/api/queue/result`、`/api/queue/consume`，将慢任务从同步请求中拆出；队列消费由 Scheduler 触发，前端可轮询结果而不阻塞主工作台。
- **验证与上线：** 本地完整 Node 测试 100 项通过；线上 `/api/runtime`、公开 `/playground` 和 Scheduler `/health` 均返回 200，运行时版本 2.0.2、Supabase 已配置，自动提交保持关闭。

**可展示接口：** `/api/runtime`、`/playground`、`/api/mcp`、`/api/control/agents/run`、`/api/control/ranking/jobs`  
**面试可讲：** 为什么规则分、语义分和历史分要分开；为什么证据引用必须跟着生成结果走；如何通过 approval-first 阻断无人值守投递。

### PhotoAtelier Agent Lab｜摄影工作流 Agent 实验平台

**项目定位：** 本地 Agent Lab / 业务工作流实验｜不宣称为外部生产服务

- **建模显式状态图：** 用 LangGraph 编排 `normalize_request → classify_intent → retrieve_context → assemble_prompt → generate_plan → validate_schema → validate_photography_rules → create_draft → await_human_approval → write_local_records → audit_and_respond`，让每一步可暂停、恢复、重试和解释。
- **接入结构化生成：** 用 LangChain 统一 ChatModel、Prompt、Retriever、Tool 和 Structured Output，要求 Agent 返回版本化 JSON Schema，而不是把自然语言直接写入正式业务对象。
- **实现 RAG 与适配器边界：** 以项目 Brief、摄影规则、参考素材和历史方案作为上下文；通过 PGVector/Milvus、Redis、外部搜索和模型适配器保留替换空间，并提供 deterministic fallback 以便无外部密钥时复现。
- **建立审批写入规则：** 草稿、`awaiting_approval`、`writing`、`completed`、`failed` 分离；审批前只生成可编辑方案，审批后才写入 shots、tasks、luts 等正式记录；同一 run 使用幂等标识避免重复写入。
- **提供 FastAPI 与测试入口：** 暴露本地 HTTP API，保留 trace_id、promptVersion、schemaVersion、contextSnapshot、outputJson 和 validationJson，便于回放和面试解释；审查记录中 Node 测试 19 项通过。

### Camera Market Strategy System｜价格与市场策略系统

**项目定位：** V0.15 生产准备路径 / 数据可信度与异步任务实践

- **设计价格可信度规则：** 将 `VISIBLE_PRICE / UNVERIFIED / LEGACY_IMPORT` 视为线索，只有上传结账凭证、证据哈希、来源和新鲜度检查通过后，才允许进入策略触发边界。
- **实现证据上传链路：** 后端使用 FastAPI、SQLAlchemy、PostgreSQL/Supabase；支持私有 Storage、JPEG/PNG/WebP/PDF 校验、SHA-256 hash、上传 provenance、single-use upload 记录和信号一致性检查。
- **实现异步任务与并发保护：** 将 daily flow、爬取、报告和 provider sync 放入 PostgreSQL-backed jobs；worker 使用 `FOR UPDATE SKIP LOCKED` 领取任务，减少重复消费和并发写入风险。
- **交付前后端与边缘入口：** 前端使用 Next.js 16，后端通过 Docker/GHCR 交付，Cloudflare Worker 负责 public edge，私有应用通过 Cloudflare Access 和 Tunnel 进入；提供 health、ready、reviews、evidence/upload、reports 和 notifications 等 API。
- **本地验证：** V0.15 路径记录为后端 43 tests passed、Next.js production build passed、dependency audit 0 vulnerabilities 和 cloud runtime guard passed；生产上线仍以真实 secrets、Access、Tunnel 和远程 smoke gate 为准。

## 教育经历

南京中悦大学｜人工智能方向本科｜2024.09–2028.09

## 备注

本版本按工程岗位组织项目；没有把设计文档写成已接入的外部服务，也没有把本地 fallback 写成模型训练或商业化结果。
