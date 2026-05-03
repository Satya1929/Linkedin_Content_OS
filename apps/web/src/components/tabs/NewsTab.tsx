"use client";

import { useState } from "react";
import { Newspaper, Sparkles } from "lucide-react";
import type { NewsCluster, NewsDigest, StoreSnapshot } from "@/lib/types";
import { apiCall } from "../Dashboard";

type Props = {
  snapshot: StoreSnapshot;
  run: (label: string, action: () => Promise<StoreSnapshot>) => Promise<void>;
  busy: string;
};

export function NewsTab({ run, busy }: Props) {
  const [newsDigest, setNewsDigest] = useState<NewsDigest | null>(null);
  const [fetching, setFetching] = useState(false);
  const [newsError, setNewsError] = useState("");

  async function fetchNews() {
    setFetching(true); setNewsError("");
    try { setNewsDigest(await apiCall<NewsDigest>("/api/news/digest")); }
    catch (e) { setNewsError(e instanceof Error ? e.message : "Failed to fetch news."); }
    finally { setFetching(false); }
  }

  async function draftFromCluster(cluster: NewsCluster) {
    await run("Generating news draft", () =>
      apiCall("/api/drafts/from-news", { method: "POST", body: { cluster, format: "text" } })
    );
  }

  return (
    <div>
      <p className="section-title">News Mode</p>
      <p className="section-subtitle">Fetch the latest AI news from trusted sources and generate thesis-led posts.</p>

      <button className="btn btn-primary" onClick={fetchNews} disabled={fetching || Boolean(busy)}>
        <Newspaper size={15} /> {fetching ? "Fetching..." : "Fetch AI News"}
      </button>

      {newsError && <div className="alert error" style={{ marginTop: 16 }}>⚠ {newsError}</div>}

      {newsDigest && (
        <div style={{ marginTop: 20 }}>
          <p className="text-muted" style={{ marginBottom: 12 }}>
            {newsDigest.clusters.length} ranked clusters from {newsDigest.items.length} source items
            {newsDigest.failedSources.length > 0 && <span className="pill warn" style={{ marginLeft: 8 }}>{newsDigest.failedSources.length} sources failed</span>}
          </p>
          {newsDigest.clusters.map((cluster) => (
            <div key={cluster.id} className="news-cluster">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div className="news-cluster-title">{cluster.title}</div>
                  <div className="news-cluster-meta">Score {cluster.score} · {cluster.items.length} item{cluster.items.length !== 1 ? "s" : ""}</div>
                </div>
                {cluster.repeatedWithPastPost && <span className="repeat-flag">⚠ Possible repeat</span>}
              </div>
              <div className="news-cluster-angle">{cluster.angle}</div>
              <div className="btn-row tight">
                <button className="btn" onClick={() => draftFromCluster(cluster)} disabled={Boolean(busy)}>
                  <Sparkles size={13} /> Draft from this cluster
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!newsDigest && !fetching && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <Newspaper size={40} />
          <p>Click &quot;Fetch AI News&quot; to pull the latest stories from OpenAI, DeepMind, Anthropic, arXiv, HackerNews, and more.</p>
        </div>
      )}
    </div>
  );
}
