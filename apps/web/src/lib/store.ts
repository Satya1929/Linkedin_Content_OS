/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "./prisma";
import type { Draft, DraftPatch, MetricsSnapshot, PerformanceInsight, StoreSnapshot, SourceItem } from "./types";
import { loadPromptRuleSets } from "./prompts";

export async function getStoreSnapshot(): Promise<StoreSnapshot> {
  // Try to find the active workspace and profile
  let workspace = await prisma.workspace.findFirst({
    include: {
      profiles: true
    }
  });

  // Ensure default entities if none exist
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: "Personal Workspace",
        profiles: {
          create: {
            name: "Default Profile",
            positioning: "Content Creator"
          }
        }
      },
      include: {
        profiles: true
      }
    });
  }

  const profile = workspace.profiles[0];

  const dbDrafts = await prisma.draft.findMany({
    where: { workspaceId: workspace.id },
    include: { sources: { include: { sourceItem: true } } },
    orderBy: { createdAt: "desc" }
  });

  const drafts: Draft[] = dbDrafts.map((d) => ({
    id: d.id,
    workspaceId: d.workspaceId,
    creatorProfileId: d.creatorProfileId,
    status: d.status.toLowerCase() as any,
    format: d.format.toLowerCase() as any,
    hook: d.hook,
    context: d.context,
    insight: d.insight,
    takeaway: d.takeaway,
    cta: d.cta || undefined,
    body: d.body,
    imagePrompt: d.imagePrompt || undefined,
    visualConcepts: (d.visualConcepts as any) || [],
    carouselOutline: (d.carouselOutline as any) || [],
    qualityScore: {
      overall: d.qualityScore,
      hookStrength: 0,
      insightClarity: 0,
      specificity: 0,
      actionability: 0,
      nonGeneric: 0,
      notes: []
    },
    similarity: { score: d.similarityScore, warning: d.similarityWarning, reason: "" },
    topicFingerprint: d.topicFingerprint,
    angleFingerprint: d.angleFingerprint,
    locks: (d.locks as any) || { hook: false, context: false, insight: false, takeaway: false, cta: false },
    scheduledAt: d.scheduledAt?.toISOString(),
    qstashMessageId: d.qstashMessageId || undefined,
    postedAt: d.postedAt?.toISOString(),
    linkedinPostUrn: d.linkedinPostUrn || undefined,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    sources: d.sources.map(s => ({
      id: s.sourceItem.id,
      url: s.sourceItem.url || undefined,
      title: s.sourceItem.title,
      summary: s.sourceItem.summary || undefined,
      sourceType: s.sourceItem.sourceType as any,
      rawText: s.sourceItem.rawText || undefined,
      publishedAt: s.sourceItem.publishedAt?.toISOString(),
      createdAt: s.sourceItem.createdAt.toISOString()
    }))
  }));

  const dbSourceItems = await prisma.sourceItem.findMany({
    orderBy: { createdAt: "desc" }
  });

  const sourceItems: SourceItem[] = dbSourceItems.map((s) => ({
    id: s.id,
    url: s.url || undefined,
    title: s.title,
    summary: s.summary || undefined,
    sourceType: s.sourceType as any,
    rawText: s.rawText || undefined,
    publishedAt: s.publishedAt?.toISOString(),
    createdAt: s.createdAt.toISOString()
  }));

  const dbInsights = await prisma.performanceInsight.findMany({
    orderBy: { createdAt: "desc" }
  });

  const insights: PerformanceInsight[] = dbInsights.map((i) => ({
    ...i,
    status: i.status.toLowerCase() as any,
    createdAt: i.createdAt.toISOString()
  }));

  const dbMetrics = await prisma.metricsSnapshot.findMany({
    orderBy: { capturedAt: "desc" }
  });

  const metrics: MetricsSnapshot[] = dbMetrics.map((m) => ({
    id: m.id,
    draftId: m.draftId || undefined,
    capturedAt: m.capturedAt.toISOString(),
    publishedAt: m.publishedAt?.toISOString(),
    impressions: m.impressions,
    likes: m.likes,
    comments: m.comments,
    reposts: m.reposts,
    profileViews: m.profileViews,
    raw: m.raw as any || {}
  }));

  let dbRuleSets = await prisma.promptRuleSet.findMany({
    include: { changes: true },
    orderBy: { createdAt: "desc" }
  });

  if (dbRuleSets.length === 0) {
    const defaultRuleSets = await loadPromptRuleSets();
    for (const rs of defaultRuleSets) {
      await prisma.promptRuleSet.create({
        data: {
          name: rs.name,
          version: rs.version,
          content: rs.content,
          active: rs.active
        }
      });
    }
    dbRuleSets = await prisma.promptRuleSet.findMany({
      include: { changes: true },
      orderBy: { createdAt: "desc" }
    });
  }

  const promptRuleSets = dbRuleSets.map((rs) => ({
    id: rs.id,
    name: rs.name,
    version: rs.version,
    content: rs.content,
    active: rs.active,
    createdAt: rs.createdAt.toISOString()
  }));

  const promptRuleChanges = dbRuleSets.flatMap((rs) =>
    rs.changes.map((c) => ({
      id: c.id,
      promptRuleSetId: c.promptRuleSetId,
      observation: c.observation,
      reason: c.reason,
      improvement: c.improvement,
      status: c.status.toLowerCase() as any,
      createdAt: c.createdAt.toISOString()
    }))
  );

  const dbLeadMagnets = await prisma.leadMagnet.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" }
  });

  const leadMagnets = dbLeadMagnets.map((lm) => ({
    id: lm.id,
    workspaceId: lm.workspaceId,
    productIdea: lm.productIdea,
    pdfOutline: lm.pdfOutline as any,
    postSequence: lm.postSequence as any,
    ctaLink: lm.ctaLink,
    conversionNotes: lm.conversionNotes || undefined,
    createdAt: lm.createdAt.toISOString(),
    updatedAt: lm.updatedAt.toISOString()
  }));

  return {
    activeWorkspaceId: workspace.id,
    activeProfileId: profile.id,
    workspaces: [{ ...workspace, createdAt: workspace.createdAt.toISOString(), billing: workspace.billing as any }],
    creatorProfiles: [{
      ...profile,
      linkedinUrn: profile.linkedinUrn || undefined,
      linkedinAccessToken: profile.linkedinAccessToken || undefined,
      linkedinRefreshToken: profile.linkedinRefreshToken || undefined,
      linkedinExpiresAt: profile.linkedinExpiresAt?.toISOString()
    }],
    drafts,
    sourceItems,
    metrics,
    insights,
    promptRuleSets,
    promptRuleChanges,
    leadMagnets
  };
}

