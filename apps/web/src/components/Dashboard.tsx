"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CalendarClock,
  Check,
  Copy,
  FileText,
  Image as ImageIcon,
  Lightbulb,
  Lock,
  RefreshCw,
  Send,
  Sparkles,
  ThumbsDown,
  Unlock
} from "lucide-react";
import type { ContentFormat, Draft, DraftLocks, PerformanceInsight, StoreSnapshot } from "@/lib/types";

type Props = {
  initialSnapshot: StoreSnapshot;
};

type ApiOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
};

async function api(path: string, options: ApiOptions = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as StoreSnapshot;
}

function statusLabel(status: Draft["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date(value));
}

function formatIcon(format: ContentFormat) {
  if (format === "image") return <ImageIcon size={16} />;
  if (format === "carousel") return <FileText size={16} />;
  if (format === "mixed") return <Sparkles size={16} />;
  return <Send size={16} />;
}

export function Dashboard({ initialSnapshot }: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [selectedId, setSelectedId] = useState(initialSnapshot.drafts[0]?.id ?? "");
  const [rawText, setRawText] = useState("");
  const [sourceLink, setSourceLink] = useState("");
  const [format, setFormat] = useState<ContentFormat>("text");
  const [analyticsCsv, setAnalyticsCsv] = useState(
    "draft_id,impressions,likes,comments,reposts,profile_views\n"
  );
  const [scheduleMode, setScheduleMode] = useState<"default" | "exact" | "range">("default");
  const [scheduleDate, setScheduleDate] = useState("");
  const [exactAt, setExactAt] = useState("");
  const [rangeStart, setRangeStart] = useState("10:00");
  const [rangeEnd, setRangeEnd] = useState("11:30");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const selectedDraft = useMemo(
    () => snapshot.drafts.find((draft) => draft.id === selectedId) ?? snapshot.drafts[0],
    [selectedId, snapshot.drafts]
  );

  async function run(label: string, action: () => Promise<StoreSnapshot>) {
    setBusy(label);
    setError("");
    try {
      const next = await action();
      setSnapshot(next);
      if (!selectedId && next.drafts[0]) {
        setSelectedId(next.drafts[0].id);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  async function createDraft() {
    await run("Generating draft", async () => {
      const next = await api("/api/drafts", {
        method: "POST",
        body: {
          rawText,
          sourceLinks: sourceLink ? [sourceLink] : [],
          format
        }
      });
      setSelectedId(next.drafts[0]?.id ?? "");
      return next;
    });
  }

  async function patchSelectedDraft(patch: Partial<Draft>) {
    if (!selectedDraft) return;
    await run("Saving draft", () =>
      api(`/api/drafts/${selectedDraft.id}`, {
        method: "PATCH",
        body: patch
      })
    );
  }

  async function draftAction(action: string) {
    if (!selectedDraft) return;
    await run(action, () =>
      api(`/api/drafts/${selectedDraft.id}/action`, {
        method: "POST",
        body: {
          action,
          schedule:
            action === "schedule"
              ? {
                  mode: scheduleMode,
                  exactAt,
                  date: scheduleDate,
                  rangeStart,
                  rangeEnd,
                  timezone: snapshot.creatorProfile.timezone
                }
              : undefined
        }
      })
    );
  }

  async function importAnalytics() {
    await run("Importing analytics", () =>
      api("/api/analytics/import", {
        method: "POST",
        body: {
          csv: analyticsCsv
        }
      })
    );
  }

  async function updateInsight(insight: PerformanceInsight, action: "approve" | "reject") {
    await run(`${action} insight`, () =>
      api(`/api/insights/${insight.id}/action`, {
        method: "POST",
        body: {
          action,
          observation: insight.observation,
          reason: insight.reason,
          improvement: insight.improvement
        }
      })
    );
  }

  function toggleLock(key: keyof DraftLocks) {
    if (!selectedDraft) return;
    void patchSelectedDraft({
      locks: {
        ...selectedDraft.locks,
        [key]: !selectedDraft.locks[key]
      }
    });
  }

  return (
    <main>
      <header className="topbar">
        <div>
          <p className="eyebrow">Local-first LinkedIn engine</p>
          <h1>AI Authority Content System</h1>
        </div>
        <div className="status-strip">
          <span>{snapshot.drafts.length} drafts</span>
          <span>{snapshot.metrics.length} metrics</span>
          <span>{snapshot.promptRuleChanges.length} approved learnings</span>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}
      {busy ? <div className="busy">{busy}...</div> : null}

      <section className="workspace-grid">
        <aside className="input-panel">
          <div className="section-heading">
            <Sparkles size={18} />
            <h2>Create draft</h2>
          </div>
          <label>
            Raw context or article notes
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              placeholder="Paste an idea, personal observation, article excerpt, or AI news note..."
            />
          </label>
          <label>
            Optional source link
            <input value={sourceLink} onChange={(event) => setSourceLink(event.target.value)} placeholder="https://..." />
          </label>
          <label>
            Format
            <select value={format} onChange={(event) => setFormat(event.target.value as ContentFormat)}>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="carousel">Carousel</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <button className="primary" onClick={createDraft} disabled={!rawText.trim() || Boolean(busy)}>
            <Sparkles size={16} />
            Generate draft
          </button>

          <div className="divider" />
          <div className="section-heading">
            <FileText size={18} />
            <h2>Draft inbox</h2>
          </div>
          <div className="draft-list">
            {snapshot.drafts.length === 0 ? <p className="muted">No drafts yet.</p> : null}
            {snapshot.drafts.map((draft) => (
              <button
                className={`draft-row ${draft.id === selectedDraft?.id ? "active" : ""}`}
                key={draft.id}
                onClick={() => setSelectedId(draft.id)}
              >
                <span>{formatIcon(draft.format)}</span>
                <span>{draft.hook}</span>
                <small>{statusLabel(draft.status)}</small>
              </button>
            ))}
          </div>
        </aside>

        <section className="preview-panel">
          {!selectedDraft ? (
            <div className="empty-state">
              <Sparkles size={34} />
              <h2>Generate the first draft</h2>
              <p>Paste a thought or article link to create a structured authority post.</p>
            </div>
          ) : (
            <>
              <div className="preview-header">
                <div>
                  <p className="eyebrow">Selected draft</p>
                  <h2>{selectedDraft.hook}</h2>
                </div>
                <span className={`status-pill ${selectedDraft.status}`}>{statusLabel(selectedDraft.status)}</span>
              </div>

              <div className="score-grid">
                <div>
                  <strong>{selectedDraft.qualityScore.overall}</strong>
                  <span>Quality</span>
                </div>
                <div className={selectedDraft.similarity.warning ? "warn-score" : ""}>
                  <strong>{Math.round(selectedDraft.similarity.score * 100)}%</strong>
                  <span>Similarity</span>
                </div>
                <div>
                  <strong>{selectedDraft.sources.length}</strong>
                  <span>Sources</span>
                </div>
              </div>

              {selectedDraft.similarity.warning ? (
                <div className="warning">{selectedDraft.similarity.reason}</div>
              ) : null}

              <EditableField label="Hook" value={selectedDraft.hook} locked={selectedDraft.locks.hook} onToggleLock={() => toggleLock("hook")} onChange={(hook) => patchSelectedDraft({ hook })} />
              <EditableField label="Context" value={selectedDraft.context} locked={selectedDraft.locks.context} onToggleLock={() => toggleLock("context")} onChange={(context) => patchSelectedDraft({ context })} multiline />
              <EditableField label="Insight" value={selectedDraft.insight} locked={selectedDraft.locks.insight} onToggleLock={() => toggleLock("insight")} onChange={(insight) => patchSelectedDraft({ insight })} multiline />
              <EditableField label="Takeaway" value={selectedDraft.takeaway} locked={selectedDraft.locks.takeaway} onToggleLock={() => toggleLock("takeaway")} onChange={(takeaway) => patchSelectedDraft({ takeaway })} multiline />
              <EditableField label="CTA" value={selectedDraft.cta ?? ""} locked={selectedDraft.locks.cta} onToggleLock={() => toggleLock("cta")} onChange={(cta) => patchSelectedDraft({ cta })} multiline />

              <div className="post-preview">
                <div className="section-heading">
                  <Send size={18} />
                  <h2>Text preview</h2>
                </div>
                <pre>{selectedDraft.body}</pre>
              </div>

              {selectedDraft.imagePrompt ? (
                <div className="asset-band">
                  <div className="section-heading">
                    <ImageIcon size={18} />
                    <h2>Image prompt</h2>
                  </div>
                  <p>{selectedDraft.imagePrompt}</p>
                </div>
              ) : null}

              {selectedDraft.carouselOutline.length > 0 ? (
                <div className="asset-band">
                  <div className="section-heading">
                    <FileText size={18} />
                    <h2>Carousel outline</h2>
                  </div>
                  <ol>
                    {selectedDraft.carouselOutline.map((slide, index) => (
                      <li key={`${slide.title}-${index}`}>
                        <strong>{slide.title}</strong>
                        <span>{slide.body}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <div className="action-row">
                <button onClick={() => draftAction("regenerateText")}>
                  <RefreshCw size={16} />
                  Regenerate text
                </button>
                <button onClick={() => draftAction("regenerateImage")}>
                  <ImageIcon size={16} />
                  Regenerate image
                </button>
                <button onClick={() => draftAction("regenerateBoth")}>
                  <Sparkles size={16} />
                  Regenerate both
                </button>
                <button onClick={() => draftAction("approve")}>
                  <Check size={16} />
                  Approve
                </button>
                <button className="danger" onClick={() => draftAction("reject")}>
                  <ThumbsDown size={16} />
                  Reject
                </button>
              </div>

              <div className="schedule-band">
                <div className="section-heading">
                  <CalendarClock size={18} />
                  <h2>Schedule or export</h2>
                </div>
                <div className="schedule-grid">
                  <label>
                    Mode
                    <select value={scheduleMode} onChange={(event) => setScheduleMode(event.target.value as "default" | "exact" | "range")}>
                      <option value="default">Default 10:30 AM</option>
                      <option value="exact">Exact timestamp</option>
                      <option value="range">Random time in range</option>
                    </select>
                  </label>
                  <label>
                    Date
                    <input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} />
                  </label>
                  <label>
                    Exact
                    <input type="datetime-local" value={exactAt} onChange={(event) => setExactAt(event.target.value)} />
                  </label>
                  <label>
                    Range start
                    <input type="time" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
                  </label>
                  <label>
                    Range end
                    <input type="time" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
                  </label>
                </div>
                <div className="action-row">
                  <button onClick={() => draftAction("schedule")}>
                    <CalendarClock size={16} />
                    Schedule
                  </button>
                  <button onClick={() => navigator.clipboard.writeText(selectedDraft.body)}>
                    <Copy size={16} />
                    Copy post
                  </button>
                </div>
                <p className="muted">Scheduled: {formatDate(selectedDraft.scheduledAt)}</p>
              </div>
            </>
          )}
        </section>

        <aside className="learning-panel">
          <div className="section-heading">
            <BarChart3 size={18} />
            <h2>Weekly learning</h2>
          </div>
          <textarea value={analyticsCsv} onChange={(event) => setAnalyticsCsv(event.target.value)} />
          <button onClick={importAnalytics}>
            <BarChart3 size={16} />
            Import metrics
          </button>

          <div className="divider" />
          <div className="section-heading">
            <Lightbulb size={18} />
            <h2>Insights</h2>
          </div>
          <div className="insight-list">
            {snapshot.insights.length === 0 ? <p className="muted">Import metrics to generate weekly learnings.</p> : null}
            {snapshot.insights.map((insight) => (
              <article className={`insight ${insight.status}`} key={insight.id}>
                <strong>{insight.observation}</strong>
                <p>{insight.reason}</p>
                <p>{insight.improvement}</p>
                <div className="action-row compact">
                  <button onClick={() => updateInsight(insight, "approve")}>
                    <Check size={15} />
                    Approve
                  </button>
                  <button className="danger" onClick={() => updateInsight(insight, "reject")}>
                    <ThumbsDown size={15} />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function EditableField({
  label,
  value,
  locked,
  multiline,
  onChange,
  onToggleLock
}: {
  label: string;
  value: string;
  locked: boolean;
  multiline?: boolean;
  onChange: (value: string) => void;
  onToggleLock: () => void;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function save() {
    if (local !== value) {
      onChange(local);
    }
  }

  return (
    <label className="editable">
      <span>
        {label}
        <button type="button" className="icon-button" onClick={onToggleLock} title={locked ? "Unlock section" : "Lock section"}>
          {locked ? <Lock size={15} /> : <Unlock size={15} />}
        </button>
      </span>
      {multiline ? (
        <textarea value={local} onChange={(event) => setLocal(event.target.value)} onBlur={save} />
      ) : (
        <input value={local} onChange={(event) => setLocal(event.target.value)} onBlur={save} />
      )}
    </label>
  );
}
