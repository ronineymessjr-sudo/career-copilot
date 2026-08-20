# 任毅文

**AI 解决方案实习生｜AI 应用实施支持｜需求到交付**  
南通崇川 / 南京浦口 / Remote｜GitHub: https://github.com/ronineymessjr-sudo/career-copilot

## 个人简介

人工智能方向本科生，拥有 AI Agent、摄影工作流和数据策略系统的项目实践。擅长把业务描述整理成对象、约束、接口和验收项，再用 RAG、结构化输出、规则校验和人工审批把方案落到可运行流程。适合 AI 应用实施、解决方案助理、售前技术支持和项目交付实习。

## 能力概览

需求澄清与方案拆解｜流程/状态图｜API 与数据模型理解｜RAG 与知识库｜FastAPI/Next.js｜PostgreSQL/Supabase｜Docker/Cloudflare｜证据与风险校验｜测试与交付文档｜跨角色沟通

## 项目经历

### Career Copilot V2｜AI 求职智能体平台

- **从场景到方案：** 把求职流程拆成岗位来源、JD 要求、候选人画像、项目证据、简历版本、材料包、审批和跟进事件；每个环节都有数据库对象、API 或状态记录。
- **搭建“检索—生成—校验—审批”链路：** 通过 Supabase/PostgreSQL/pgvector 保存用户证据和向量检索上下文，Agent 生成岗位分析和简历草稿，grounding evaluator 检查引用覆盖，审批门阻止未确认的外部动作。
- **实现方案交付接口：** 提供 `/api/control/jobs`、`/api/control/ranking/jobs`、`/api/control/resumes`、`/api/control/applications`、`/api/mcp` 和 queue endpoints；慢任务由 Scheduler/Service Binding 触发，结果通过轮询返回。
- **处理多平台和来源差异：** 支持公开 ATS 来源、真实岗位详情 URL、来源健康、去重和生命周期检测；把公开发现、用户私有岗位和平台最终提交分开，避免把“搜索结果”误报为“已投递”。
- **完成部署与回测：** 使用 OpenNext Cloudflare Worker + Scheduler Worker + GitHub Actions 完成上线；运行时、公开 Playground 和 Scheduler health 通过公网检查，部署版本 2.0.2。
- **形成交付文档：** 保留架构、迁移、Secrets、Smoke、release evidence、部署 handoff 和平台运行状态文档，方便把系统交给另一位开发或运营人员继续使用。

### Camera Market Strategy System｜可信价格情报系统

- **把业务信号分级：** 公开抓取只能创建 `VISIBLE_PRICE`/`UNVERIFIED`；只有 operator 上传的 checkout evidence 通过 SHA-256、来源 provenance、时间新鲜度和币种匹配，才能成为 strategy eligible。
- **实现后端服务边界：** FastAPI + SQLAlchemy 负责 health/ready、证据上传、reviews、jobs、notifications 和 source-health；PostgreSQL/Supabase 负责正式数据，SQLite 仅用于开发和迁移源。
- **设计异步 worker：** daily flow、crawls、reports 和 provider sync 使用 PostgreSQL job 表；worker 通过 `FOR UPDATE SKIP LOCKED` 领取任务，避免并发重复处理，并保留 request id/结构化日志。
- **支持受控部署：** Docker/GHCR 提供不可变镜像，Cloudflare Worker 做边缘入口，Cloudflare Access/Tunnel 保护私有应用；production readiness 明确要求 secrets、备份、迁移、trust check 和 remote smoke 全部通过。
- **验证路径：** 后端测试 43 项通过、前端生产构建通过、依赖审计记录为 0 vulnerabilities、cloud runtime guard 通过；文档仍明确未满足远程门禁前不宣称 production live。

### PhotoAtelier Agent Lab｜摄影方案 Agent

- **将摄影需求结构化：** 以 Brief、场景、时长、受众、灯光、设备和约束为输入，输出版本化的拍摄计划、shots、tasks 和 luts。
- **设计可恢复流程：** LangGraph 负责 normalize、classify、retrieve、generate、schema validation、摄影规则校验、审批和写入；失败节点可恢复，审批节点可暂停。
- **接入 RAG 与模型适配：** LangChain 统一 Prompt、Retriever、Tool 和 Structured Output；RAG 可在本地 fixture、PGVector、Milvus 之间切换，缺少外部模型时使用 deterministic fallback。
- **建立交付边界：** 未审批只保存 draft，审批后才写入正式业务对象；不把 Agent 服务直接写入外部 Feishu、Worker 或真实第三方账号。

## 教育经历

南京中悦大学｜人工智能方向本科｜2024.09–2028.09

## 投递边界

此版本适合“AI 应用实施/解决方案助理/项目交付实习”。对于要求独立承担客户咨询或商业售前的岗位，需要先补充真实客户沟通证据，不把个人项目夸大为商业交付。
