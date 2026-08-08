"use client";

import { useState, useCallback, type FormEvent } from "react";
import { MessageSquare, X, Send, Bug, Lightbulb, Heart, Sparkles, AlertCircle, CheckCircle } from "lucide-react";
import { controlFetch } from "@/lib/control-client";

type FeedbackType = "bug" | "feature" | "general" | "praise" | "ux";

interface FeedbackTypeOption {
  value: FeedbackType;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
}

const FEEDBACK_TYPES: FeedbackTypeOption[] = [
  { value: "bug", label: "Bug 报告", icon: <Bug size={14} />, placeholder: "描述你遇到的 bug：操作步骤、期望结果、实际结果…" },
  { value: "feature", label: "功能建议", icon: <Lightbulb size={14} />, placeholder: "你想要什么新功能？描述使用场景…" },
  { value: "ux", label: "体验问题", icon: <AlertCircle size={14} />, placeholder: "哪里用起来不顺手？卡在哪个步骤了？" },
  { value: "praise", label: "好评鼓励", icon: <Heart size={14} />, placeholder: "什么功能帮到了你？分享你的使用体验！" },
  { value: "general", label: "其他反馈", icon: <MessageSquare size={14} />, placeholder: "任何想跟我们说的…" },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("general");
  const [content, setContent] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

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
            source: "web",
            page_url: typeof window !== "undefined" ? window.location.href : undefined,
          }),
        });
        setStatus("success");
        setTimeout(() => {
          setOpen(false);
          setStatus("idle");
          setContent("");
          setEmail("");
          setType("general");
        }, 2000);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "发送失败，请稍后再试");
      }
    },
    [content, email, type]
  );

  const handleOpen = useCallback(() => {
    setOpen(true);
    setStatus("idle");
    setErrorMsg("");
  }, []);

  return (
    <>
      {/* Floating trigger button */}
      <button
        className={`feedback-fab ${open ? "feedback-fab--active" : ""}`}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label="反馈"
        title="反馈"
      >
        {open ? <X size={20} /> : <MessageSquare size={20} />}
        {!open && <span className="feedback-fab__label">反馈</span>}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="feedback-overlay" onClick={() => setOpen(false)}>
          <div className="feedback-panel" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="feedback-panel__header">
              <h3>
                <Sparkles size={16} />
                反馈
              </h3>
              <button onClick={() => setOpen(false)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>

            {status === "success" ? (
              <div className="feedback-panel__success">
                <CheckCircle size={48} />
                <p>感谢你的反馈！</p>
                <span>我们会认真处理每一条建议。</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="feedback-form">
                {/* Type selector */}
                <div className="feedback-form__types">
                  {FEEDBACK_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={`feedback-type-btn ${type === t.value ? "feedback-type-btn--active" : ""}`}
                      onClick={() => setType(t.value)}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* Content */}
                <textarea
                  className="feedback-form__textarea"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={activeType.placeholder}
                  rows={4}
                  maxLength={2000}
                  required
                />
                <div className="feedback-form__char-count">
                  {content.length}/2000
                </div>

                {/* Email (optional) */}
                <input
                  className="feedback-form__email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="留下邮箱，方便我们回复（选填）"
                />

                {/* Submit */}
                <div className="feedback-form__actions">
                  {status === "error" && <span className="feedback-form__error">{errorMsg}</span>}
                  <button
                    type="submit"
                    className="feedback-form__submit"
                    disabled={!content.trim() || status === "sending"}
                  >
                    {status === "sending" ? (
                      <>发送中…</>
                    ) : (
                      <>
                        <Send size={14} />
                        发送反馈
                      </>
                    )}
                  </button>
                </div>

                <p className="feedback-form__footer">
                  反馈将发送到我们的 Supabase 数据库，也可能同步到{" "}
                  <a
                    href="https://github.com/ronineymessjr-sudo/career-copilot/issues/new/choose"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub Issues
                  </a>
                  。
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
