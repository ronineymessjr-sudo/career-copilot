# 求职 Agent 研究与取舍（2026-09-03）

本次只阅读公开页面和仓库说明，目标是提炼能用于 Career Copilot 的工程模式，不复制第三方代码，也不执行第三方平台的投递动作。

## 公开案例的共同做法

- **Workopia MCP**：把岗位搜索、岗位详情、简历定制、求职信和追踪拆成独立工具，并让账户数据与工具调用绑定。
- **jobsearch-mcp**：先建立结构化画像，再复用画像做评分和定制；岗位详情使用多级提取，并以 Postgres、向量库和缓存分别承载状态、检索和重复请求。
- **ResumeAgent**：把解析、定制、评分、热力图和 PDF 输出拆开，强调可检查的中间结果和 BYOK 边界。
- **jobops**：把评分 rubric、tailoring rules、沟通语气和 negotiation playbook 配置化，方便按岗位族调整而不改主流程。
- **JobPilot / autopilot-jobhunt**：浏览器自动化的价值在于减少重复填表，但公开说明仍将账户登录、页面差异和最终提交视为需要用户可见和可接管的步骤。
- **Reddit 的公开工作流**：高质量做法通常是“结构化个人事实 → 需求映射 → 只改允许字段 → 输出前质量检查”，而不是让模型直接重写整份简历。
- **X 上的 Agent Skills 讨论**：可审查的技能文件、钩子、MCP allowlist、浏览器截图和发布门禁，是把 Agent 从“会写代码”变成“可交付系统”的关键。

## 与当前系统的映射

已经具备：

1. Career Vault 证据引用与 `verified_evidence_only`。
2. 规则、语义和历史信号的混合排序及冷启动校准。
3. LangGraph Supervisor → 专用 Agent → Grounding Evaluator。
4. MCP 读操作与高风险写操作的审批边界。
5. 应用包、简历版本、评测结果和 Agent trace 的持久化。

本次落地：

- 日报返回 `date`、`generated_at` 和 `timezone`，按 Asia/Shanghai 生成，避免跨日时显示旧日期。
- 保留公开 Demo 的运行状态反馈，让“待运行 / 分析中 / 需复核 / 已完成”与实际交互一致。
- 将研究结论固定在本文件，作为后续新增岗位源、质量门禁和简历排版功能的决策记录。

暂不采用：

- 无人值守自动提交、自动私信和自动发邮件。
- 未取得官方授权的站点批量抓取或绕过验证码/登录限制。
- 将未核验技能、指标或工作经历写入简历。

## 参考

- [Workopia MCP](https://github.com/workopia/workopia-mcp)
- [jobsearch-mcp](https://github.com/TadMSTR/jobsearch-mcp)
- [ResumeAgent](https://github.com/ApplyU-ai/ResumeAgent)
- [jobops](https://github.com/HireBridge/jobops)
- [JobPilot](https://github.com/suxrobgm/jobpilot)
- [autopilot-jobhunt](https://github.com/tarunlnmiit/autopilot-jobhunt)
- [X：Agent Skills 与工程门禁讨论](https://x.com/heygurisingh/status/2042079245548351831)
- [Reddit：受控的简历定制工作流](https://www.reddit.com/r/AgenticWorkers/comments/1vrvmc9/how_i_structure_a_resume_workflow_so_ai_cannot/)
