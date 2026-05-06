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

import { useToast } from "./Toast";

export function Dashboard({ initialSnapshot }: Props) {
  const { toast } = useToast();
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
      const next = await action();
      setSnapshot(next);
      toast(`${label} completed successfully`, "success");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      toast(msg, "error");
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

      {/* Sidebar */}
      <aside className="app-nav">
        <div style={{ padding: "24px 20px" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="logo-icon"><Sparkles size={18} /></div>
            <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>Authority OS</h1>
          </div>
          <p className="text-xs text-ink-3">Content Strategy Engine</p>
        </div>

        <nav className="nav-links" style={{ flex: 1 }}>
          <div className="nav-section-label">Workspace</div>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-link ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Profile / Account section at bottom */}
        <div className="nav-bottom">
           <div className="nav-section-label">Account</div>
           <div className="account-card">
              <div className="flex items-center gap-3">
                 <div className="avatar">
                    {activeProfile?.name?.[0] ?? "U"}
                 </div>
                 <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-bold truncate">{activeProfile?.name ?? "LinkedIn Profile"}</div>
                    <div className="flex items-center gap-1">
                       <div className={`status-dot ${isLinkedInConnected ? 'online' : 'offline'}`} />
                       <span className="text-xs text-ink-3">{isLinkedInConnected ? 'LinkedIn Live' : 'Offline'}</span>
                    </div>
                 </div>
              </div>
              <a href="/api/linkedin/oauth/start" style={{ textDecoration: "none" }}>
                <button 
                  className="btn btn-ghost w-full mt-4" 
                  style={{ fontSize: 11, padding: '6px' }}
                >
                  <RefreshCw size={12} /> {isLinkedInConnected ? 'Reconnect Profile' : 'Connect LinkedIn'}
                </button>
              </a>
           </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="app-main">
        <header className="app-topbar justify-between">
           <div className="flex items-center gap-4">
              <div className="app-topbar-title">{tabLabels[activeTab]}</div>
              {busy && (
                <div className="flex items-center gap-2 text-xs text-accent">
                   <RefreshCw size={12} className="animate-spin" />
                   <span>{busy}...</span>
                </div>
              )}
           </div>
           <div className="flex items-center gap-3">
              <div className="text-xs text-ink-3">
                 {snapshot.drafts.length} drafts cached
              </div>
              <button 
                className="btn btn-ghost btn-icon-sm" 
                onClick={() => run("Refreshing data", () => apiCall("/api/store"))}
                title="Refresh store"
              >
                 <RefreshCw size={14} />
              </button>
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
