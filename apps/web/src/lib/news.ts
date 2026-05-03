import type { Draft, NewsCluster, NewsDigest, NewsSource, SourceItem } from "./types";
import { compactText, fingerprint, keywordSummary, normalizeText, tokenize } from "./text";

export const starterNewsSources: NewsSource[] = [
  {
    id: "openai",
    name: "OpenAI News",
    url: "https://openai.com/news/rss.xml",
    category: "official"
  },
  {
    id: "deepmind",
    name: "Google DeepMind Blog",
    url: "https://deepmind.google/discover/blog/rss.xml",
    category: "official"
  },
  {
    id: "hugging-face",
    name: "Hugging Face Blog",
    url: "https://huggingface.co/blog/feed.xml",
    category: "official"
  },
  {
    id: "nvidia-ai",
    name: "NVIDIA AI Developer Blog",
    url: "https://developer.nvidia.com/blog/category/artificial-intelligence/feed/",
    category: "official"
  },
  {
    id: "hn-ai",
    name: "Hacker News AI",
    url: "https://hnrss.org/newest?q=AI",
    category: "developer-community"
  },
  {
    id: "arxiv-ai",
    name: "arXiv AI",
    url: "https://export.arxiv.org/rss/cs.AI",
    category: "research"
  },
  {
    id: "arxiv-lg",
    name: "arXiv Machine Learning",
    url: "https://export.arxiv.org/rss/cs.LG",
    category: "research"
  }
];

export function createNewsPlaceholder(): SourceItem[] {
  return starterNewsSources.map((source) => ({
    id: crypto.randomUUID(),
    url: source.url,
    title: `Configured source: ${source.name}`,
    summary: "News fetching is staged for Phase 5. This source is registered as an approved future input.",
    sourceType: "news",
    createdAt: new Date().toISOString()
  }));
}

function decodeHtml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagValue(entry: string, tagNames: string[]) {
  for (const tagName of tagNames) {
    const match = entry.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }
  return undefined;
}

function linkValue(entry: string) {
  const linkTag = entry.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)?.[1];
  if (linkTag) {
    return decodeHtml(linkTag);
  }

  const href = entry.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)?.[1];
  return href ? decodeHtml(href) : undefined;
}

