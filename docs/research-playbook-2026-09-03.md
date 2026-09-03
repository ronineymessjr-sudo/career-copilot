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

## 小红书访问边界（必须区分）

- **仓库现状**：Career Copilot 的 MCP 端点和 WorkBuddy 专家包只提供本项目的求职工具；代码中没有小红书连接器、读取笔记工具或读取关注列表工具。浏览器里曾经能看到页面，是一次性的登录会话能力，不代表系统获得了平台 API 权限。
- **官方权限现状**：小红书开放平台首期只开放 `basic_info`；`user_profile`、`read_notes`、`read_followers` 和 `write_notes` 属于规划中/受限能力，敏感权限还需要额外业务、隐私和数据使用材料审核。因此不能把“插件无法获取”当成前端 bug，也不能用未授权批量抓取或验证码绕过来替代授权。
- **可持续方案**：优先走官方 OAuth/PKCE 与已批准 scope；在审批前只接受用户主动提供的公开 URL、截图或导出内容，并给每条内容记录来源和抓取时间。浏览器会话失效、风控、登录墙或页面超时都应显示为“不可验证”，不能伪造成已读取。

## Reddit 求职自动化拆解

把公开案例拆成可以复用的工程层，而不是照搬第三方代码：

1. **检索层**：多来源适配器、岗位详情提取和去重；优先官方 API/雇主 ATS，站点差异由适配器隔离。
2. **事实层**：先把个人经历建成结构化 profile/Career Vault，再让每个岗位引用证据 ID；每条要求标记 supported、partial 或 unsupported。
3. **定制层**：只调整允许变化的 summary、技能顺序和项目 bullet；禁止新增雇主、日期、指标、工具和职责。事实问题先停下来问用户，回答后才能生成干净版。
4. **质量层**：独立检查事实归属、隐私、岗位相关性、禁用词/模板化表达、页数和 PDF 可读性；浏览器填表后再做字段完整性检查。
5. **动作层**：搜索、评分、草稿和追踪可以自动化；密码/OTP/CAPTCHA、测评、法律声明和最终提交必须回到用户可见的审批点。所有尝试、失败原因和外部 URL 写入审计轨迹。
6. **反馈层**：用去重后的投递状态、回复和面试结果回流评分校准，不用“投递数量”单一指标优化。

这些边界与当前系统的 `verified_evidence_only`、MCP `approval_required`、异步 queue 和 trace 结构一致；当前缺口是平台级授权适配器，而不是再加一个未经授权的抓取插件。

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
- [小红书开放平台：授权范围](https://openaccount.xiaohongshu.com/docs/scope)
- [小红书开放平台：快速接入](https://openaccount.xiaohongshu.com/docs/quick-start)
- [Reddit：拒绝自动提交的求职 Agent](https://www.reddit.com/r/AI_Agents/comments/1unrgj2/i_built_a_job_application_agent_that_tailors_real/)
- [Reddit：9-agent 求职系统](https://www.reddit.com/r/ClaudeAI/comments/1sf42bz/i_built_a_9agent_job_application_system_on_claude/)
