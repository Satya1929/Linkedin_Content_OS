import { describe, expect, it } from "vitest";
import { buildNewsClusters, buildNewsDraftInput, parseFeed } from "./news";
import type { Draft, NewsSource, SourceItem } from "./types";

const source: NewsSource = {
  id: "test",
  name: "Test Feed",
  url: "https://example.com/feed.xml",
  category: "official"
};

describe("news mode", () => {
  it("parses RSS items into source items", () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>New AI agent workflow for developers</title>
            <link>https://example.com/agent</link>
            <description><![CDATA[Developers can evaluate agent tool calls more reliably.]]></description>
            <pubDate>Sun, 03 May 2026 10:00:00 GMT</pubDate>
          </item>
        </channel>
      </rss>
    `;

    const items = parseFeed(xml, source, "2026-05-03T10:00:00.000Z");

    expect(items).toHaveLength(1);
    expect(items[0].title).toContain("agent workflow");
    expect(items[0].url).toBe("https://example.com/agent");
    expect(items[0].publishedAt).toBe("2026-05-03T10:00:00.000Z");
  });

  it("ranks relevant AI builder clusters and marks repeated topics", () => {
    const item: SourceItem = {
      id: "news-1",
      title: "AI agent evaluation workflow for developers",
      summary: "A practical model evaluation workflow for agent tool calls.",
      url: "https://example.com/news",
      sourceType: "news",
      createdAt: "2026-05-03T10:00:00.000Z"
    };
    const pastDraft = {
      status: "approved",
      body: "Developers need AI agent evaluation workflow before automating tool calls."
    } as Draft;

    const clusters = buildNewsClusters([item], [pastDraft]);

    expect(clusters[0].score).toBeGreaterThan(30);
    expect(clusters[0].repeatedWithPastPost).toBe(true);
  });

  it("creates a raw draft input from a selected cluster", () => {
    const item: SourceItem = {
      id: "news-1",
      title: "Open model release for AI builders",
      summary: "A new local model improves prototyping workflows.",
      url: "https://example.com/model",
      sourceType: "news",
      createdAt: "2026-05-03T10:00:00.000Z"
    };
    const input = buildNewsDraftInput({
      id: "cluster-1",
      title: item.title,
      items: [item],
      score: 80,
      keywords: ["model", "builders"],
      angle: "Turn this into a practical prototyping lesson.",
      repeatedWithPastPost: false
    });

    expect(input.rawText).toContain("News angle");
    expect(input.sourceLinks).toEqual(["https://example.com/model"]);
    expect(input.sourceItems).toHaveLength(1);
  });
});
