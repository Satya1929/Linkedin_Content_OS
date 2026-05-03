import type { Draft, MetricsSnapshot, PerformanceInsight } from "./types";

function splitCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function numberFrom(value: string | undefined) {
  const parsed = Number((value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function parseAnalyticsCsv(csv: string): MetricsSnapshot[] {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, "_"));

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    return {
      id: crypto.randomUUID(),
      draftId: row.draft_id || row.post_id || undefined,
      capturedAt: new Date().toISOString(),
      publishedAt: row.published_at || row.date || undefined,
      impressions: numberFrom(row.impressions),
      likes: numberFrom(row.likes),
      comments: numberFrom(row.comments),
      reposts: numberFrom(row.reposts || row.shares),
      profileViews: numberFrom(row.profile_views),
      raw: row
    };
  });
}

export function generatePerformanceInsights(metrics: MetricsSnapshot[], drafts: Draft[]): PerformanceInsight[] {
  if (metrics.length === 0) {
    return [];
  }

  const scored = metrics.map((metric) => ({
    metric,
    score: metric.impressions + metric.likes * 12 + metric.comments * 24 + metric.reposts * 18 + metric.profileViews * 10,
    draft: drafts.find((draft) => draft.id === metric.draftId)
  }));

  const average = scored.reduce((sum, item) => sum + item.score, 0) / scored.length;
  const top = scored.filter((item) => item.score >= average).sort((a, b) => b.score - a.score)[0];
  const low = scored.filter((item) => item.score < average).sort((a, b) => a.score - b.score)[0];
  const insights: PerformanceInsight[] = [];

  if (top) {
    insights.push({
      id: crypto.randomUUID(),
      observation: top.draft ? `Top post used the angle: "${top.draft.hook}"` : "A top performer had stronger engagement than the weekly average.",
      reason:
        "High engagement usually means the hook created curiosity and the takeaway felt useful enough for readers to react or comment.",
      improvement:
        "Preserve the winning pattern by generating one future draft with a similar hook mechanism but a different topic and example.",
      status: "proposed",
      createdAt: new Date().toISOString()
    });
  }

  if (low) {
    insights.push({
      id: crypto.randomUUID(),
      observation: low.draft ? `Lower performer may have had a weaker concrete payoff: "${low.draft.hook}"` : "A lower performer lagged behind the weekly average.",
      reason:
        "Low engagement often means the post sounded informational but did not give readers a clear reason to save, comment, or apply the idea.",
      improvement:
        "Require the takeaway to include one concrete action, tool, workflow, or decision rule before approval.",
      status: "proposed",
      createdAt: new Date().toISOString()
    });
  }

  insights.push({
    id: crypto.randomUUID(),
    observation: "Weekly learning should update rules only after manual approval.",
    reason: "Automatic prompt mutation can drift away from your real voice and overfit to a small sample.",
    improvement: "Keep insights as proposed rule changes and approve only the ones that match your positioning.",
    status: "proposed",
    createdAt: new Date().toISOString()
  });

  return insights;
}
