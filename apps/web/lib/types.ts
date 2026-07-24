export type Grade = "S" | "A" | "B" | "C";
export type Segment = "远程优先" | "南通崇川" | "南京建邺/浦口" | "上海/苏州/杭州" | "中厂补充" | "大厂冲刺";

export interface JobCardData {
  id: number;
  company: string;
  title: string;
  location: string;
  workplace: string;
  salary: string;
  grade: Grade;
  score: number;
  segment: Segment;
  companyTier: string;
  matchedSkills: string[];
  risk: string;
  status: "新线索" | "待核验" | "待审批" | "已准备" | "已投递";
  summary: string;
  resumeVersion: string;
}

export interface EngineeringMetric {
  label: string;
  value: string;
  detail: string;
}

export interface DeliveryRunData {
  id: number;
  project: string;
  task: string;
  tool: string;
  duration: string;
  filesChanged: number;
  tests: string;
  acceptance: string;
  humanEditShare: string;
  status: "已验证" | "待复盘";
}
