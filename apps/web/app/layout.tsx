import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Copilot V2",
  description: "面向中国在校生的证据驱动 AI 求职操作系统",
};

export default function RootLayout({children}:{children:React.ReactNode}) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
