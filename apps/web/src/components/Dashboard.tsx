"use client";

import { useState, useMemo } from "react";
import {
  LayoutDashboard, Newspaper, BarChart3,
  Settings, Link2, Sparkles, CalendarClock
} from "lucide-react";
import type { StoreSnapshot } from "@/lib/types";
import { CreateTab } from "./tabs/CreateTab";
import { NewsTab } from "./tabs/NewsTab";
import { AnalyticsTab } from "./tabs/AnalyticsTab";
import { LeadMagnetTab } from "./tabs/LeadMagnetTab";
import { QueueTab } from "./tabs/QueueTab";


type Tab = "create" | "news" | "queue" | "analytics" | "leadmagnet";


type Props = { initialSnapshot: StoreSnapshot };

import { apiCall } from "@/lib/api";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "create",     label: "Create & Drafts",  icon: <LayoutDashboard size={16} /> },
  { id: "news",       label: "News Mode",         icon: <Newspaper size={16} /> },
  { id: "queue",      label: "Publication Queue", icon: <CalendarClock size={16} /> },
  { id: "analytics",  label: "Analytics",         icon: <BarChart3 size={16} /> },
  { id: "leadmagnet", label: "Lead Magnets",      icon: <Sparkles size={16} /> },
];

export function Dashboard({ initialSnapshot }: Props) {
  console.log("[DASHBOARD] Rendering with snapshot version:", initialSnapshot.drafts.length);
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [activeTab, setActiveTab] = useState<Tab>("create");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const activeProfile = useMemo(
    () => snapshot.creatorProfiles.find((p) => p.id === snapshot.activeProfileId) ?? snapshot.creatorProfiles[0],
    [snapshot.activeProfileId, snapshot.creatorProfiles]
  );

  const isLinkedInConnected = Boolean(activeProfile?.linkedinAccessToken);

  async function run(label: string, action: () => Promise<StoreSnapshot>) {
    setBusy(label);
    setError("");
    try {
      console.log(`[DASHBOARD] Running action: ${label}`);
      const next = await action();
      console.log("[DASHBOARD] Action success, updating snapshot:", next.drafts.length, "drafts");
      setSnapshot(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  const tabLabels: Record<Tab, string> = {
    create: "Create & Drafts",
    news: "News Mode",
    queue: "Publication Queue & History",
    analytics: "Analytics & Insights",
    leadmagnet: "Lead Magnet Pipeline",
  };

  return (
    <div className="app-shell">
      {busy && <div className="busy-bar" />}

      {/* Sidebar nav */}
      <nav className="app-nav">
        <div className="app-nav-logo">
          <h1>Content Engine</h1>
          <p>AI Authority System</p>
        </div>

        <div className="nav-links">
          <div className="nav-section-label">Workspace</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>

        <div className="nav-bottom">
          <div className="nav-section-label">Account</div>
          <div className={`linkedin-badge ${isLinkedInConnected ? "connected" : "disconnected"}`} style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)' }}>
            <div className="linkedin-badge-dot" />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>LinkedIn</div>
              <div style={{ fontSize: 11, color: 'var(--ink-2)' }}>{isLinkedInConnected ? "Authenticated" : "Not connected"}</div>
            </div>
          </div>
          
          <div style={{ marginTop: '12px' }}>
            {!isLinkedInConnected ? (
              <a href="/api/linkedin/oauth/start" style={{ textDecoration: "none", width: '100%' }}>
                <button className="btn btn-primary" style={{ width: '100%', fontSize: '12px', padding: '6px 12px' }}>
                  <Link2 size={14} /> Connect Profile
                </button>
              </a>
            ) : (
              <a href="/api/linkedin/oauth/start" style={{ textDecoration: "none", width: '100%' }}>
                <button className="btn btn-ghost" style={{ width: '100%', fontSize: '11px', padding: '6px 12px' }}>
                  <Settings size={13} /> Reconnect
                </button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Main area */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="app-topbar-title">{tabLabels[activeTab]}</div>
          <div className="topbar-actions">
            <span className="pill">{snapshot.drafts.length} drafts</span>
            <span className={`pill ${isLinkedInConnected ? 'green' : 'warn'}`}>
              <Link2 size={12} /> {isLinkedInConnected ? 'LinkedIn Live' : 'Offline'}
            </span>
          </div>
        </header>

        {error && (
          <div style={{ padding: "0 28px" }}>
            <div className="alert error" style={{ marginTop: 16 }}>⚠ {error}</div>
          </div>
        )}

        <div className="tab-content">
          {activeTab === "create"     && <CreateTab     snapshot={snapshot} run={run} busy={busy} isLinkedInConnected={isLinkedInConnected} />}
          {activeTab === "news"       && <NewsTab        snapshot={snapshot} run={run} busy={busy} />}
          {activeTab === "queue"      && <QueueTab       snapshot={snapshot} run={run} busy={busy} />}
          {activeTab === "analytics"  && <AnalyticsTab   snapshot={snapshot} run={run} busy={busy} isLinkedInConnected={isLinkedInConnected} />}
          {activeTab === "leadmagnet" && <LeadMagnetTab  snapshot={snapshot} run={run} busy={busy} />}
        </div>
      </div>
    </div>
  );
}
