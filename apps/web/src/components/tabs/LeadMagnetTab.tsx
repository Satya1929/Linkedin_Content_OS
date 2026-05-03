"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { StoreSnapshot } from "@/lib/types";

type Props = {
  snapshot: StoreSnapshot;
  run: (label: string, action: () => Promise<StoreSnapshot>) => Promise<void>;
  busy: string;
};

export function LeadMagnetTab({ snapshot, run, busy }: Props) {
  const [idea, setIdea] = useState("");
  const [ctaLink, setCtaLink] = useState("");

  async function generate() {
    if (!idea.trim()) return;
    await run("Generating lead magnet", async () => {
      const response = await fetch("/api/lead-magnets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, ctaLink })
      });
      if (!response.ok) throw new Error(await response.text());
      const newLM = await response.json();
      setIdea(""); setCtaLink("");
      return { ...snapshot, leadMagnets: [newLM, ...snapshot.leadMagnets] };
    });
  }

  return (
    <div>
      <p className="section-title">Lead Magnet Pipeline</p>
      <p className="section-subtitle">Turn a content idea into a PDF guide outline and a 3-post promotional LinkedIn sequence.</p>

      <div className="two-col" style={{ gap: 24, alignItems: "flex-start" }}>
        <div className="card">
          <div className="card-title">Generate Funnel</div>
          <label className="form-label">
            Product idea or topic
            <input className="form-input" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="e.g. 5-Layer Prompt Engineering Checklist" />
          </label>
          <label className="form-label">
            Download / CTA link (optional)
            <input className="form-input" value={ctaLink} onChange={(e) => setCtaLink(e.target.value)} placeholder="https://your-site.com/download" />
          </label>
          <button className="btn btn-primary" onClick={generate} disabled={!idea.trim() || Boolean(busy)} style={{ width: "100%" }}>
            <Sparkles size={16} /> Generate Strategy
          </button>
        </div>

        <div>
          {snapshot.leadMagnets.length === 0 ? (
            <div className="empty-state" style={{ minHeight: 260 }}>
              <Sparkles size={36} />
              <p>Generate a lead magnet funnel and it will appear here.</p>
            </div>
          ) : (
            snapshot.leadMagnets.map((lm) => (
              <div key={lm.id} className="lm-card">
                <div className="lm-card-title">{lm.productIdea}</div>
                <div style={{ marginBottom: 16 }}>
                  <div className="lm-section-title">PDF Guide Outline</div>
                  <ul className="lm-list">
                    {lm.pdfOutline.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div className="lm-section-title">LinkedIn Post Sequence</div>
                  <ul className="lm-list">
                    {lm.postSequence.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
                {lm.ctaLink && (
                  <div>
                    <div className="lm-section-title">CTA Link</div>
                    <a href={lm.ctaLink} target="_blank" rel="noreferrer" style={{ color: "var(--accent-strong)", fontSize: 13 }}>{lm.ctaLink}</a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
