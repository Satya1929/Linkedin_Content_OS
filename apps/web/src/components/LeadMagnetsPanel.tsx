import { useState } from "react";
import type { StoreSnapshot } from "@/lib/types";

type Props = {
  snapshot: StoreSnapshot;
  run: (label: string, action: () => Promise<StoreSnapshot>) => Promise<void>;
};

export function LeadMagnetsPanel({ snapshot, run }: Props) {
  const [idea, setIdea] = useState("");
  const [ctaLink, setCtaLink] = useState("");

  async function generateLeadMagnet() {
    if (!idea) return;
    await run("Generating Lead Magnet Funnel", async () => {
      const response = await fetch("/api/lead-magnets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, ctaLink })
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      const newLM = await response.json();
      return {
        ...snapshot,
        leadMagnets: [newLM, ...snapshot.leadMagnets]
      };
    });
    setIdea("");
  }

  return (
    <aside className="learning-panel" style={{ marginTop: '20px' }}>
      <h2>Lead Magnet Pipeline</h2>
      <p className="eyebrow">Product Idea to PDF & Sequence</p>

      <div className="input-group">
        <label>
          <span>Product Idea or Topic</span>
          <input
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="e.g. 5-Layer Prompt Engineering Framework"
          />
        </label>
        <label>
          <span>CTA Link (Optional)</span>
          <input
            value={ctaLink}
            onChange={(e) => setCtaLink(e.target.value)}
            placeholder="https://example.com/download"
          />
        </label>
        <button className="primary" onClick={generateLeadMagnet} disabled={!idea}>
          Generate Funnel Strategy
        </button>
      </div>

      <div className="insight-feed">
        {snapshot.leadMagnets.length === 0 ? (
          <p className="empty-state">No lead magnets generated yet.</p>
        ) : (
          snapshot.leadMagnets.map((lm) => (
            <div key={lm.id} className="insight-card">
              <h4>{lm.productIdea}</h4>
              <div className="insight-section">
                <strong>PDF Guide Outline:</strong>
                <ul>
                  {lm.pdfOutline.map((item, idx) => (
                    <li key={idx} style={{ fontSize: '13px' }}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="insight-section">
                <strong>LinkedIn Sequence:</strong>
                <ul>
                  {lm.postSequence.map((item, idx) => (
                    <li key={idx} style={{ fontSize: '13px' }}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="insight-section">
                <strong>CTA Link:</strong> <a href={lm.ctaLink} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: 'var(--accent)' }}>{lm.ctaLink}</a>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
