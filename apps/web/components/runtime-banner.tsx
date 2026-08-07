export function RuntimeBanner() {
  const mode: string = process.env.APP_MODE ?? "demo";
  return (
    <div style={{
      border: "1px solid rgba(124,92,255,.28)",
      background: "rgba(124,92,255,.08)",
      borderRadius: 12,
      padding: "10px 13px",
      marginBottom: 16,
      color: "#cfc7ff",
      fontSize: 11,
      lineHeight: 1.6,
    }}>
      {mode === "production"
        ? "Production data mode · Supabase enabled"
        : "Demo mode · 可公开预览，不包含真实简历、邮箱或投递记录"}
    </div>
  );
}