export async function saveStoreSnapshot(snapshot: StoreSnapshot) {
  // Update creator profiles (primarily for LinkedIn token persistence)
  for (const profile of snapshot.creatorProfiles) {
    await prisma.creatorProfile.update({
      where: { id: profile.id },
      data: {
        linkedinUrn: profile.linkedinUrn || null,
        linkedinAccessToken: profile.linkedinAccessToken || null,
        linkedinRefreshToken: profile.linkedinRefreshToken || null,
        linkedinExpiresAt: profile.linkedinExpiresAt ? new Date(profile.linkedinExpiresAt) : null
      }
    });
  }

  // Update draft statuses (for cron publish updates)
  for (const draft of snapshot.drafts) {
    try {
      await prisma.draft.update({
        where: { id: draft.id },
        data: {
          status: draft.status.toUpperCase() as any,
          postedAt: draft.postedAt ? new Date(draft.postedAt) : null,
          linkedinPostUrn: draft.linkedinPostUrn || null,
          qstashMessageId: draft.qstashMessageId || null,
          updatedAt: draft.updatedAt ? new Date(draft.updatedAt) : new Date()
        }
      });
    } catch (e) {
      console.error(`[Store] Failed to update draft ${draft.id}:`, e);
    }
  }
}

export async function deleteDraft(id: string) {
  // Delete related DraftSource records first (FK constraint)
  await prisma.draftSource.deleteMany({ where: { draftId: id } });
  // Delete related DraftAsset records
  await prisma.draftAsset.deleteMany({ where: { draftId: id } });
  // Delete related MetricsSnapshot records
  await prisma.metricsSnapshot.updateMany({ where: { draftId: id }, data: { draftId: null } });
  // Delete the draft itself
  await prisma.draft.delete({ where: { id } });
  return getStoreSnapshot();
}

export async function addLeadMagnet(leadMagnet: {
  id: string;
  workspaceId: string;
  productIdea: string;
  pdfOutline: any;
  postSequence: any;
  ctaLink: string;
  conversionNotes?: string;
}) {
  await prisma.leadMagnet.create({
    data: {
      id: leadMagnet.id,
      workspaceId: leadMagnet.workspaceId,
      productIdea: leadMagnet.productIdea,
      pdfOutline: leadMagnet.pdfOutline,
      postSequence: leadMagnet.postSequence,
      ctaLink: leadMagnet.ctaLink,
      conversionNotes: leadMagnet.conversionNotes
    }
  });
  return getStoreSnapshot();
}

export async function addDraft(draft: Draft) {
  await prisma.draft.create({
    data: {
      id: draft.id,
      workspaceId: draft.workspaceId,
      creatorProfileId: draft.creatorProfileId,
      status: draft.status.toUpperCase() as any,
      format: draft.format.toUpperCase() as any,
      hook: draft.hook,
      context: draft.context,
      insight: draft.insight,
      takeaway: draft.takeaway,
      cta: draft.cta,
      body: draft.body,
      imagePrompt: draft.imagePrompt,
      visualConcepts: draft.visualConcepts as any,
      carouselOutline: draft.carouselOutline as any,
      qualityScore: draft.qualityScore.overall,
      similarityScore: draft.similarity.score,
      similarityWarning: draft.similarity.warning,
      topicFingerprint: draft.topicFingerprint,
      angleFingerprint: draft.angleFingerprint,
      locks: draft.locks as any,
      sources: {
        create: draft.sources.map(s => ({
          sourceItem: {
            connectOrCreate: {
              where: { id: s.id },
              create: {
                id: s.id,
                url: s.url,
                title: s.title,
                summary: s.summary,
                sourceType: s.sourceType,
                rawText: s.rawText
              }
            }
          }
        }))
      }
    }
  });
  return getStoreSnapshot();
}

