export function RuntimeBanner() {
  const mode: string = process.env.APP_MODE ?? "demo";
  return <div className="runtime-banner">
      {mode === "production"
        ? "Production data mode · Supabase enabled"
        : "Demo mode · 可公开预览，不包含真实简历、邮箱或投递记录"}
    </div>;
}
