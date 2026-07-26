import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Copilot | AI Career Intelligence Agent Platform",
  description: "基于 LangGraph、RAG、pgvector 与 MCP 的证据驱动 AI 求职智能体平台",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
