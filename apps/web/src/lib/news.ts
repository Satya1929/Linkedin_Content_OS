import type { SourceItem } from "./types";

export const starterNewsSources = [
  "https://openai.com/news/rss.xml",
  "https://deepmind.google/discover/blog/rss.xml",
  "https://huggingface.co/blog/feed.xml",
  "https://developer.nvidia.com/blog/category/artificial-intelligence/feed/",
  "https://hnrss.org/newest?q=AI"
];

export function createNewsPlaceholder(): SourceItem[] {
  return starterNewsSources.map((url) => ({
    id: crypto.randomUUID(),
    url,
    title: `Configured source: ${url}`,
    summary: "News fetching is staged for Phase 5. This source is registered as an approved future input.",
    sourceType: "news",
    createdAt: new Date().toISOString()
  }));
}
