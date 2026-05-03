import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultSnapshot } from "./default-data";
import { loadPromptRuleSets } from "./prompts";
import type { Draft, DraftPatch, MetricsSnapshot, PerformanceInsight, PromptRuleChange, StoreSnapshot } from "./types";

function composeDraftBody(draft: Draft, patch: DraftPatch) {
  const cta = patch.cta ?? draft.cta;
  return [
    patch.hook ?? draft.hook,
    "",
    patch.context ?? draft.context,
    "",
    patch.insight ?? draft.insight,
    "",
    `Takeaway: ${patch.takeaway ?? draft.takeaway}`,
    cta ? `\n${cta}` : ""
  ]
    .join("\n")
    .trim();
}

function dataDir() {
  const configured = process.env.CONTENT_ENGINE_DATA_DIR;
  if (configured) {
    return path.resolve(process.cwd(), configured);
  }

  if (process.cwd().endsWith(path.join("apps", "web"))) {
    return path.resolve(process.cwd(), "../../data");
  }

  return path.resolve(process.cwd(), "data");
}

function storePath() {
  return path.join(dataDir(), "local-store.json");
}

async function ensureStore(): Promise<StoreSnapshot> {
  try {
    const raw = await readFile(storePath(), "utf8");
    const snapshot = JSON.parse(raw) as StoreSnapshot;
    if (!snapshot.promptRuleSets?.length) {
      snapshot.promptRuleSets = await loadPromptRuleSets();
      await saveStoreSnapshot(snapshot);
    }
    return snapshot;
  } catch {
    const snapshot = {
      ...defaultSnapshot,
      promptRuleSets: await loadPromptRuleSets()
    };
    await saveStoreSnapshot(snapshot);
    return snapshot;
  }
}

export async function getStoreSnapshot() {
  return ensureStore();
}

export async function saveStoreSnapshot(snapshot: StoreSnapshot) {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(storePath(), JSON.stringify(snapshot, null, 2), "utf8");
}

export async function addDraft(draft: Draft) {
  const snapshot = await ensureStore();
  snapshot.drafts = [draft, ...snapshot.drafts];
  for (const source of draft.sources) {
    if (!snapshot.sourceItems.some((item) => item.id === source.id)) {
      snapshot.sourceItems.unshift(source);
    }
  }
  await saveStoreSnapshot(snapshot);
  return snapshot;
}

export async function patchDraft(id: string, patch: DraftPatch) {
  const snapshot = await ensureStore();
  snapshot.drafts = snapshot.drafts.map((draft) =>
    draft.id === id
      ? {
          ...draft,
          ...patch,
          body: composeDraftBody(draft, patch),
          status: draft.status === "generated" ? "edited" : draft.status,
          updatedAt: new Date().toISOString()
        }
      : draft
  );
  await saveStoreSnapshot(snapshot);
  return snapshot;
}

export async function updateDraft(id: string, updater: (draft: Draft, snapshot: StoreSnapshot) => Draft) {
  const snapshot = await ensureStore();
  snapshot.drafts = snapshot.drafts.map((draft) => (draft.id === id ? updater(draft, snapshot) : draft));
  await saveStoreSnapshot(snapshot);
  return snapshot;
}

export async function addMetricsAndInsights(metrics: MetricsSnapshot[], insights: PerformanceInsight[]) {
  const snapshot = await ensureStore();
  snapshot.metrics = [...metrics, ...snapshot.metrics];
  snapshot.insights = [...insights, ...snapshot.insights];
  await saveStoreSnapshot(snapshot);
  return snapshot;
}

export async function updateInsight(id: string, status: "approved" | "rejected", edited?: Partial<PerformanceInsight>) {
  const snapshot = await ensureStore();
  let approvedInsight: PerformanceInsight | undefined;

  snapshot.insights = snapshot.insights.map((insight) => {
    if (insight.id !== id) {
      return insight;
    }
    approvedInsight = {
      ...insight,
      ...edited,
      status
    };
    return approvedInsight;
  });

  if (status === "approved" && approvedInsight) {
    const activeRuleset = snapshot.promptRuleSets.find((ruleset) => ruleset.name === "Content Agent Rules" && ruleset.active) ?? snapshot.promptRuleSets[0];
    const change: PromptRuleChange = {
      id: crypto.randomUUID(),
      promptRuleSetId: activeRuleset.id,
      observation: approvedInsight.observation,
      reason: approvedInsight.reason,
      improvement: approvedInsight.improvement,
      status: "approved",
      createdAt: new Date().toISOString()
    };
    snapshot.promptRuleChanges = [change, ...snapshot.promptRuleChanges];
  }

  await saveStoreSnapshot(snapshot);
  return snapshot;
}
