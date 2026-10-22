# Open-source reference strategy

本项目没有直接复制商业网站代码或视觉资产。

- JobSync：参考岗位追踪、简历、任务、评分和自动化的产品边界；主项目保持独立实现。
- Resume Matcher：参考主简历 → JD 解析 → 技能差距 → 定制版本的工作流。
- ApplyPilot / AIHawk：仅研究自动化阶段和失败处理，不默认实现批量站内自动提交或验证码绕过。

## 2026-09 evaluation pass

本轮只复用可审计的方法，不复制第三方代码、文案或视觉资产：

- [Gsync/jobsync](https://github.com/Gsync/jobsync)（MIT）：参考岗位追踪、简历版本、应用分析、MCP 与“保存前确认”的产品边界；不引入其运行时依赖。
- [sunnypatell/ats-screener](https://github.com/sunnypatell/ats-screener)（MIT）：参考按不同 ATS 解析策略拆分评分，而不是输出一个无法解释的总分；本项目先落地为可解释的评测维度。
- [TechImmigrants/cv-builder](https://github.com/TechImmigrants/cv-builder)：参考角色专属、可解释的六维简历审校和 golden fixtures；许可证与仓库状态在引入代码前仍需单独复核，因此本项目只借鉴方法。
- [KirtiJha/langgraph-interrupt-workflow-template](https://github.com/KirtiJha/langgraph-interrupt-workflow-template)：参考离线 fixture、人工审批暂停、PII 泄漏检查和 CI 门禁；本项目新增 `agent-evaluation-matrix-v1` 离线矩阵。
- [vinimabreu/langgraph-production](https://github.com/vinimabreu/langgraph-production)：参考路由准确率、工具参数正确率、失败/恢复场景和可归档 JSON 报告；不把合成结果冒充线上模型质量。

本项目新增的矩阵只使用合成岗位和合成证据，覆盖 10 个岗位方向、证据引用、硬性毕业年份拦截和禁止自动投递门禁。它是回归测试，不是外部招聘成功率或模型质量声明。

## 2026-10 JD 分析与简历结构参考

- [Resume Matcher](https://github.com/lloydchang/srbhr-Resume-Matcher)：README 将流程拆为简历/JD 解析、关键词与主题提取、语义相似度；同一 README 也明确说明其 Web 结果目前是模拟数据。因此这里只借用分阶段拆解思路，不引入它的分数，也不把“相似度”包装成通过 ATS 或录用概率。
- [JSON Resume Schema](https://jsonresume.org/schema)：用结构化字段分别保存教育、经历、项目和技能。Career Copilot 的 JD 分析据此把“要求”与“项目证据”分开关联，保留每条证据来自哪个项目，而不是只输出一个关键词命中数。
- [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume)：参考结构化内容、模板呈现和多格式导出的产品流程；本轮只应用于 JD 要求到证据的可读映射，不复制代码、组件或视觉资产。

本轮落地：技能状态区分“已核验项目证据 / 画像自述 / 待核验材料 / 暂无材料”；实习届别、每周出勤、最短时长、办公方式和地点按文本与个人画像逐项输出“符合 / 不符合 / 待确认”。未知条件不计作匹配，也不会因为关键词命中而直接建议投递。

## 2026-10 简历版本结果复盘参考

- [NextGenCV](https://github.com/MustafaPinjari/NextGenCV)：README 把版本快照/差异、投递时的 ATS 记录、回访率分桶、拒信复盘和版本对照放进同一条求职闭环。我们借鉴“从已投出的版本追踪到真实结果”，不照搬其 ATS 评分或 A/B 测试实现。
- [CareerTrack](https://github.com/sivasankar55/CareerTrack)：README 明确强调每条申请记录实际使用的简历版本，并保存状态历史与提醒。我们据此优先复用现有 `application_packages.resume_version_id` 与申请状态，不另建平行追踪表。
- [Huntr Application Hub](https://help.huntr.co/en/articles/14367332-application-hub-and-packets) 与 [Teal Job Tracker 指南](https://help.tealhq.com/en/articles/14435727-how-to-track-your-job-applications)：官方流程都把岗位材料关联到具体岗位，并保留渠道、阶段与跟进信息。我们复用已有申请包和 `next_follow_up_at`，只新增到期跟进计数，不增加自动联系行为。
- [NIST/SEMATECH proportion confidence intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)：小样本的比例不宜只报一个点估计。版本复盘显示回复率时同时给出 Wilson 95% 二项比例区间；区间描述抽样不确定性，不等于招聘流程的随机试验结论。

本轮落地：分析页新增简历版本复盘，可按简历岗位方向与投递渠道筛选；按已确认投递作为分母，展示回复率与 Wilson 95% 区间、面试、Offer、待反馈和到期跟进；拒绝/暂停记录不会被误标成待反馈。仅有版本名称、没有版本 ID 的旧材料单独标识，不参与“当前较高版本”的观察提示；未关联版本的投递单独统计。分析页随中英文切换显示对应文案，个人数据不可读时显示“未加载”而不是 0。页面明确说明近期申请仍可能等待回复，且公司、岗位、时间与渠道等混杂因素仍存在，不把观察性差异宣称为简历造成的提升，也不将演示数据伪装成用户结果。

确认投递时保存简历版本 ID、名称、岗位方向与版本号快照；复盘优先使用该快照，避免后续修改申请包改变历史归属。旧记录没有快照时继续使用当前申请包关联。

在正式引入任何第三方代码前，必须：
1. 记录仓库、版本与许可证；
2. 保留版权声明；
3. 评估网络服务场景下的许可证义务；
4. 对商业产品只借鉴信息架构，不复制代码、文案、图标和 UI。
