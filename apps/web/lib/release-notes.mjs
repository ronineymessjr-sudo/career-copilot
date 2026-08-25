export const PUBLIC_RELEASE_NOTES = Object.freeze([
  {
    version: "M08.2",
    title: "批量筛选与来源新鲜度",
    date: "2026-08",
    summary: "把薪资、风险词、公司年份、重复岗位和岗位发布时间纳入同一条可解释演练链路。",
    highlights: ["区间重叠与完全包含两种薪资匹配策略", "来源缺少发布时间或历史记录时明确标记待核验", "批量筛选只预览节奏，不执行点击、发送或投递"],
  },
  {
    version: "M08.1",
    title: "证据化投递工作台",
    date: "2026-08",
    summary: "把岗位筛选、项目证据、岗位定制简历和提交前复核串成一条可解释链路。",
    highlights: ["岗位评分拆分为规则、证据与历史反馈", "每条简历内容绑定已核验项目证据", "真实提交前保留人工确认门禁"],
  },
  {
    version: "M08",
    title: "可评测 Agent 流程",
    date: "2026-07",
    summary: "公开 Playground 展示 JD 分析、混合评分、简历 persona 和招呼语生成。",
    highlights: ["支持 AI Agent、AI 产品、AI 解决方案等方向", "输出缺口与风险，而不是只给一个分数", "演示模式不读取私有资料，也不自动发送"],
  },
  {
    version: "M07",
    title: "知识与面试准备",
    date: "2026-06",
    summary: "把项目知识、面试问题和技能缺口连接起来，复盘结果只生成建议，不自动改变投递状态。",
    highlights: ["可追溯项目证据", "结构化面试准备", "周度复盘与技能缺口队列"],
  },
]);

export const PUBLIC_WORKFLOW_STEPS = Object.freeze([
  { step: "01", title: "粘贴岗位", detail: "输入公开 JD 或岗位链接，系统先保留原始文本。" },
  { step: "02", title: "解释匹配", detail: "同时展示硬条件、技能证据、缺口和风险。" },
  { step: "03", title: "生成材料", detail: "选择岗位 persona，生成有证据引用的简历和申请文案。" },
  { step: "04", title: "人工复核", detail: "打开真实渠道前检查岗位、附件和文案，系统不会冒充已提交。" },
]);
