# 任毅文

**AI 应用实施/项目交付实习生｜需求拆解｜RAG/Agent｜FastAPI/Next.js**  
南通崇川 / 南京浦口 / Remote｜GitHub: https://github.com/ronineymessjr-sudo/career-copilot

## 个人简介

人工智能方向本科生，围绕 AI 求职工作台、摄影工作流 Agent 和价格策略系统积累了从需求澄清、流程设计、接口实现、校验、部署到交付文档的项目实践。擅长把模糊需求拆成业务对象、状态、接口、证据和验收条件，能够和产品、工程及使用方沟通技术边界与风险。

## 核心能力

需求澄清｜方案拆解｜流程/状态图｜PRD 与验收标准｜API/数据模型｜RAG/Agent｜FastAPI/Next.js｜PostgreSQL/Supabase｜Docker/Cloudflare｜测试、Smoke 与交接文档｜人工审批与风险控制

## 项目经历

### Career Copilot V2｜证据驱动的 AI 应用交付平台

- **拆解完整业务闭环：** 将岗位发现、JD 分析、资格检查、项目证据、简历版本、材料包、审批、投递入口和跟进状态拆成可追踪对象与 API。
- **搭建检索—生成—校验—审批链路：** 使用 LangGraph 编排 Agent，Supabase/PostgreSQL/pgvector 保存证据与状态，grounding evaluator 检查引用覆盖，approval gate 阻止未确认的外部写入。
- **交付多入口能力：** Web 工作台、CLI、MCP、异步 queue API 和 Scheduler 协同；慢任务通过 submit/poll/result 返回，不把未完成任务显示成成功。
- **完善上线交接：** 保留迁移、Secrets、Cloudflare OpenNext、Scheduler、Smoke、release evidence 和 deployment handoff 文档，便于另一位开发或运营人员接手。

### PhotoAtelier Agent Lab｜摄影业务工作流方案

- **把自然语言需求变成结构化方案：** 输入项目 Brief、参考素材和约束，输出版本化拍摄计划、shots、tasks 和 luts。
- **实现可恢复状态图：** LangGraph 依次执行 normalize、retrieve、generate、schema validation、摄影规则校验、human approval 和 local write；每一步保留 trace 和验证结果。
- **处理外部依赖缺失：** 没有外部模型 key 时使用 deterministic local fallback；检索或 Cross Encoder 不可用时使用明确标记的 lexical fallback，不宣称真实模型质量。
- **控制交付风险：** 审批前只保存 draft，审批后重新校验再写入；不直接调用真实飞书、Cloudflare 或第三方生产账户。

### Camera Market Strategy System｜价格情报方案交付

- **定义可信数据和业务门禁：** 将 `VISIBLE_PRICE / UNVERIFIED / LEGACY_IMPORT` 限定为线索，只有新鲜、币种匹配且带可信上传证据的 `VERIFIED_CHECKOUT` 才可触发策略。
- **实现异步任务与运行状态：** daily flow、crawls、reports、provider sync 进入 PostgreSQL jobs，worker 使用 `FOR UPDATE SKIP LOCKED`，前端通过 job status 与 request id 展示真实进度。
- **建立生产验收标准：** readiness、真实证据到信号流程、通知创建、每日任务、Cloudflare Access/Tunnel 和 zero-invalid-triggered-signals 都作为 release gate，而不是只看容器是否启动。

## 教育经历

南京中悦大学｜人工智能方向本科｜2024.09–2028.09

## 适用岗位

AI 应用实施实习、解决方案助理、项目交付实习、售前技术支持、AI 产品项目助理、远程项目制实习。

## 事实边界

个人项目可以证明技术方案和交付方法，但不应包装成真实客户交付、商业收入或独立售前业绩；如岗位要求客户沟通案例，应在投递前补充真实经历。
