"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, Radar, Target } from "lucide-react";
import { AnalyticsWorkspace } from "@/components/analytics-workspace";
export function OperationsDashboard(){ return <div className="operations-home"><AnalyticsWorkspace compact/><div className="home-action-grid"><Link href="/sources"><Radar size={18}/><div><strong>运行岗位发现</strong><span>检查公开 ATS 来源与最近任务</span></div><ArrowUpRight size={15}/></Link><Link href="/interviews"><CalendarClock size={18}/><div><strong>准备下一场面试</strong><span>生成问题、证据故事和演练清单</span></div><ArrowUpRight size={15}/></Link><Link href="/career-vault"><Target size={18}/><div><strong>修复技能缺口</strong><span>把新证据核验后加入 Career Vault</span></div><ArrowUpRight size={15}/></Link></div></div>; }
