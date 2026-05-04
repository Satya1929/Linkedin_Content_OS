"use client";

import { useState, useEffect } from "react";
import { CalendarClock, Check, Clock, Send, Trash2 } from "lucide-react";
import type { Draft, StoreSnapshot } from "@/lib/types";
import { apiCall } from "@/lib/api";

type Props = {
  snapshot: StoreSnapshot;
  run: (label: string, action: () => Promise<StoreSnapshot>) => Promise<void>;
  busy: string;
};

function ClientDate({ value }: { value?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !value) return <span>{value ? "Loading..." : "Not set"}</span>;
  return <span>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value))}</span>;
}

export function QueueTab({ snapshot, run, busy }: Props) {
  const scheduledDrafts = snapshot.drafts
    .filter((d) => d.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

  const postedDrafts = snapshot.drafts
    .filter((d) => d.status === "posted")
    .sort((a, b) => new Date(b.postedAt!).getTime() - new Date(a.postedAt!).getTime());

  async function runQueue() {
    await run("Publishing due posts", async () => {
      const response = await fetch("/api/cron/publish", { method: "POST" });
      const contentType = response.headers.get("content-type");
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response: ${text.slice(0, 100)}...`);
      }

      if (!response.ok) throw new Error(await response.text());
      
      const result = await response.json();
      if (result.processed === 0) {
        alert("No posts are currently due for publication.");
      }
      // Refresh the store by getting a new snapshot
      const storeRes = await fetch("/api/store");
      if (!storeRes.ok) throw new Error("Failed to refresh store");
      return await storeRes.json();
    });
  }

  return (
    <div className="queue-page">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={runQueue} disabled={Boolean(busy)}>
          <Send size={16} /> Run Queue Now
        </button>
      </div>
      <div className="section">
        <p className="section-title"><Clock size={18} /> Upcoming Publication Queue</p>
        <p className="section-subtitle">Posts scheduled to be published. Note: Local-first publication requires the app to be running or a cron job configured.</p>
        
        {scheduledDrafts.length === 0 ? (
          <div className="empty-state card" style={{ padding: 40, textAlign: "center" }}>
            <CalendarClock size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p className="text-muted">No posts scheduled. Go to &quot;Create &amp; Drafts&quot; to schedule your approved content.</p>
          </div>
        ) : (
          <div className="queue-list">
            {scheduledDrafts.map((d) => (
              <div key={d.id} className="card queue-item">
                <div className="queue-item-date">
                  <div className="date-badge">
                    <span className="date-badge-top">{new Date(d.scheduledAt!).toLocaleString('en-IN', { month: 'short' })}</span>
                    <span className="date-badge-main">{new Date(d.scheduledAt!).getDate()}</span>
                  </div>
                  <div className="time-label">{new Date(d.scheduledAt!).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="queue-item-content">
                  <div className="queue-item-hook">{d.hook}</div>
                  <div className="queue-item-body-preview">{d.body.slice(0, 120)}...</div>
                </div>
                <div className="queue-item-actions" style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
                   <span className="status-badge scheduled">Scheduled</span>
                   <button 
                     className="btn-icon-sm danger" 
                     title="Delete & Unschedule"
                     onClick={async () => {
                       console.log("[QUEUE] Delete clicked for", d.id);
                       if (window.confirm("Unschedule and delete this post?")) {
                         await run("Deleting", async () => {
                            const result = await apiCall(`/api/drafts/${d.id}`, { method: "DELETE" });
                            console.log("[QUEUE] Delete finished");
                            return result;
                         });
                       }
                     }}
                   >
                     <Trash2 size={12} />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section" style={{ marginTop: 40 }}>
        <p className="section-title"><Check size={18} /> Recently Published</p>
        <div className="queue-list compact">
          {postedDrafts.slice(0, 5).map((d) => (
            <div key={d.id} className="card queue-item compact">
              <div className="queue-item-date compact">
                <div className="time-label"><ClientDate value={d.postedAt} /></div>
              </div>
              <div className="queue-item-content">
                <div className="queue-item-hook">{d.hook}</div>
              </div>
              <div className="queue-item-actions">
                 <span className="status-badge posted">Published</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
