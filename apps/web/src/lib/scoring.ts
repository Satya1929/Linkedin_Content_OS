import type { Draft, QualityScore, SimilarityReport } from "./types";
import { compactText, fingerprint, keywordSummary, normalizeText, tokenize } from "./text";

const genericPhrases = [
  "ai is changing everything",
  "game changer",
  "future is here",
  "revolutionizing",
  "unlock your potential",
  "in today's fast-paced world",
  "leverage ai"
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasActionVerb(value: string) {
  return /\b(build|test|compare|ship|learn|use|avoid|measure|start|try|watch|document|automate|debug)\b/i.test(value);
}

function specificityScore(value: string) {
  let score = 45;
  if (/\b(api|model|agent|workflow|repo|paper|prompt|embedding|eval|developer|github|local|ollama|linkedin)\b/i.test(value)) {
    score += 25;
  }
  if (/\d/.test(value)) {
    score += 10;
  }
  if (value.length > 180) {
    score += 10;
  }
  return clampScore(score);
}

export function scoreDraftParts(parts: {
  hook: string;
  context: string;
  insight: string;
  takeaway: string;
}): QualityScore {
  const allText = `${parts.hook} ${parts.context} ${parts.insight} ${parts.takeaway}`;
  const notes: string[] = [];

  const hookLength = parts.hook.trim().length;
  const hookStrength = clampScore(35 + (hookLength > 35 ? 25 : 0) + (/[?:]/.test(parts.hook) ? 10 : 0) + (/\bmiss|wrong|signal|pattern|cost|risk|builder|developer\b/i.test(parts.hook) ? 20 : 0));
  const insightClarity = clampScore(40 + (/\bbecause|means|signal|matters|shows|changes\b/i.test(parts.insight) ? 30 : 0) + (parts.insight.length > 120 ? 15 : 0));
  const specificity = specificityScore(allText);
  const actionability = clampScore(40 + (hasActionVerb(parts.takeaway) ? 35 : 0) + (parts.takeaway.length > 80 ? 10 : 0));
  const genericHits = genericPhrases.filter((phrase) => normalizeText(allText).includes(phrase));
  const nonGeneric = clampScore(85 - genericHits.length * 22 + keywordSummary(allText, 8).length);

  if (hookStrength < 65) notes.push("Hook can be sharper or more curiosity driven.");
  if (insightClarity < 65) notes.push("Insight should explain why the topic matters.");
  if (specificity < 65) notes.push("Add concrete AI/dev details or examples.");
  if (actionability < 65) notes.push("Takeaway should give the reader a clear next action.");
  if (genericHits.length > 0) notes.push(`Avoid generic phrase: ${genericHits[0]}.`);

  const overall = clampScore((hookStrength + insightClarity + specificity + actionability + nonGeneric) / 5);

  return {
    overall,
    hookStrength,
    insightClarity,
    specificity,
    actionability,
    nonGeneric,
    notes
  };
}

function jaccard(a: string[], b: string[]) {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

export function calculateSimilarity(candidateText: string, existingDrafts: Draft[]): SimilarityReport {
  const candidateTokens = tokenize(candidateText);
  let nearestDraftId: string | undefined;
  let score = 0;

  for (const draft of existingDrafts.filter((item) => ["approved", "scheduled", "posted", "measured"].includes(item.status))) {
    const draftScore = jaccard(candidateTokens, tokenize(draft.body));
    if (draftScore > score) {
      score = draftScore;
      nearestDraftId = draft.id;
    }
  }

  const rounded = Number(score.toFixed(2));
  return {
    score: rounded,
    warning: rounded >= 0.5,
    nearestDraftId,
    reason:
      rounded >= 0.5
        ? "This overlaps strongly with a prior approved or scheduled post."
        : "No strong repetition against approved or scheduled posts."
  };
}

export function buildFingerprints(parts: { context: string; insight: string; takeaway: string }) {
  return {
    topicFingerprint: fingerprint(parts.context, 8),
    angleFingerprint: fingerprint(`${parts.insight} ${parts.takeaway}`, 8)
  };
}

export function buildBody(parts: {
  hook: string;
  context: string;
  insight: string;
  takeaway: string;
  cta?: string;
}) {
  return [parts.hook, "", parts.context, "", parts.insight, "", `Takeaway: ${parts.takeaway}`, parts.cta ? `\n${parts.cta}` : ""]
    .join("\n")
    .trim();
}

export function summarizeForPreview(value: string) {
  return compactText(value, 140);
}