function safeDate(value?: string) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function entryBlocks(xml: string) {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  if (itemMatches.length > 0) {
    return itemMatches;
  }
  return [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
}

export function parseFeed(xml: string, source: NewsSource, now = new Date().toISOString()): SourceItem[] {
  return entryBlocks(xml)
    .slice(0, 12)
    .map((entry) => {
      const title = tagValue(entry, ["title"]) || "Untitled news item";
      const summary = tagValue(entry, ["description", "summary", "content:encoded", "content"]);
      const url = linkValue(entry);
      const publishedAt = safeDate(tagValue(entry, ["pubDate", "published", "updated", "dc:date"]));

      return {
        id: crypto.randomUUID(),
        url,
        title,
        summary: summary ? compactText(summary, 360) : undefined,
        sourceType: "news" as const,
        publishedAt,
        rawText: `${source.name}: ${title}${summary ? `\n${summary}` : ""}`,
        createdAt: now
      };
    })
    .filter((item) => item.title !== "Untitled news item" || item.summary || item.url);
}

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "LinkedInContentEngine/0.2 local news reader"
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNewsSources(sources: NewsSource[] = starterNewsSources) {
  const fetchedAt = new Date().toISOString();
  const failedSources: NewsDigest["failedSources"] = [];
  const itemGroups = await Promise.all(
    sources.map(async (source) => {
      try {
        const response = await fetchWithTimeout(source.url);
        if (!response.ok) {
          failedSources.push({
            sourceId: source.id,
            name: source.name,
            reason: `HTTP ${response.status}`
          });
          return [];
        }
        return parseFeed(await response.text(), source, fetchedAt);
      } catch (error) {
        failedSources.push({
          sourceId: source.id,
          name: source.name,
          reason: error instanceof Error ? error.message : "Fetch failed"
        });
        return [];
      }
    })
  );

  return {
    fetchedAt,
    sources,
    items: itemGroups.flat(),
    failedSources
  };
}

const relevanceTerms = [
  "ai",
  "agent",
  "agents",
  "llm",
  "model",
  "models",
  "developer",
  "developers",
  "open source",
  "prompt",
  "eval",
  "evaluation",
  "inference",
  "robotics",
  "research",
  "tool",
  "workflow",
  "github",
  "coding",
  "multimodal"
];

function relevanceScore(item: SourceItem) {
  const text = normalizeText(`${item.title} ${item.summary ?? ""}`);
  let score = 20;
  for (const term of relevanceTerms) {
    if (text.includes(term)) {
      score += 8;
    }
  }
  if (item.url?.includes("arxiv")) score += 8;
  if (item.url?.includes("github")) score += 8;
  if (item.publishedAt) {
    const ageMs = Date.now() - new Date(item.publishedAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays <= 3) score += 18;
    else if (ageDays <= 10) score += 8;
  }
  return Math.min(score, 100);
}

function repeatedWithPastPost(item: SourceItem, pastDrafts: Draft[]) {
  const itemTokens = new Set(tokenize(`${item.title} ${item.summary ?? ""}`));
  if (itemTokens.size === 0) {
    return false;
  }

  return pastDrafts
    .filter((draft) => ["approved", "scheduled", "posted", "measured"].includes(draft.status))
    .some((draft) => {
      const draftTokens = new Set(tokenize(draft.body));
      const overlap = [...itemTokens].filter((token) => draftTokens.has(token)).length;
      return overlap / Math.max(itemTokens.size, 1) >= 0.5;
    });
}

function angleForCluster(items: SourceItem[], keywords: string[]) {
  const primary = items[0];
  const topic = keywords.slice(0, 3).join(", ") || "AI builder workflow";

  if (normalizeText(`${primary.title} ${primary.summary ?? ""}`).includes("agent")) {
    return "Explain what this changes about building reliable agent workflows, not just what was announced.";
  }

  if (primary.url?.includes("arxiv")) {
    return "Turn the paper into one practical evaluation or prototyping lesson for AI builders.";
  }

  return `Turn ${topic} into a practical career signal: what should developers test, automate, or learn next?`;
}

export function buildNewsClusters(items: SourceItem[], pastDrafts: Draft[] = []): NewsCluster[] {
  const groups = new Map<string, SourceItem[]>();

  for (const item of items) {
    const key = fingerprint(`${item.title} ${item.summary ?? ""}`, 5) || normalizeText(item.title).slice(0, 48);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const ranked = group.sort((a, b) => relevanceScore(b) - relevanceScore(a));
      const keywords = keywordSummary(ranked.map((item) => `${item.title} ${item.summary ?? ""}`).join(" "), 8);
      const repeated = ranked.some((item) => repeatedWithPastPost(item, pastDrafts));
      const score = Math.round(
        ranked.reduce((sum, item) => sum + relevanceScore(item), 0) / Math.max(ranked.length, 1) + Math.min(ranked.length - 1, 3) * 5 - (repeated ? 35 : 0)
      );

      return {
        id: key,
        title: ranked[0].title,
        items: ranked,
        score: Math.max(0, Math.min(100, score)),
        keywords,
        angle: angleForCluster(ranked, keywords),
        repeatedWithPastPost: repeated
      };
    })
    .filter((cluster) => cluster.score >= 35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

export async function buildNewsDigest(pastDrafts: Draft[] = []): Promise<NewsDigest> {
  const fetched = await fetchNewsSources();
  const clusters = buildNewsClusters(fetched.items, pastDrafts);
  return {
    ...fetched,
    clusters
  };
}

export function buildNewsDraftInput(cluster: NewsCluster) {
  const rawText = [
    `News angle: ${cluster.angle}`,
    "",
    `Primary source: ${cluster.title}`,
    ...cluster.items.slice(0, 3).map((item) => `- ${item.title}${item.summary ? `: ${item.summary}` : ""}${item.url ? ` (${item.url})` : ""}`)
  ].join("\n");

  return {
    rawText,
    sourceLinks: cluster.items.map((item) => item.url).filter((url): url is string => Boolean(url)),
    sourceItems: cluster.items
  };
}
