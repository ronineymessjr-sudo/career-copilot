import type { JobCardData } from "./types";

export const jobs: JobCardData[] = [
  {id:1,company:"摩湃得",title:"AI Agent Python 后端实习生",location:"远程",workplace:"Remote",salary:"200-300元/天",grade:"S",score:92,segment:"远程优先",companyTier:"0-20人 · 未融资",matchedSkills:["Python","FastAPI","LangGraph","Docker"],risk:"需确认是否接受2028届",status:"待审批",summary:"负责 Agent 后端、模型接口、工具调用与本地部署。",resumeVersion:"AI Agent研发版"},
  {id:2,company:"南京元数信息",title:"AI Agent 实习生",location:"南京 · 浦口区",workplace:"Onsite",salary:"240-340元/天",grade:"S",score:90,segment:"南京建邺/浦口",companyTier:"20-99人 · 创业团队",matchedSkills:["Python","TypeScript","Next.js","LangChain"],risk:"需确认教学与产品开发占比",status:"待核验",summary:"参与智能体产品开发、教学 Demo 与交互功能。",resumeVersion:"AI Agent研发版"},
  {id:3,company:"吾道智翼",title:"AI 产品经理实习生（Agent 应用）",location:"南京 · 建邺区",workplace:"Onsite",salary:"150-250元/天",grade:"A",score:84,segment:"南京建邺/浦口",companyTier:"0-20人 · 早期团队",matchedSkills:["Figma","PRD","Prompt","RAG"],risk:"需要准备产品指标和效果评测案例",status:"待审批",summary:"负责 Agent 场景调研、PRD、原型和效果验证。",resumeVersion:"AI产品版"},
  {id:4,company:"江苏金蝶软件",title:"企业软件与数字化实施实习生",location:"南通 · 崇川区",workplace:"Onsite",salary:"未公开",grade:"A",score:79,segment:"南通崇川",companyTier:"100-999人 · 成熟软件公司",matchedSkills:["SQL","需求分析","产品流程"],risk:"本地过渡岗，需确认AI项目参与度",status:"新线索",summary:"参与企业信息化需求分析、ERP实施和产品跟进。",resumeVersion:"本地过渡版"},
  {id:5,company:"粉跃 LEAP",title:"全栈 Agent 开发实习生",location:"上海 · 徐汇区",workplace:"Onsite",salary:"150-200元/天",grade:"A",score:86,segment:"上海/苏州/杭州",companyTier:"20-99人 · 未融资",matchedSkills:["Next.js","TypeScript","React","Agent"],risk:"需确认代码评审和导师机制",status:"待核验",summary:"开发 AIGC 与 Agent 产品，完成前后端联调。",resumeVersion:"AI Agent研发版"},
  {id:6,company:"杭州灵峰智能科技",title:"AI Native 工具与 AI Coding 实习生",location:"杭州 · 萧山区",workplace:"Onsite",salary:"300-500元/天",grade:"S",score:91,segment:"上海/苏州/杭州",companyTier:"0-20人 · 创业团队",matchedSkills:["TypeScript","Next.js","Prompt","产品原型"],risk:"需要用数据证明效率提升",status:"待审批",summary:"开发内部工具、营销自动化工作流和AI原型。",resumeVersion:"AI Agent研发版"}
];

export const metrics = [
  {label:"今日新增",value:"18",delta:"+6 vs 昨日"},
  {label:"高匹配",value:"7",delta:"S/A 级"},
  {label:"待审批",value:"5",delta:"需要你确认"},
  {label:"已投递",value:"12",delta:"本周累计"},
];

export const engineeringMetrics = [
  {label:"模型服务",value:"Healthy",detail:"Mock 默认 · 可切 Ollama / vLLM"},
  {label:"接口层",value:"3",detail:"health · generate · metrics"},
  {label:"测试通过率",value:"100%",detail:"后端工程测试"},
  {label:"人工修改占比",value:"25.7%",detail:"示例记录，生产由 Git/CI 采集"},
];

export const deliveryRuns = [
  {id:1,project:"Career Copilot V2",task:"模型网关与工程证据模块",tool:"ChatGPT coding workflow",duration:"2h 00m",filesChanged:14,tests:"6 / 6",acceptance:"6 / 6",humanEditShare:"25.7%",status:"已验证" as const},
  {id:2,project:"Career Copilot V2",task:"审批优先投递闭环",tool:"Codex review workflow",duration:"1h 20m",filesChanged:8,tests:"4 / 4",acceptance:"5 / 5",humanEditShare:"31.4%",status:"已验证" as const},
  {id:3,project:"PhotoAtelier",task:"AI 内容工作流设计",tool:"Manual + AI pair",duration:"—",filesChanged:0,tests:"待采集",acceptance:"待定义",humanEditShare:"—",status:"待复盘" as const},
];

export const modelRuntime = {
  provider:"mock",
  model:"qwen2.5:3b",
  endpoint:"local://mock",
  successRate:"100%",
  averageLatency:"0 ms",
  externalRequest:false,
};
