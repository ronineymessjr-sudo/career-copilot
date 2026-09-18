import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Career Copilot｜完整求职工作台",
  description: "Career Copilot 完整求职工作台：岗位发现、简历版本、证据匹配、面试准备与投递管理。",
  alternates: { languages: { "zh-CN": "/dashboard", en: "/dashboard?lang=en" } },
  openGraph: {
    title: "Career Copilot｜完整求职工作台",
    description: "岗位发现、简历版本、证据匹配、面试准备与投递管理。",
    type: "website",
  },
};

export default function Home() { redirect("/dashboard"); }
