import type { Metadata } from "next";
import { AgentPlayground } from "@/components/agent-playground";

export const metadata: Metadata = {
  title: "Career Copilot｜有证据、可评测的 AI 求职 Agent",
  description: "公开体验 Career Copilot：用 JD 分析、混合岗位评分、项目证据匹配和简历适配，把求职流程变成可解释、可复核的 AI 工作流。",
  keywords: ["AI Agent", "AI 求职", "实习岗位分析", "RAG", "MCP", "简历适配"],
  openGraph: {
    title: "Career Copilot｜有证据、可评测的 AI 求职 Agent",
    description: "公开体验岗位分析、证据匹配与简历适配；公开 Demo 不读取私人资料，也不会自动投递。",
    type: "website",
  },
};

export default function PlaygroundPage() { return <AgentPlayground/>; }