export async function addSourceItems(sourceItems: SourceItem[]) {
  for (const s of sourceItems) {
    await prisma.sourceItem.upsert({
      where: { id: s.id },
      update: {
        url: s.url,
        title: s.title,
        summary: s.summary,
        sourceType: s.sourceType,
        rawText: s.rawText
      },
      create: {
        id: s.id,
        url: s.url,
        title: s.title,
        summary: s.summary,
        sourceType: s.sourceType,
        rawText: s.rawText
      }
    });
  }
  return getStoreSnapshot();
}

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

export async function patchDraft(id: string, patch: DraftPatch) {
  const current = await prisma.draft.findUnique({ where: { id } });
  if (!current) throw new Error("Draft not found");
  
  const status = current.status === "GENERATED" ? "EDITED" : current.status;
  const mergedDraft = { ...current, ...patch } as any; // simplified for composeDraftBody
  
  const updateData: any = {
    body: composeDraftBody(mergedDraft, patch),
    status,
  };
  
  if (patch.hook !== undefined) updateData.hook = patch.hook;
  if (patch.context !== undefined) updateData.context = patch.context;
  if (patch.insight !== undefined) updateData.insight = patch.insight;
  if (patch.takeaway !== undefined) updateData.takeaway = patch.takeaway;
  if (patch.cta !== undefined) updateData.cta = patch.cta;
  if (patch.imagePrompt !== undefined) updateData.imagePrompt = patch.imagePrompt;
  if (patch.locks !== undefined) updateData.locks = patch.locks as any;
  if (patch.carouselOutline !== undefined) updateData.carouselOutline = patch.carouselOutline as any;
  if (patch.format !== undefined) updateData.format = patch.format.toUpperCase() as any;

  await prisma.draft.update({
    where: { id },
    data: updateData
  });
  return getStoreSnapshot();
}

export async function updateDraft(id: string, updater: (draft: Draft, snapshot: StoreSnapshot) => Draft | Promise<Draft>) {
  const snapshot = await getStoreSnapshot();
  const existingDraft = snapshot.drafts.find((d) => d.id === id);
  if (!existingDraft) throw new Error("Draft not found");

  const updated = await updater(existingDraft, snapshot);

  await prisma.draft.update({
    where: { id },
    data: {
      status: updated.status.toUpperCase() as any,
      format: updated.format.toUpperCase() as any,
      hook: updated.hook,
      context: updated.context,
      insight: updated.insight,
      takeaway: updated.takeaway,
      cta: updated.cta,
      body: updated.body,
      imagePrompt: updated.imagePrompt,
      visualConcepts: updated.visualConcepts as any,
      carouselOutline: updated.carouselOutline as any,
      qualityScore: updated.qualityScore.overall,
      similarityScore: updated.similarity.score,
      similarityWarning: updated.similarity.warning,
      topicFingerprint: updated.topicFingerprint,
      angleFingerprint: updated.angleFingerprint,
      locks: updated.locks as any,
      scheduledAt: updated.scheduledAt ? new Date(updated.scheduledAt) : null,
      qstashMessageId: updated.qstashMessageId,
      postedAt: updated.postedAt ? new Date(updated.postedAt) : null,
      linkedinPostUrn: updated.linkedinPostUrn
    }
  });

  return getStoreSnapshot();
}

export async function addMetricsAndInsights(metrics: MetricsSnapshot[], insights: PerformanceInsight[]) {
  if (metrics.length > 0) {
    await prisma.metricsSnapshot.createMany({
      data: metrics.map((m) => ({
        id: m.id,
        draftId: m.draftId,
        impressions: m.impressions,
        likes: m.likes,
        comments: m.comments,
        reposts: m.reposts,
        profileViews: m.profileViews,
        raw: m.raw as any
      }))
    });
  }
  if (insights.length > 0) {
    await prisma.performanceInsight.createMany({
      data: insights.map((i) => ({
        id: i.id,
        observation: i.observation,
        reason: i.reason,
        improvement: i.improvement,
        status: i.status.toUpperCase()
      }))
    });
  }
  return getStoreSnapshot();
}

export async function updateInsight(id: string, status: "approved" | "rejected", edited?: Partial<PerformanceInsight>) {
  const updated = await prisma.performanceInsight.update({
    where: { id },
    data: {
      status: status.toUpperCase(),
      observation: edited?.observation,
      reason: edited?.reason,
      improvement: edited?.improvement
    }
  });

  if (status === "approved") {
    const activeRuleset = await prisma.promptRuleSet.findFirst({
      where: { active: true },
      orderBy: { createdAt: "desc" }
    });
    if (activeRuleset) {
      await prisma.promptRuleChange.create({
        data: {
          promptRuleSetId: activeRuleset.id,
          observation: updated.observation,
          reason: updated.reason,
          improvement: updated.improvement,
          status: "APPROVED"
        }
      });
    }
  }

  return getStoreSnapshot();
}
