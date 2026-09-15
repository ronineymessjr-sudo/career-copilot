import type { Metadata } from "next";
import { AgentPlayground } from "@/components/agent-playground";

export const metadata: Metadata = {
  title: "Career Copilot｜公开体验",
  description: "无需登录体验岗位分析、匹配评分、风险缺口和简历方向建议。",
  alternates: { languages: { "zh-CN": "/", en: "/?lang=en" } },
  openGraph: {
    title: "Career Copilot｜公开体验",
    description: "无需登录体验岗位分析、匹配评分、风险缺口和简历方向建议。",
    type: "website",
  },
};

export default function Home() { return <AgentPlayground/>; }
