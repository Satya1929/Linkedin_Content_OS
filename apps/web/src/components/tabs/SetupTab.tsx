"use client";

import { Check, AlertTriangle, Link2, Cpu, Key } from "lucide-react";
import type { StoreSnapshot } from "@/lib/types";

type Props = { snapshot: StoreSnapshot; isLinkedInConnected: boolean };

type SetupItem = {
  icon: React.ReactNode;
  iconClass: string;
  title: string;
  description: string;
  status: "ok" | "missing";
  statusLabel: string;
  actionLabel?: string;
  actionHref?: string;
  envKey?: string;
};

export function SetupTab({ snapshot, isLinkedInConnected }: Props) {
  const activeProfile = snapshot.creatorProfiles.find((p) => p.id === snapshot.activeProfileId) ?? snapshot.creatorProfiles[0];

  const items: SetupItem[] = [
    {
      icon: <Link2 size={20} />,
      iconClass: "blue",
      title: "LinkedIn OAuth",
      description:
        "Required to publish posts directly and sync analytics. Create a LinkedIn Developer App at developer.linkedin.com, then add the following to your .env file:\n\nLINKEDIN_CLIENT_ID=your_client_id\nLINKEDIN_CLIENT_SECRET=your_client_secret\nLINKEDIN_REDIRECT_URI=http://localhost:3001/api/linkedin/oauth/callback",
      status: isLinkedInConnected ? "ok" : "missing",
      statusLabel: isLinkedInConnected ? "Connected" : "Not connected",
      actionLabel: isLinkedInConnected ? undefined : "Connect LinkedIn →",
      actionHref: "/api/linkedin/oauth/start",
      envKey: "LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET"
    },
    {
      icon: <Cpu size={20} />,
      iconClass: "green",
      title: "Ollama Local AI Model",
      description:
        "Required for AI-powered draft generation, insight extraction, and lead magnet strategies. Install Ollama from ollama.ai, then pull a model:\n\nollama pull llama3\n\nThen add to your .env:\nOLLAMA_HOST=http://localhost:11434\nOLLAMA_MODEL=llama3\n\nWithout this, the engine uses built-in rule-based generation (still functional).",
      status: "missing", // runtime check would require an API call
      statusLabel: "Check manually",
      envKey: "OLLAMA_HOST + OLLAMA_MODEL"
    },
    {
      icon: <Key size={20} />,
      iconClass: "warn",
      title: "Google / OpenAI API (optional)",
      description:
        "These are optional cloud fallback providers. If you have an API key, you can add it to your .env to enable cloud-powered generation when Ollama is unavailable:\n\nGOOGLE_AI_API_KEY=your_key\n# OR\nOPENAI_API_KEY=your_key\n\nCurrently disabled by default. The engine runs fully local without these.",
      status: "missing",
      statusLabel: "Optional — not configured",
      envKey: "GOOGLE_AI_API_KEY or OPENAI_API_KEY"
    }
  ];

  return (
    <div className="setup-page">
      <p className="section-title">Setup & Configuration</p>
      <p className="section-subtitle">
        Configure the services below to unlock all features. Edit the <code style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>.env</code> file in the project root, then restart the dev server.
      </p>

      {items.map((item) => (
        <div key={item.title} className="setup-item">
          <div className={`setup-icon ${item.iconClass}`}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div className="setup-item-title">{item.title}</div>
              <span className={`setup-item-status ${item.status}`}>
                {item.status === "ok" ? <Check size={12} /> : <AlertTriangle size={12} />}
                {item.statusLabel}
              </span>
            </div>
            <div className="setup-item-desc" style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font)" }}>
              {item.description}
            </div>
            {item.envKey && (
              <code style={{ display: "block", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "var(--accent-strong)", marginBottom: 10 }}>
                {item.envKey}
              </code>
            )}
            {item.actionHref && item.status !== "ok" && (
              <a href={item.actionHref}>
                <button className="btn btn-primary">{item.actionLabel}</button>
              </a>
            )}
          </div>
        </div>
      ))}

      {/* Profile info */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-title">Active Creator Profile</div>
        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--ink-3)", width: 120 }}>Name</span><span>{activeProfile?.name}</span></div>
          <div style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--ink-3)", width: 120 }}>Timezone</span><span>{activeProfile?.timezone}</span></div>
          <div style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--ink-3)", width: 120 }}>Post time</span><span>{activeProfile?.defaultPostTime ?? "10:30"}</span></div>
          <div style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--ink-3)", width: 120 }}>Workspace</span><span>{snapshot.workspaces.find((w) => w.id === snapshot.activeWorkspaceId)?.name}</span></div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ color: "var(--ink-3)", width: 120 }}>LinkedIn URN</span>
            {activeProfile?.linkedinUrn ? (
              <span className="pill green" style={{ fontSize: 11 }}>{activeProfile.linkedinUrn}</span>
            ) : (
              <span className="pill warn" style={{ fontSize: 11 }}>Missing (Reconnect needed)</span>
            )}
          </div>
        </div>
      </div>

      {/* Prompt rules */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Prompt Rules Health</div>
        <div style={{ fontSize: 13, display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-2)" }}>Active rule sets</span>
            <span>{snapshot.promptRuleSets.length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-2)" }}>Applied rule changes</span>
            <span>{snapshot.promptRuleChanges.filter((c) => c.status === "approved").length}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--ink-2)" }}>Total drafts generated</span>
            <span>{snapshot.drafts.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
