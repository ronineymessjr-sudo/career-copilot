import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: "*",
      allow: ["/", "/playground", "/updates"],
      disallow: ["/dashboard", "/agents", "/analytics", "/applications", "/career-vault", "/engineering", "/interviews", "/jobs", "/knowledge", "/login", "/resumes", "/settings", "/sources", "/api/"],
    }],
    sitemap: "https://career-copilot-v2.photomagic.workers.dev/sitemap.xml",
  };
}
