# 任毅文

**AI 产品经理实习生｜智能应用产品｜PRD/用户流程/数据复盘**  
南通崇川 / 南京浦口 / Remote｜GitHub: https://github.com/ronineymessjr-sudo/career-copilot

## 个人简介

人工智能方向本科生，项目实践集中在 AI 产品从需求理解、能力拆解、交互流程、证据约束到上线验证的完整闭环。能够和工程一起讨论 API、数据模型、队列和部署，也能从用户任务、风险边界和可解释性反推产品方案。项目材料以可演示、可复核和可迭代为目标，不用未经核验的商业指标包装项目。

## 产品能力

需求分析与 JD 拆解｜用户流程与状态设计｜PRD/验收标准｜Figma/界面协作｜AI Agent/RAG/MCP 基础｜数据与反馈闭环｜版本管理｜人工审批与风险控制｜跨前后端协作

## 项目经历

### Career Copilot V2｜AI 求职操作系统

**产品角色：** 产品设计与全栈实现｜Web、CLI、MCP、GitHub Actions 多入口

- **定义核心用户闭环：** 将“找岗位”拆为岗位池、来源可信度、JD 分析、资格检查、证据匹配、简历版本、材料缺口、审批投递和后续跟踪，而不是只做一个简历生成页面。
- **设计多 persona 简历系统：** 工程研发、AI 产品、AI 解决方案和本地过渡四种版本共享 Career Vault 证据，但分别改变项目顺序、技能放大和岗位话术；每次生成保留版本号、对齐信息和 evidence refs。
- **建立推荐决策模型：** 把规则分、语义证据分和历史反馈分拆开显示；对届别、实习属性、出勤要求、截止日期设置硬约束；在推荐卡中同时展示命中技能、缺口、阻断原因和需要人工核验的事实。
- **设计“可操作但不越权”的投递流：** 系统可生成完整 application kit、邮件草稿、申请链接和回答材料，但 `create_email_draft`、状态变更和最终提交必须通过单独审批；运行时保留 `automatic_submission: false` 和 `automatic_email_send: false`。
- **把异步任务做成产品能力：** 通过 submit/poll/result/consume 队列 API 处理搜索、排序和慢任务；Scheduler 负责 daily recommendations、weekly review 和队列消费；前端用状态和通知展示进度，而不是让用户等待一个长请求。
- **设计数据隔离和信任层：** Career Copilot 使用独立 `career_copilot` schema，用户画像、简历、证据和投递状态按 user_id/RLS 隔离；公开 Playground 只使用 fixture，不读取私有 Career Vault。
- **上线与验收：** 线上公开页面、运行时和 Scheduler 健康接口已验证 200；本地完整测试 100 项通过；M08.1 fixture 评估保留 recall、precision、MRR、citation coverage 和 unsupported claims，但明确标注为回归夹具而非泛化模型指标。

**产品面试可讲：** 为什么“生成简历”必须拆成证据检索、对齐、grounding 和审批；为什么推荐系统要让用户看到缺口，而不是只给一个分数；如何把平台登录、公开岗位源和最终提交分成不同风险等级。

### PhotoAtelier Agent Lab｜摄影工作流产品化实验

- **从业务对象倒推 Agent：** 以摄影项目、Brief、参考素材、拍摄计划和历史方案作为业务上下文，先规范化需求，再检索资料、生成计划、校验规则，最后等待批准写入正式记录。
- **定义可解释状态：** 把 draft、awaiting_approval、writing、completed、failed 做成一等状态；每个 run 保存 prompt/schema 版本、上下文快照、验证结果和 trace_id，方便产品复盘和问题定位。
- **定义人机边界：** Agent 可以建议拍摄方案、shots、tasks 和 luts，但不能跳过审批直接写入或调用外部账号；审批后的写入还要再次执行 Schema 和摄影规则校验。
- **设计可替换技术层：** LangChain 负责模型、Prompt、Retriever、Tool 和结构化输出；LangGraph 负责状态编排；RAG 层通过 PGVector/Milvus/Redis/本地 fallback 适配不同运行环境。
- **验证体验：** FastAPI 为前端、测试和后续 Worker 提供统一入口；当前本地实验平台以 deterministic fallback 保证无外部密钥时也能演示和测试。

### Camera Market Strategy System｜价格情报与策略产品

- **定义“可见价格不等于可行动价格”：** 将公开页面和导入数据分为 visible/unverified/legacy import，只有上传 checkout evidence 并通过新鲜度、来源和 hash 校验后才进入策略触发。
- **设计单运营者工作台：** 覆盖产品与 watchlist、证据上传、reviews、source health、策略评估、报告和通知；后续操作通过 review/notification 让人做最终判断。
- **将同步按钮升级为异步工作流：** daily flow、爬取、报告和 provider sync 进入 PostgreSQL jobs，由 worker 使用 `FOR UPDATE SKIP LOCKED` 消费；前端通过 job status 和 request id 展示真实进度。
- **建立上线验收条件：** readiness、migration tracking、trust invariant、Cloudflare Tunnel、私有 Access 和 remote smoke test 全部纳入生产门禁；文档明确区分本地 verified 和真正 production live。

## 教育经历

南京中悦大学｜人工智能方向本科｜2024.09–2028.09

## 版本说明

该版本优先投递 AI 产品、AI Agent 产品、智能应用产品和产品运营实习；如果 JD 更强调后端实现，则切换到工程研发版。
