import type { MetadataRoute } from "next";

const siteUrl = "https://career-copilot-v2.photomagic.workers.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/playground`, changeFrequency: "weekly", priority: 0.7 },
  ];
}
