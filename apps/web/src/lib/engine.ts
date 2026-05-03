import { buildSourceItems } from "./source";
import { buildBody, buildFingerprints, calculateSimilarity, scoreDraftParts } from "./scoring";
import { compactText, keywordSummary, titleCase } from "./text";
import type { CreateDraftInput, Draft, DraftLocks, StoreSnapshot } from "./types";
import { buildGenerationSystemPrompt, createOllamaProvider } from "./providers";
import { loadPromptBundle } from "./prompts";

const defaultLocks: DraftLocks = {
  hook: false,
  context: false,
  insight: false,
  takeaway: false,
  cta: false
};

function topicFromInput(rawText: string) {
  const keywords = keywordSummary(rawText, 4);
  if (keywords.length === 0) {
    return "AI builder workflows";
  }
  return titleCase(keywords.join(" "));
}

function buildDraftParts(rawText: string, sourceTitles: string[], variant = 0) {
  const topic = topicFromInput(`${rawText} ${sourceTitles.join(" ")}`);
  const context = compactText(
    rawText ||
      `A new source around ${topic} is worth turning into a practical builder lesson instead of treating it as another announcement.`,
    360
  );

  const hookVariants = [
    `Most AI posts miss the real signal in ${topic}.`,
    `${topic} is not just news. It is a workflow signal.`,
    `The practical lesson inside ${topic} is easy to miss.`
  ];

  return {
    hook: hookVariants[variant % hookVariants.length],
    context:
      sourceTitles.length > 0
        ? `${context}\n\nSource signal: ${sourceTitles.slice(0, 3).join("; ")}.`
        : context,
    insight:
      "The useful angle is not that another AI tool or paper exists. The signal is what it changes for builders: what becomes easier to prototype, what needs stronger evaluation, and what skill becomes more valuable in a real team.",
    takeaway:
      "When you see AI news, turn it into one decision rule: what would you build, test, automate, or stop doing differently this week?",
    cta:
      "I am documenting these AI builder patterns daily. If your team is exploring practical AI workflows, this is the kind of work I want to contribute to."
  };
}

function parseGeneratedParts(value: string) {
  try {
    const parsed = JSON.parse(value) as Partial<ReturnType<typeof buildDraftParts>>;
    if (parsed.hook && parsed.context && parsed.insight && parsed.takeaway) {
      return {
        hook: parsed.hook,
        context: parsed.context,
        insight: parsed.insight,
        takeaway: parsed.takeaway,
        cta: parsed.cta
      };
    }
  } catch {
    const jsonMatch = value.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Partial<ReturnType<typeof buildDraftParts>>;
        if (parsed.hook && parsed.context && parsed.insight && parsed.takeaway) {
          return {
            hook: parsed.hook,
            context: parsed.context,
            insight: parsed.insight,
            takeaway: parsed.takeaway,
            cta: parsed.cta
          };
        }
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

async function buildDraftPartsWithProvider(rawText: string, sourceTitles: string[]) {
  const fallback = buildDraftParts(rawText, sourceTitles);
  const provider = createOllamaProvider();

  if (!(await provider.available())) {
    return fallback;
  }

  try {
    const bundle = await loadPromptBundle();
    const generated = await provider.generateText({
      system: buildGenerationSystemPrompt(bundle),
      prompt: [
        "Create one LinkedIn post draft as strict JSON with keys: hook, context, insight, takeaway, cta.",
        "The post must position the creator as a practical AI builder and technical educator.",
        `Raw context:\n${rawText}`,
        sourceTitles.length ? `Source titles:\n${sourceTitles.join("\n")}` : ""
      ].join("\n\n"),
      temperature: 0.35
    });
    return parseGeneratedParts(generated) ?? fallback;
  } catch {
    return fallback;
  }
}

function buildImagePrompt(topic: string) {
  return [
    `Create a clean LinkedIn visual explaining "${topic}" as a practical AI builder workflow.`,
    "Use a high-contrast diagram style, one central idea, minimal text, and a clear before-to-after flow.",
    "Avoid stock photography, hype language, and tiny unreadable labels."
  ].join(" ");
}

function buildCarousel(topic: string) {
  return [
    {
      title: `${topic}: the hidden builder signal`,
      body: "Open with the practical change, not the announcement."
    },
    {
      title: "What changed",
      body: "Name the capability, workflow, or constraint that shifted."
    },
    {
      title: "Why developers should care",
      body: "Connect it to prototyping, evaluation, automation, or product quality."
    },
    {
      title: "What to test next",
      body: "Turn the idea into a small experiment or decision rule."
    },
    {
      title: "Career signal",
      body: "Show how understanding this makes you more useful on AI teams."
    }
  ];
}

export async function createDraft(input: CreateDraftInput, snapshot: StoreSnapshot): Promise<Draft> {
  const sources = input.sourceItems?.length ? input.sourceItems : await buildSourceItems(input.rawText, input.sourceLinks);
  const sourceTitles = sources.filter((source) => source.sourceType !== "raw-context").map((source) => source.title);
  const parts = await buildDraftPartsWithProvider(input.rawText, sourceTitles);
  const body = buildBody(parts);
  const qualityScore = scoreDraftParts(parts);
  const similarity = calculateSimilarity(body, snapshot.drafts);
  const fingerprints = buildFingerprints(parts);
  const topic = topicFromInput(`${input.rawText} ${sourceTitles.join(" ")}`);
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    workspaceId: snapshot.workspace.id,
    creatorProfileId: snapshot.creatorProfile.id,
    status: "generated",
    format: input.format,
    ...parts,
    body,
    imagePrompt: input.format === "image" || input.format === "mixed" ? buildImagePrompt(topic) : undefined,
    carouselOutline: input.format === "carousel" || input.format === "mixed" ? buildCarousel(topic) : [],
    sources,
    qualityScore,
    similarity,
    ...fingerprints,
    locks: defaultLocks,
    createdAt: now,
    updatedAt: now
  };
}

export function regenerateDraftText(draft: Draft, snapshot: StoreSnapshot) {
  const rawText = draft.sources.map((source) => source.rawText || source.summary || source.title).join("\n");
  const variant = Math.max(1, snapshot.drafts.filter((item) => item.id === draft.id).length + 1);
  const nextParts = buildDraftParts(rawText, draft.sources.map((source) => source.title), variant);
  const merged = {
    hook: draft.locks.hook ? draft.hook : nextParts.hook,
    context: draft.locks.context ? draft.context : nextParts.context,
    insight: draft.locks.insight ? draft.insight : nextParts.insight,
    takeaway: draft.locks.takeaway ? draft.takeaway : nextParts.takeaway,
    cta: draft.locks.cta ? draft.cta : nextParts.cta
  };
  const body = buildBody(merged);
  return {
    ...draft,
    ...merged,
    body,
    qualityScore: scoreDraftParts(merged),
    similarity: calculateSimilarity(body, snapshot.drafts.filter((item) => item.id !== draft.id)),
    ...buildFingerprints(merged),
    status: "edited" as const,
    updatedAt: new Date().toISOString()
  };
}

export function regenerateImagePrompt(draft: Draft) {
  const topic = topicFromInput(`${draft.context} ${draft.insight}`);
  return {
    ...draft,
    imagePrompt: buildImagePrompt(topic),
    carouselOutline: draft.carouselOutline.length > 0 ? draft.carouselOutline : buildCarousel(topic),
    updatedAt: new Date().toISOString()
  };
}
