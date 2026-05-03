import type { SourceItem } from "./types";
import { compactText, extractUrls } from "./text";

function getMeta(content: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return content.match(regex)?.[1]?.trim();
}

function getTitle(content: string) {
  return content.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
}

export async function fetchSourceItem(url: string): Promise<SourceItem> {
  const now = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "LinkedInContentEngine/0.1 local research assistant"
      }
    });
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    const title = getMeta(text, "og:title") ?? getTitle(text) ?? url;
    const summary = getMeta(text, "og:description") ?? getMeta(text, "description") ?? compactText(text.replace(/<[^>]+>/g, " "), 260);

    return {
      id: crypto.randomUUID(),
      url,
      title,
      summary,
      sourceType: "article-link",
      rawText: contentType.includes("text") ? compactText(text.replace(/<[^>]+>/g, " "), 1800) : undefined,
      createdAt: now
    };
  } catch {
    return {
      id: crypto.randomUUID(),
      url,
      title: url,
      summary: "The link could not be fetched locally, but it is kept as a cited source for the draft.",
      sourceType: "article-link",
      createdAt: now
    };
  }
}

export async function buildSourceItems(rawText: string, explicitLinks: string[] = []) {
  const urls = Array.from(new Set([...extractUrls(rawText), ...explicitLinks].filter(Boolean)));
  const fetched = await Promise.all(urls.map((url) => fetchSourceItem(url)));
  const contextSource: SourceItem = {
    id: crypto.randomUUID(),
    title: "Raw context input",
    summary: compactText(rawText, 280),
    sourceType: "raw-context",
    rawText,
    createdAt: new Date().toISOString()
  };

  return rawText.trim() ? [contextSource, ...fetched] : fetched;
}
