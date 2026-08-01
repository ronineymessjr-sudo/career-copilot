import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Copilot | AI Career Intelligence Agent Platform",
  description: "基于 LangGraph、RAG、pgvector 与 MCP 的证据驱动 AI 求职智能体平台",
};

// Public Supabase values are supplied as Worker runtime variables. Keeping the
// layout dynamic prevents Next from baking an empty build-time value into the
// browser bundle when secrets are attached after deployment.
export const dynamic = "force-dynamic";

export default function RootLayout({children}:{children:React.ReactNode}) {
  const publicConfig = {
    supabaseUrl: process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "",
    supabasePublishableKey: process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ?? "",
  };
  return <html lang="zh-CN"><body><script dangerouslySetInnerHTML={{ __html: `globalThis.__CAREER_COPILOT_PUBLIC_CONFIG__=${JSON.stringify(publicConfig)};` }}/>{children}</body></html>;
}
