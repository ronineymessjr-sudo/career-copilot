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

## GitHub 进一步筛选（2026-09-03）

- **StoneLL1/resume-builder**：最接近“简历优化作者”的公开实现。它把近百篇小红书高赞经验帖蒸馏成 skill，并把 claim-map、已确认/待确认/缺失阻塞/已省略四态、按目标岗位分版本、一页 PDF 和 ATS 单栏排版写进流程；它还明确把“投简历”保留为人工动作。
- **sunyet-01/ai-job-search-cn**：中文岗位的 JD 评估、定制简历 PDF、投递清单和中国化维度（工作强度、通勤、公司稳定性）；适合补充中文岗位规则，但其前端仍在开发中。
- **shuheng-mo/career-ops-china**：用 archetype、title filter、评分权重和 bookmarklet 适配国内 SPA/登录墙，强调“过滤器”而非海投；适合借鉴岗位族配置和用户侧 JD 捕获，不应复制绕过反爬的表述。
- **riwonswain-ovo/OfferLoop**：把招聘机会、投递、经历深挖、面试和复盘拆成长期 Skill/工作区闭环；适合借鉴跨阶段状态、增量同步和失败后续跑。
- **shengjidaguai-china/BossHunter**：本地浏览器连接、AI 评分、回复监测和定制材料，遇到验证码/频率限制/未知页面会停下；可借鉴连接健康检查和低频策略，但它是非商业 PolyForm 许可。
- **artbyjazi/simply-apply**：用结构化数据生成单页 PDF 与 ATS-safe DOCX，并在连接器失败时明确报错；适合借鉴“空结果不等于成功”和渲染回读校验，但其 AGPL-3.0 需要单独评估合规。

### 对 Career Copilot 的落地取舍

1. 将 `claim-map` 的阻塞态接到现有 `verified_evidence_only`，未确认的日期、指标、雇主和技能不能进入渲染队列。
2. 把岗位方向（AI/后端、AI 产品、运营、研究、法务/职能等）抽成可版本化的 profile/archetype 配置，分别维护关键词、评分权重和简历顺序。
3. 在 PDF/DOCX 生成后做“页数 + 文本可提取 + 关键字段回读”检查；失败时降级并明确提示，不把空文件或静态成功当成已完成。
4. 继续保持浏览器只填表、不自动提交；遇到验证码、登录墙、未知字段、法律声明或外部消息时暂停并记录原因。
5. 只复用许可证允许的概念和接口模式；不直接复制 AGPL/PolyForm 代码，也不引入未审查的反爬实现。

## 组成、使用过程与公开效果对照

| 项目 | 主要组成 | 实际使用路径 | 公开资料能证明的效果 |
|---|---|---|---|
| `StoneLL1/resume-builder` | `SKILL.md`、`INSTALL.md`、写作/编译参考、LaTeX 示例 | 选择模板 → 收集素材 → 确认目标 → 筛选经历 → 补问缺口 → 撰写 → XeLaTeX 编译 | 流程和防编造规则写得很完整；没有公开招聘转化率或独立 benchmark，不能把“近百篇经验帖蒸馏”理解为效果验证 |
| `sunyet-01/ai-job-search-cn` | `core/` 搜索、评估、PDF 渲染、投递清单；`knowledge/` 方法论 | 建画像 → 粘贴 JD → 评估匹配 → 生成中文 PDF → 生成投递行动清单 → 人工执行 | README 标注为命令行 v0.1，前端仍在开发；可验证的是流程存在，不是录用效果 |
| `shuheng-mo/career-ops-china` | `modes/` 方向配置、`portals.yml`、JD inbox 服务、浏览器 bookmarklet | 浏览器看到 JD → bookmarklet 捕获到本地 inbox → 跑 A–F 评估 → 生成定制材料 → 入库追踪 | 公开说明强调“过滤器”而非海投；国内 SPA/登录墙以用户侧捕获为主，未提供可外推的转化基准 |
| `riwonswain-ovo/OfferLoop` | 7 个 Agent Skill、3 张业务 Base、私有知识库、同步 workflow | 先 `dry-run` → 冲突检查 → 用户确认 → 安装/校验 → 增量同步岗位、投递和复盘 | 公开的是安装与验收条件；同步是否真正 ready 取决于真实资源读写，不应只看安装成功 |
| `shengjidaguai-china/BossHunter` | 本地面板、Chrome 连接、岗位采集、评分、回复监测、材料生成 | 启动本地面板 → 同一 Chrome 登录 → `connect` 检查 → 低频运行 → 人工确认发送 | 能证明连接/停止边界和风险提示；自动化可能触发平台限制，不能将“能跑”当成账号安全或录用保证 |
| `artbyjazi/simply-apply` | 连接器、结构化数据、无编造 guardrail、ReportLab PDF、ATS DOCX、测试 | 搜索 → 选岗位 → `tailor()` → 无编造检查 → 导出 PDF/DOCX → 打开申请链接 | README 给出 58 个测试和两个实时连接器的验证范围；这是软件回归证据，不是面试或录用率证明 |

### 当前系统的对应关系

- **组成**：Career Vault、岗位池/来源适配器、混合评分、4 个简历 persona、LangGraph 运行图、MCP、异步 queue、Scheduler、trace 和分析看板已经覆盖上述主模块。
- **使用**：当前入口是画像/证据 → 岗位导入 → 匹配与解释 → 生成岗位版草稿 → 审批/追踪；MCP 的副作用工具保持 `approval_required`。
- **效果口径**：本地 77 项 Node 测试、14 项 API 测试和构建成功只能证明机制通过；公开 Demo 的分数、静态 smoke 或第三方 README 不能替代真实岗位反馈。下一步应把每次真实投递的“岗位快照—简历版本—审核结果—回复状态”关联起来，再评估方向和模板是否改善。

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
- [StoneLL1/resume-builder](https://github.com/StoneLL1/resume-builder)
- [sunyet-01/ai-job-search-cn](https://github.com/sunyet-01/ai-job-search-cn)
- [shuheng-mo/career-ops-china](https://github.com/shuheng-mo/career-ops-china)
- [riwonswain-ovo/OfferLoop](https://github.com/riwonswain-ovo/OfferLoop)
- [shengjidaguai-china/BossHunter](https://github.com/shengjidaguai-china/BossHunter)
- [artbyjazi/simply-apply](https://github.com/artbyjazi/simply-apply)
