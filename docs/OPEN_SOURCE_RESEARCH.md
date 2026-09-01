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

在正式引入任何第三方代码前，必须：
1. 记录仓库、版本与许可证；
2. 保留版权声明；
3. 评估网络服务场景下的许可证义务；
4. 对商业产品只借鉴信息架构，不复制代码、文案、图标和 UI。
