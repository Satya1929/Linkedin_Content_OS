"use client";

import { useState } from "react";
import { BarChart3, RefreshCw, Check, ThumbsDown, TrendingUp, Users, MessageSquare, Share2 } from "lucide-react";
import type { PerformanceInsight, StoreSnapshot } from "@/lib/types";
import { apiCall } from "../../lib/api";
import { useToast } from "../Toast";


type Props = {
  snapshot: StoreSnapshot;
  run: (label: string, action: () => Promise<StoreSnapshot>) => Promise<void>;
  busy: string;
  isLinkedInConnected: boolean;
};

export function AnalyticsTab({ snapshot, run, busy, isLinkedInConnected }: Props) {
  const { toast } = useToast();
  const [csv, setCsv] = useState("draft_id,impressions,likes,comments,reposts,profile_views\n");

  const totalImpressions = snapshot.metrics.reduce((acc, m) => acc + (m.impressions || 0), 0);
  const totalEngagement = snapshot.metrics.reduce((acc, m) => acc + (m.likes || 0) + (m.comments || 0) + (m.reposts || 0), 0);
  const avgEngagement = totalImpressions > 0 ? (totalEngagement / totalImpressions * 100).toFixed(1) : "0";


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

    <div className="analytics-page">
      <div className="analytics-grid-top mb-6">
        <div className="card metric-card">
           <div className="flex items-center gap-2 text-ink-3 text-xs mb-1"><TrendingUp size={14} /> Total Impressions</div>
           <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
        </div>
        <div className="card metric-card">
           <div className="flex items-center gap-2 text-ink-3 text-xs mb-1"><MessageSquare size={14} /> Engagement Rate</div>
           <div className="text-2xl font-bold">{avgEngagement}%</div>
        </div>
        <div className="card metric-card">
           <div className="flex items-center gap-2 text-ink-3 text-xs mb-1"><Users size={14} /> Profile Growth</div>
           <div className="text-2xl font-bold">+{snapshot.metrics.reduce((acc, m) => acc + (m.profileViews || 0), 0)}</div>
        </div>
      </div>

      <div className="two-col" style={{ gap: 24, alignItems: "flex-start" }}>
        <div>
          <div className="card">
            <div className="card-title">Metric Performance</div>
            {snapshot.metrics.length === 0 ? (
              <div className="empty-state">
                <p className="text-sm text-ink-3">No data to visualize yet.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {snapshot.metrics.slice(0, 5).map((m, i) => {
                  const draft = snapshot.drafts.find(d => d.id === m.draftId);
                  const maxImp = Math.max(...snapshot.metrics.map(x => x.impressions || 1));
                  const width = ((m.impressions || 0) / maxImp * 100).toFixed(0);
                  
                  return (
                    <div key={m.id || i} className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate w-48 text-ink-2">{draft?.hook || 'Unlabelled Post'}</span>
                        <span className="font-bold">{m.impressions}</span>
                      </div>
                      <div className="chart-bar-bg">
                        <div className="chart-bar-fill" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="card-title text-sm mb-2">Import CSV Metrics</div>
              <textarea 
                className="form-textarea" 
                style={{ minHeight: 120, fontSize: 11 }} 
                value={csv} 
                onChange={(e) => setCsv(e.target.value)} 
              />
              <button className="btn btn-primary w-full mt-3" onClick={importAnalytics} disabled={Boolean(busy)}>
                Import & Analyze
              </button>
            </div>
          </div>
        </div>

        <div>
          <div className="card-title flex items-center gap-2 mb-4"><Sparkles size={16} /> Content Insights</div>
          {snapshot.insights.length === 0 ? (
            <div className="empty-state card" style={{ minHeight: 260 }}>
              <BarChart3 size={36} />
              <p>Import metrics to see your pattern-matching insights.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {snapshot.insights.map((insight) => (
                <div key={insight.id} className={`insight-card ${insight.status}`}>
                  <div className="insight-card-obs">{insight.observation}</div>
                  <div className="insight-card-body">{insight.reason}</div>
                  <div className="insight-card-body text-green font-bold">💡 {insight.improvement}</div>
                  {insight.status === "proposed" && (
                    <div className="btn-row mt-4">
                      <button className="btn btn-green btn-icon-sm" onClick={() => updateInsight(insight, "approve")} disabled={Boolean(busy)}>
                        <Check size={13} /> Apply
                      </button>
                      <button className="btn btn-danger btn-ghost btn-icon-sm" onClick={() => updateInsight(insight, "reject")} disabled={Boolean(busy)}>
                        <ThumbsDown size={13} /> Ignore
                      </button>
                    </div>
                  )}
                  {insight.status === "approved" && (
                    <div className="mt-3 flex items-center gap-1 text-green text-xs font-bold">
                       <Check size={12} /> Optimization active
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

  );
}
