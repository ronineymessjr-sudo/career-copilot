# 任毅文

**AI 数据分析实习生｜Python/SQL｜AI 应用与市场分析**  
南通崇川 / 南京浦口 / Remote｜GitHub: https://github.com/ronineymessjr-sudo/career-copilot

## 个人简介

人工智能方向本科生，项目实践覆盖数据整理、岗位与证据评分、市场价格分析、异步任务和可解释报告。能够使用 Python、SQL、PostgreSQL、FastAPI 和前端可视化把原始信息整理成可追踪的数据对象、指标和行动建议；重视数据来源、时间新鲜度和结论边界，不用未经验证的数字包装结果。

## 核心能力

Python｜SQL/PostgreSQL｜FastAPI｜数据清洗与规则建模｜指标设计｜来源可信度｜异步任务｜结构化日志｜Next.js/React｜Supabase｜Docker｜测试与验收

## 项目经历

### Camera Market Strategy System｜相机市场价格与策略分析平台

- **建立数据可信度分层：** 将页面可见价格、未验证导入、历史导入和已验证结算证据拆成不同信任状态，避免把单个低价直接当作可执行策略。
- **实现证据数据链路：** 使用 FastAPI、SQLAlchemy、PostgreSQL/Supabase 保存产品、listing、price、证据 provenance、SHA-256 hash 和策略信号，支持按来源、时间和可信状态复核。
- **设计价格到策略的规则：** 只有上传 CHECKOUT/CART/ORDER 证据、来源和币种匹配、数据仍在新鲜窗口内时，记录才进入 strategy eligible；其他记录只能作为分析线索。
- **实现异步分析任务：** daily flow、爬取、报告和 provider sync 进入 PostgreSQL jobs，worker 用 `FOR UPDATE SKIP LOCKED` 领取，前端用 job id 查询状态，避免长任务阻塞接口。
- **提供分析与运维接口：** 包含 health/ready、reviews、reports、source-health、notifications 和 job status，保留 request id、JSON 日志和失败原因，方便定位来源质量变化。

### Career Copilot V2｜岗位与项目证据分析平台

- **构建岗位混合评分：** 将规则资格、项目语义匹配和同渠道历史反馈拆开，返回 final score、等级、命中技能、缺失技能、blockers 和证据引用。
- **实现可复核检索：** 只使用 active 且 verified 的 Career Vault 证据；向量不可用时切到 lexical 模式，并标记降级状态，不把 fallback 伪装成向量结果。
- **设计评估指标：** 在回归夹具中保留 Recall@K、Precision@K、MRR、citation coverage 和 grounding 结果，用于比较检索与引用质量；不把夹具结果宣称为外部 benchmark。

### PhotoAtelier Agent Lab｜摄影工作流数据结构化实验

- 将 Brief、参考素材、规则、shots、tasks 和审批状态建模为结构化状态，使用 trace、schema validation 和 provider status 支撑回放与问题定位。
- 使用 chunk、检索、重排和确定性 fallback 让本地环境可以重复运行；当资料不足时明确返回“资料不足”，不强行生成看似完整的结论。

## 教育经历

南京中悦大学｜人工智能方向本科｜2024.09–2028.09

## 适用岗位

AI 数据分析实习、数据产品实习、商业分析助理、AI 应用数据支持、价格/市场情报实习。

## 事实边界

本版本不写虚构的用户量、收入、准确率或商业客户；Camera Market 的生产运行必须以真实 Supabase/Postgres、Access/Tunnel、证据到信号 E2E 和远程 smoke gate 为准。
