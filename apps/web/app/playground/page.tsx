import type { Metadata } from "next";
import { AgentPlayground } from "@/components/agent-playground";

export const metadata: Metadata = {
  title: "Agent Playground | Career Copilot",
  description: "公开体验 Career Copilot 的 JD 分析、混合岗位评分、证据匹配和简历适配。",
};

export default function PlaygroundPage() { return <AgentPlayground/>; }
