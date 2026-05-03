"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Sparkles, FileText, Image as ImageIcon, RefreshCw,
  Check, ThumbsDown, Lock, Unlock, Copy, CalendarClock,
  Share2, Send
} from "lucide-react";
import type { ContentFormat, Draft, DraftLocks, StoreSnapshot } from "@/lib/types";
import { apiCall } from "../Dashboard";
import { carouselToMarkdown } from "@/lib/visuals";

type Props = {
  snapshot: StoreSnapshot;
  run: (label: string, action: () => Promise<StoreSnapshot>) => Promise<void>;
  busy: string;
  isLinkedInConnected: boolean;
};

function statusLabel(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function formatDate(v?: string) {
  if (!v) return "Not set";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(v));
}

function formatIcon(f: ContentFormat) {
  if (f === "image") return <ImageIcon size={14} />;
  if (f === "carousel") return <FileText size={14} />;
  if (f === "mixed") return <Sparkles size={14} />;
  return <Send size={14} />;
}

export function CreateTab({ snapshot, run, busy, isLinkedInConnected }: Props) {
  const [rawText, setRawText] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [format, setFormat] = useState<ContentFormat>("text");
  const [selectedId, setSelectedId] = useState(snapshot.drafts[0]?.id ?? "");
  const [scheduleMode, setScheduleMode] = useState<"default" | "exact" | "range">("default");
  const [scheduleDate, setScheduleDate] = useState("");
  const [exactAt, setExactAt] = useState("");
  const [rangeStart, setRangeStart] = useState("10:00");
  const [rangeEnd, setRangeEnd] = useState("11:30");

  const activeProfile = useMemo(
    () => snapshot.creatorProfiles.find((p) => p.id === snapshot.activeProfileId) ?? snapshot.creatorProfiles[0],
    [snapshot]
  );

  const selectedDraft = useMemo(
    () => snapshot.drafts.find((d) => d.id === selectedId) ?? snapshot.drafts[0],
    [selectedId, snapshot.drafts]
  );

  // Sync selectedId when new draft arrives
  useEffect(() => {
    if (snapshot.drafts[0] && !selectedId) setSelectedId(snapshot.drafts[0].id);
  }, [snapshot.drafts, selectedId]);

  async function createDraft() {
    await run("Generating draft", async () => {
      const next = await apiCall("/api/drafts", { method: "POST", body: { rawText, sourceLinks: sourceLink ? [sourceLink] : [], format } });
      setSelectedId(next.drafts[0]?.id ?? "");
      setRawText(""); setSourceLink("");
      return next;
    });
  }

  async function patchDraft(patch: Partial<Draft>) {
    if (!selectedDraft) return;
    await run("Saving", () => apiCall(`/api/drafts/${selectedDraft.id}`, { method: "PATCH", body: patch }));
  }

  async function draftAction(action: string) {
    if (!selectedDraft) return;
    await run(action, () => apiCall(`/api/drafts/${selectedDraft.id}/action`, {
      method: "POST",
      body: {
        action,
        schedule: action === "schedule" ? {
          mode: scheduleMode, exactAt, date: scheduleDate,
          rangeStart, rangeEnd, timezone: activeProfile.timezone
        } : undefined
      }
    }));
  }

  function toggleLock(key: keyof DraftLocks) {
    if (!selectedDraft) return;
    void patchDraft({ locks: { ...selectedDraft.locks, [key]: !selectedDraft.locks[key] } });
  }

  return (
    <div className="two-col" style={{ gap: 24, alignItems: "flex-start" }}>
      {/* Left: Create + Draft list */}
      <div>
        <div className="card">
          <div className="card-title">New Draft</div>
          <label className="form-label">
            Raw context or article notes
            <textarea
              className="form-textarea"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste your idea, observation, or article excerpt..."
            />
          </label>
          <label className="form-label">
            Source link (optional)
            <input className="form-input" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} placeholder="https://..." />
          </label>
          <label className="form-label">
            Format
            <select className="form-select" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>
              <option value="text">Text post</option>
              <option value="image">Image post</option>
              <option value="carousel">Carousel</option>
              <option value="mixed">Mixed (text + image)</option>
            </select>
          </label>
          <button className="btn btn-primary" onClick={createDraft} disabled={!rawText.trim() || Boolean(busy)} style={{ width: "100%" }}>
            <Sparkles size={16} /> Generate Draft
          </button>
        </div>

        {/* Draft inbox */}
        <div style={{ marginTop: 20 }}>
          <p className="section-title" style={{ fontSize: 14, marginBottom: 10 }}>Draft Inbox <span className="pill" style={{ fontSize: 11 }}>{snapshot.drafts.length}</span></p>
          {snapshot.drafts.length === 0 && <p className="text-muted">No drafts yet. Generate one above.</p>}
          <div className="draft-list">
            {snapshot.drafts.map((d) => (
              <button
                key={d.id}
                className={`draft-item ${d.id === selectedDraft?.id ? "active" : ""}`}
                onClick={() => setSelectedId(d.id)}
              >
                <div className="draft-item-icon">{formatIcon(d.format)}</div>
                <div className="draft-item-body">
                  <div className="draft-item-hook">{d.hook}</div>
                  <div className="draft-item-meta">{formatDate(d.createdAt)}</div>
                </div>
                <span className={`status-badge ${d.status}`}>{statusLabel(d.status)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Draft editor */}
      <div>
        {!selectedDraft ? (
          <div className="empty-state">
            <Sparkles size={40} />
            <p>Generate your first draft using the form on the left.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Selected Draft</p>
                <p style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>{selectedDraft.hook}</p>
              </div>
              <span className={`status-badge ${selectedDraft.status}`}>{statusLabel(selectedDraft.status)}</span>
            </div>

            {/* Scores */}
            <div className="score-grid">
              <div className={`score-box ${selectedDraft.qualityScore.overall > 70 ? "good" : selectedDraft.qualityScore.overall < 50 ? "warn" : ""}`}>
                <div className="score-box-value">{selectedDraft.qualityScore.overall}</div>
                <div className="score-box-label">Quality</div>
              </div>
              <div className={`score-box ${selectedDraft.similarity.warning ? "warn" : ""}`}>
                <div className="score-box-value">{Math.round(selectedDraft.similarity.score * 100)}%</div>
                <div className="score-box-label">Similarity</div>
              </div>
              <div className="score-box">
                <div className="score-box-value">{selectedDraft.sources.length}</div>
                <div className="score-box-label">Sources</div>
              </div>
            </div>

            {selectedDraft.similarity.warning && (
              <div className="alert warn"><span>⚠</span> {selectedDraft.similarity.reason}</div>
            )}

            {/* Editable fields */}
            {(["hook", "context", "insight", "takeaway", "cta"] as const).map((field) => (
              <EditableField
                key={field}
                label={field.toUpperCase()}
                value={String(selectedDraft[field] ?? "")}
                locked={selectedDraft.locks[field as keyof DraftLocks] ?? false}
                multiline={field !== "hook"}
                onToggleLock={() => toggleLock(field as keyof DraftLocks)}
                onChange={(val) => patchDraft({ [field]: val })}
              />
            ))}

            {/* Post preview */}
            <div className="block">
              <div className="block-title"><Send size={14} /> Full post preview</div>
              <div className="post-preview">
                <pre>{selectedDraft.body}</pre>
              </div>
            </div>

            {/* Image prompt */}
            {selectedDraft.imagePrompt && (
              <div className="block">
                <div className="block-title"><ImageIcon size={14} /> Image prompt</div>
                <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.6 }}>{selectedDraft.imagePrompt}</p>
                <div className="btn-row tight">
                  <button className="btn" onClick={() => navigator.clipboard.writeText(selectedDraft.imagePrompt ?? "")}><Copy size={14} /> Copy prompt</button>
                </div>
              </div>
            )}

            {/* Visual concepts */}
            {selectedDraft.visualConcepts?.length > 0 && (
              <div className="block">
                <div className="block-title"><ImageIcon size={14} /> Visual concepts</div>
                <div className="visual-grid">
                  {selectedDraft.visualConcepts.map((c) => (
                    <div key={c.id} className="visual-concept">
                      <div className="visual-concept-type">{c.type} · {c.layout}</div>
                      <div className="visual-concept-title">{c.title}</div>
                      <div className="visual-concept-prompt">{c.prompt}</div>
                      <div className="btn-row tight">
                        <button className="btn btn-ghost" style={{ fontSize: 11 }} onClick={() => navigator.clipboard.writeText(c.prompt)}>
                          <Copy size={12} /> Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Carousel */}
            {selectedDraft.carouselOutline?.length > 0 && (
              <div className="block">
                <div className="block-title"><FileText size={14} /> Carousel outline</div>
                {selectedDraft.carouselOutline.map((slide, i) => (
                  <div key={i} className="carousel-slide">
                    <div className="slide-num">{i + 1}</div>
                    <div>
                      <div className="slide-title">{slide.title}</div>
                      <div className="slide-body">{slide.body}</div>
                      {slide.visualNote && <div className="slide-note">🎨 {slide.visualNote}</div>}
                    </div>
                  </div>
                ))}
                <div className="btn-row tight">
                  <button className="btn" onClick={() => navigator.clipboard.writeText(carouselToMarkdown(selectedDraft.carouselOutline))}>
                    <Copy size={14} /> Copy outline
                  </button>
                </div>
              </div>
            )}

            {/* Action row */}
            <div className="block">
              <div className="block-title">Draft Actions</div>
              <div className="btn-row">
                <button className="btn" onClick={() => draftAction("regenerateText")} disabled={Boolean(busy)}><RefreshCw size={14} /> Regenerate text</button>
                <button className="btn" onClick={() => draftAction("regenerateImage")} disabled={Boolean(busy)}><ImageIcon size={14} /> Regenerate visuals</button>
                <button className="btn btn-green" onClick={() => draftAction("approve")} disabled={Boolean(busy)}><Check size={14} /> Approve</button>
                <button className="btn btn-danger" onClick={() => draftAction("reject")} disabled={Boolean(busy)}><ThumbsDown size={14} /> Reject</button>
              </div>
            </div>

            {/* Schedule */}
            <div className="block">
              <div className="block-title"><CalendarClock size={14} /> Schedule &amp; Publish</div>

              <div className="schedule-options">
                {(["default","exact","range"] as const).map((m) => (
                  <button key={m} className={`schedule-option-btn ${scheduleMode === m ? "active" : ""}`} onClick={() => setScheduleMode(m)}>
                    {m === "default" ? "Default 10:30 AM" : m === "exact" ? "Exact time" : "Time range"}
                  </button>
                ))}
              </div>

              {scheduleMode === "exact" && (
                <div className="schedule-inputs single">
                  <label className="form-label">Date & time<input type="datetime-local" className="form-input" value={exactAt} onChange={(e) => setExactAt(e.target.value)} /></label>
                </div>
              )}

              {scheduleMode === "range" && (
                <div className="schedule-inputs">
                  <label className="form-label">Date<input type="date" className="form-input" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} /></label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <label className="form-label">From<input type="time" className="form-input" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} /></label>
                    <label className="form-label">To<input type="time" className="form-input" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} /></label>
                  </div>
                </div>
              )}

              {scheduleMode === "default" && (
                <p className="text-xs" style={{ marginBottom: 12 }}>Will be scheduled at 10:30 AM IST on the next available day.</p>
              )}

              {selectedDraft.scheduledAt && (
                <div className="alert info" style={{ marginBottom: 12 }}>📅 Scheduled: {formatDate(selectedDraft.scheduledAt)}</div>
              )}

              <div className="btn-row">
                <button className="btn" onClick={() => draftAction("schedule")} disabled={Boolean(busy)}><CalendarClock size={14} /> Schedule</button>
                <button
                  className={`btn ${isLinkedInConnected ? "btn-primary" : ""}`}
                  onClick={() => isLinkedInConnected ? draftAction("publishNow") : undefined}
                  disabled={!isLinkedInConnected || Boolean(busy)}
                  title={!isLinkedInConnected ? "Go to Setup tab to connect LinkedIn" : "Publish to LinkedIn now"}
                >
                  <Share2 size={14} /> {isLinkedInConnected ? "Publish Now" : "LinkedIn not connected"}
                </button>
                <button className="btn" onClick={() => navigator.clipboard.writeText(selectedDraft.body)}><Copy size={14} /> Copy post</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EditableField({ label, value, locked, multiline, onChange, onToggleLock }: {
  label: string; value: string; locked: boolean; multiline?: boolean;
  onChange: (v: string) => void; onToggleLock: () => void;
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  function save() { if (local !== value) onChange(local); }

  return (
    <div className="editable-field">
      <div className="editable-field-header">
        <span className="editable-field-label">{label}</span>
        <button className="btn btn-ghost btn-icon" onClick={onToggleLock} title={locked ? "Unlock" : "Lock"} style={{ opacity: locked ? 1 : 0.5 }}>
          {locked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>
      </div>
      {multiline ? (
        <textarea className="form-textarea" style={{ minHeight: 80 }} value={local} onChange={(e) => setLocal(e.target.value)} onBlur={save} readOnly={locked} />
      ) : (
        <input className="form-input" value={local} onChange={(e) => setLocal(e.target.value)} onBlur={save} readOnly={locked} />
      )}
    </div>
  );
}
