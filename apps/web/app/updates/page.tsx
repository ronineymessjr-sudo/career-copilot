import type { Metadata } from "next";
import { ReleaseNotesPage } from "@/components/release-notes-page";

export const metadata: Metadata = {
  title: "公开更新 | Career Copilot",
  description: "Career Copilot 的版本更新、可验证工作流和人工确认安全边界。",
  alternates: { canonical: "https://career-copilot-v2.photomagic.workers.dev/updates" },
  openGraph: {
    title: "公开更新 | Career Copilot",
    description: "每个岗位结论都有证据，每次提交都保留人工确认。",
    type: "website",
  },
};

export default function UpdatesPage() { return <ReleaseNotesPage/>; }
