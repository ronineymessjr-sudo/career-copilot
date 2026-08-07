"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import {
  MessageSquare, Send, Bug, Lightbulb, Heart, Sparkles,
  AlertCircle, CheckCircle, ArrowLeft, Clock, ExternalLink,
  Github, Loader2, RefreshCw, Smile, Frown, Meh, Filter,
} from "lucide-react";
import Link from "next/link";
import { controlFetch } from "@/lib/control-client";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type FeedbackType = "bug" | "feature" | "general" | "praise" | "ux";

interface FeedbackTypeOption {
  value: FeedbackType;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  color: string;
}

interface FeedbackEntry {
  id: string;
  type: string;
  title: string;
  content: string;
  source: string;
  created_at: string;
  resolved: boolean;
  page_url?: string;
}

const FEEDBACK_TYPES: FeedbackTypeOption[] = [
  { value: "bug", label: "Bug 报告", icon: <Bug size={18} />, placeholder: "描述你遇到的 bug：操作步骤、期望结果、实际结果…", color: "#ef4444" },
  { value: "feature", label: "功能建议", icon: <Lightbulb size={18} />, placeholder: "你想要什么新功能？描述使用场景和预期行为…", color: "#8b5cf6" },
  { value: "ux", label: "体验问题", icon: <AlertCircle size={18} />, placeholder: "哪里用起来不顺手？卡在哪个步骤了？…", color: "#f59e0b" },
  { value: "praise", label: "好评鼓励", icon: <Heart size={18} />, placeholder: "什么功能帮到了你？分享你的使用体验！", color: "#ec4899" },
  { value: "general", label: "其他反馈", icon: <MessageSquare size={18} />, placeholder: "任何想跟我们说的…", color: "#6b7280" },
];

const typeLabelMap: Record<string, string> = {
  bug: "Bug 报告", feature: "功能建议", ux: "体验问题",
  praise: "好评鼓励", general: "其他反馈",
};

const typeIconMap: Record<string, React.ReactNode> = {
  bug: <Bug size={14} />, feature: <Lightbulb size={14} />,
  ux: <AlertCircle size={14} />, praise: <Heart size={14} />,
  general: <MessageSquare size={14} />,
};

