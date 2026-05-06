"use client";

import { useState, useEffect } from "react";
import { CalendarClock, Check, Clock, Send, Trash2, Edit3, X, Save, RotateCcw } from "lucide-react";
import type { Draft, StoreSnapshot } from "@/lib/types";
import { apiCall } from "@/lib/api";
import { useToast } from "../Toast";


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
  const { toast } = useToast();
  const [filter, setFilter] = useState<"upcoming" | "history">("upcoming");
  const [editingId, setEditingId] = useState("");
  const [editBody, setEditBody] = useState("");

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

  async function updatePost(id: string, body: string) {
    await run("Updating post", () => apiCall(`/api/drafts/${id}`, { method: "PATCH", body: { body } }));
    setEditingId("");
  }

  async function reschedule(id: string) {
    // Just move to top of queue for now
    await run("Rescheduling", () => apiCall(`/api/drafts/${id}/action`, { method: "POST", body: { action: "schedule", schedule: { mode: "default" } } }));
  }

  return (
    <div className="queue-page">
      <div className="flex justify-between items-center mb-6">
        <div className="tabs-mini">
           <button className={`tab-mini ${filter === 'upcoming' ? 'active' : ''}`} onClick={() => setFilter('upcoming')}>Upcoming</button>
           <button className={`tab-mini ${filter === 'history' ? 'active' : ''}`} onClick={() => setFilter('history')}>History</button>
        </div>
        <button className="btn btn-primary" onClick={runQueue} disabled={Boolean(busy)}>
          <Send size={16} /> Run Queue Now
        </button>
      </div>

      {filter === 'upcoming' && (
        <div className="section">
          <p className="section-subtitle">Posts scheduled to be published. AI handles the timing based on your profile rules.</p>
          
          {scheduledDrafts.length === 0 ? (
            <div className="empty-state">
              <CalendarClock size={40} />
              <p>No posts scheduled yet.</p>
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
                    {editingId === d.id ? (
                      <div className="mt-4">
                        <textarea 
                          className="form-textarea" 
                          value={editBody} 
                          onChange={(e) => setEditBody(e.target.value)} 
                          autoFocus
                        />
                        <div className="btn-row tight mt-2">
                          <button className="btn btn-primary btn-icon-sm" onClick={() => updatePost(d.id, editBody)}><Save size={12} /> Save</button>
                          <button className="btn btn-ghost btn-icon-sm" onClick={() => setEditingId("")}><X size={12} /> Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="queue-item-body-preview">{d.body.slice(0, 160)}...</div>
                    )}
                  </div>

                  <div className="queue-item-actions">
                     <span className="status-badge scheduled">Scheduled</span>
                     <div className="btn-row tight">
                       <button className="btn-icon-sm" onClick={() => { setEditingId(d.id); setEditBody(d.body); }} title="Edit body"><Edit3 size={12} /></button>
                       <button className="btn-icon-sm danger" title="Delete" onClick={async () => {
                          if (window.confirm("Delete this scheduled post?")) {
                            await run("Deleting", () => apiCall(`/api/drafts/${d.id}`, { method: "DELETE" }));
                          }
                       }}><Trash2 size={12} /></button>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {filter === 'history' && (
        <div className="section">
          <p className="section-subtitle">Your published authority posts. Re-purpose or analyze performance below.</p>
          {postedDrafts.length === 0 ? (
            <div className="empty-state">
              <Check size={40} />
              <p>No history yet. Start publishing to see your footprint!</p>
            </div>
          ) : (
            <div className="queue-list compact">
              {postedDrafts.map((d) => (
                <div key={d.id} className="card queue-item compact">
                  <div className="queue-item-date compact">
                    <div className="time-label"><ClientDate value={d.postedAt} /></div>
                  </div>
                  <div className="queue-item-content">
                    <div className="queue-item-hook">{d.hook}</div>
                  </div>
                  <div className="queue-item-actions">
                     <span className="status-badge posted">Published</span>
                     <button className="btn-icon-sm" onClick={() => reschedule(d.id)} title="Schedule again"><RotateCcw size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

  );
}
