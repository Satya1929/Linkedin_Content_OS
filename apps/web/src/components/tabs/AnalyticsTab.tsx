"use client";

import { useState } from "react";
import { BarChart3, RefreshCw, Check, ThumbsDown } from "lucide-react";
import type { PerformanceInsight, StoreSnapshot } from "@/lib/types";
import { apiCall } from "../Dashboard";

type Props = {
  snapshot: StoreSnapshot;
  run: (label: string, action: () => Promise<StoreSnapshot>) => Promise<void>;
  busy: string;
  isLinkedInConnected: boolean;
};

export function AnalyticsTab({ snapshot, run, busy, isLinkedInConnected }: Props) {
  const [csv, setCsv] = useState("draft_id,impressions,likes,comments,reposts,profile_views\n");

  async function importAnalytics() {
    await run("Importing analytics", () =>
      apiCall("/api/analytics/import", { method: "POST", body: { csv } })
    );
  }

  async function syncLinkedIn() {
    await run("Syncing LinkedIn analytics", () =>
      apiCall("/api/analytics/sync", { method: "POST" })
    );
  }

  async function updateInsight(insight: PerformanceInsight, action: "approve" | "reject") {
    await run(`${action} insight`, () =>
      apiCall(`/api/insights/${insight.id}/action`, {
        method: "POST",
        body: { action, observation: insight.observation, reason: insight.reason, improvement: insight.improvement }
      })
    );
  }

  return (
    <div>
      <p className="section-title">Analytics & Insights</p>
      <p className="section-subtitle">Import your post metrics to generate weekly learnings that improve your prompts.</p>

      <div className="two-col" style={{ gap: 24, alignItems: "flex-start" }}>
        {/* Import */}
        <div>
          <div className="card">
            <div className="card-title">Import CSV Metrics</div>
            <p className="text-muted" style={{ marginBottom: 14 }}>
              Export your LinkedIn analytics as CSV and paste below. Required columns: draft_id, impressions, likes, comments, reposts, profile_views.
            </p>
            <label className="form-label">
              Analytics CSV
              <textarea className="form-textarea" style={{ minHeight: 160, fontFamily: "var(--mono)", fontSize: 12 }} value={csv} onChange={(e) => setCsv(e.target.value)} />
            </label>
            <div className="btn-row">
              <button className="btn btn-primary" onClick={importAnalytics} disabled={Boolean(busy)}>
                <BarChart3 size={14} /> Import & Generate Insights
              </button>
              {isLinkedInConnected && (
                <button className="btn" onClick={syncLinkedIn} disabled={Boolean(busy)}>
                  <RefreshCw size={14} /> Sync from LinkedIn
                </button>
              )}
              {!isLinkedInConnected && (
                <div className="alert warn" style={{ margin: 0 }}>Connect LinkedIn in Setup tab to enable auto-sync.</div>
              )}
            </div>
          </div>

          {/* Metrics summary */}
          {snapshot.metrics.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-title">Metrics ({snapshot.metrics.length} snapshots)</div>
              {snapshot.metrics.slice(0, 5).map((m, i) => (
                <div key={m.id ?? i} style={{ display: "flex", gap: 16, padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ color: "var(--ink-2)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.draftId ? snapshot.drafts.find((d) => d.id === m.draftId)?.hook ?? m.draftId : "Unlabelled"}
                  </span>
                  <span style={{ color: "var(--ink-3)", whiteSpace: "nowrap" }}>👁 {m.impressions} · ❤ {m.likes}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div>
          <div className="card-title" style={{ marginBottom: 12 }}>Weekly Insights</div>
          {snapshot.insights.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <BarChart3 size={36} />
              <p>Import metrics to generate AI-powered weekly insights about what&apos;s working.</p>
            </div>
          ) : (
            snapshot.insights.map((insight) => (
              <div key={insight.id} className={`insight-card ${insight.status}`}>
                <div className="insight-card-obs">{insight.observation}</div>
                <div className="insight-card-body">{insight.reason}</div>
                <div className="insight-card-body" style={{ color: "var(--green)" }}>💡 {insight.improvement}</div>
                {insight.status === "proposed" && (
                  <div className="btn-row tight">
                    <button className="btn btn-green" onClick={() => updateInsight(insight, "approve")} disabled={Boolean(busy)}>
                      <Check size={13} /> Approve & apply to prompts
                    </button>
                    <button className="btn btn-danger" onClick={() => updateInsight(insight, "reject")} disabled={Boolean(busy)}>
                      <ThumbsDown size={13} /> Reject
                    </button>
                  </div>
                )}
                {insight.status === "approved" && <span className="pill green" style={{ marginTop: 8, display: "inline-flex" }}>✓ Applied to prompt rules</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