export default function FeedbackPage() {
  const [tab, setTab] = useState<"submit" | "history">("submit");

  // Form state
  const [type, setType] = useState<FeedbackType>("general");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // History state
  const [feedbackList, setFeedbackList] = useState<FeedbackEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyFilter, setHistoryFilter] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setIsLoggedIn(true);
        setUserEmail(data.user.email ?? "");
        setEmail(data.user.email ?? "");
      }
    });
  }, []);

  const activeType = FEEDBACK_TYPES.find((t) => t.value === type) || FEEDBACK_TYPES[4];

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;

      setStatus("sending");
      setErrorMsg("");

      try {
        await controlFetch("/api/control/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            content: content.trim(),
            email: email.trim() || undefined,
            source: "web-page",
            page_url: typeof window !== "undefined" ? window.location.href : undefined,
          }),
        });
        setStatus("success");
        setTimeout(() => {
          setStatus("idle");
          setContent("");
          setType("general");
          // Switch to history after successful submit
          loadHistory();
          setTab("history");
        }, 1500);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "发送失败，请稍后再试");
      }
    },
    [content, email, type]
  );

  const loadHistory = useCallback(async () => {
    if (!isLoggedIn) {
      setHistoryError("需要登录后查看反馈历史");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (historyFilter) params.set("type", historyFilter);
      const data = await controlFetch<{ ok: boolean; data?: FeedbackEntry[]; error?: string }>(
        `/api/control/feedback?${params.toString()}`
      );
      if (data.ok && Array.isArray(data.data)) {
        setFeedbackList(data.data);
      } else {
        setHistoryError(data.error || "获取反馈历史失败");
      }
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setHistoryLoading(false);
    }
  }, [isLoggedIn, historyFilter]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  return (
    <div className="feedback-page">
      {/* Header */}
      <div className="feedback-page__header">
        <Link href="/" className="feedback-page__back">
          <ArrowLeft size={18} />
          <span>返回工作台</span>
        </Link>
        <h1>
          <Sparkles size={22} />
          Career Copilot 反馈中心
        </h1>
        <p>你的每一条反馈都会帮助我们改进产品。无论是 Bug、建议还是好评，我们都认真对待。</p>
      </div>

      {/* Tabs */}
      <div className="feedback-page__tabs">
        <button
          className={`feedback-page__tab ${tab === "submit" ? "active" : ""}`}
          onClick={() => setTab("submit")}
        >
          <Send size={15} />
          发送反馈
        </button>
        <button
          className={`feedback-page__tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          <Clock size={15} />
          我的反馈
        </button>
      </div>

      {/* Submit Tab */}
      {tab === "submit" && (
        <div className="feedback-page__body">
          {status === "success" ? (
            <div className="feedback-page__success">
              <CheckCircle size={56} />
              <h2>感谢你的反馈！</h2>
              <p>我们会认真处理每一条建议。优质反馈将同步到 GitHub Issues 进行跟踪。</p>
              <button onClick={() => { setStatus("idle"); setContent(""); setType("general"); }}>
                再写一条
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-page__form">
              {/* Type selector */}
              <div className="feedback-page__types">
                {FEEDBACK_TYPES.map((t) => (
                  <label
                    key={t.value}
                    className={`feedback-page__type-card ${type === t.value ? "active" : ""}`}
                    style={type === t.value ? { borderColor: t.color, background: `${t.color}10` } : {}}
                  >
                    <input
                      type="radio"
                      name="feedbackType"
                      value={t.value}
                      checked={type === t.value}
                      onChange={() => setType(t.value)}
                    />
                    <span className="feedback-page__type-icon" style={{ color: t.color }}>
                      {t.icon}
                    </span>
                    <span className="feedback-page__type-label">{t.label}</span>
                  </label>
                ))}
              </div>

              {/* Content */}
              <div className="feedback-page__field">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={activeType.placeholder}
                  rows={6}
                  maxLength={2000}
                  required
                  autoFocus
                />
                <span className="feedback-page__char-count">
                  {content.length}/2000
                </span>
              </div>

              {/* Email */}
              <div className="feedback-page__field">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="留下邮箱，方便我们回复（选填）"
                  className="feedback-page__email-input"
                />
              </div>

              {/* Appendix: screenshots placeholder */}
              <div className="feedback-page__appendix">
                <p>
                  💡 如果是 Bug 报告，可以附上截图链接、浏览器信息和控制台错误信息，帮助我们更快定位问题。
                </p>
              </div>

              {/* Submit */}
              <div className="feedback-page__actions">
                {status === "error" && (
                  <div className="feedback-page__error">
                    <AlertCircle size={14} />
                    {errorMsg}
                  </div>
                )}
                <button
                  type="submit"
                  className="feedback-page__submit"
                  disabled={!content.trim() || status === "sending"}
                >
                  {status === "sending" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      发送中…
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      发送反馈
                    </>
                  )}
                </button>
              </div>

              <div className="feedback-page__links">
                <a
                  href="https://github.com/ronineymessjr-sudo/public-apis-resource/issues/new/choose"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="feedback-page__link-btn"
                >
                  <Github size={15} />
                  通过 GitHub Issues 提交
                  <ExternalLink size={12} />
                </a>
                <a
                  href="https://github.com/ronineymessjr-sudo/public-apis-resource"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="feedback-page__link-btn"
                >
                  <Heart size={15} />
                  给项目一个 Star ⭐
                </a>
              </div>
            </form>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div className="feedback-page__body">
          {!isLoggedIn ? (
            <div className="feedback-page__login-hint">
              <MessageSquare size={48} />
              <h3>查看反馈历史需要登录</h3>
              <p>登录后可以看到你提交过的所有反馈记录。</p>
              <Link href="/login" className="feedback-page__login-btn">去登录</Link>
            </div>
          ) : (
            <>
              {/* Filter */}
              <div className="feedback-page__filter-bar">
                <div className="feedback-page__filter-btns">
                  {["", "bug", "feature", "ux", "praise", "general"].map((f) => (
                    <button
                      key={f}
                      className={`feedback-page__filter-btn ${historyFilter === f ? "active" : ""}`}
                      onClick={() => setHistoryFilter(f)}
                    >
                      {f ? typeLabelMap[f] || f : "全部"}
                    </button>
                  ))}
                </div>
                <button
                  className="feedback-page__refresh-btn"
                  onClick={loadHistory}
                  disabled={historyLoading}
                >
                  <RefreshCw size={14} className={historyLoading ? "animate-spin" : ""} />
                  刷新
                </button>
              </div>

              {/* List */}
              {historyLoading ? (
                <div className="feedback-page__loading">
                  <Loader2 size={32} className="animate-spin" />
                  <p>加载中…</p>
                </div>
              ) : historyError ? (
                <div className="feedback-page__error-box">
                  <Frown size={18} />
                  {historyError}
                </div>
              ) : feedbackList.length === 0 ? (
                <div className="feedback-page__empty">
                  <Meh size={48} />
                  <h3>还没有反馈记录</h3>
                  <p>切换到"发送反馈"标签，给我们留下第一条反馈吧！</p>
                </div>
              ) : (
                <div className="feedback-page__list">
                  {feedbackList.map((item) => (
                    <div key={item.id} className={`feedback-page__item ${item.resolved ? "resolved" : ""}`}>
                      <div className="feedback-page__item-header">
                        <span
                          className="feedback-page__item-type"
                          style={{ color: FEEDBACK_TYPES.find((t) => t.value === item.type)?.color || "#6b7280" }}
                        >
                          {typeIconMap[item.type]}
                          {typeLabelMap[item.type] || item.type}
                        </span>
                        {item.resolved && (
                          <span className="feedback-page__item-resolved">
                            <CheckCircle size={12} />
                            已处理
                          </span>
                        )}
                        <span className="feedback-page__item-time">
                          {new Date(item.created_at).toLocaleString("zh-CN")}
                        </span>
                      </div>
                      {item.title && <h4 className="feedback-page__item-title">{item.title}</h4>}
                      <p className="feedback-page__item-content">{item.content}</p>
                      <div className="feedback-page__item-meta">
                        <span>来源: {item.source || "web"}</span>
                        {item.page_url && (
                          <a href={item.page_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={10} /> 页面
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
