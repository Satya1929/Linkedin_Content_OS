import { NextResponse } from "next/server";
import { z } from "zod";
import { regenerateDraftText, regenerateImagePrompt } from "@/lib/engine";
import { resolveSchedule } from "@/lib/scheduling";
import { updateDraft, getStoreSnapshot } from "@/lib/store";
import { schedulePublication, cancelPublication } from "@/lib/qstash";

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "regenerateText", "regenerateImage", "regenerateBoth", "schedule", "markPosted", "publishNow"]),
  schedule: z
    .object({
      mode: z.enum(["default", "exact", "range"]),
      exactAt: z.string().optional(),
      date: z.string().optional(),
      rangeStart: z.string().optional(),
      rangeEnd: z.string().optional(),
      timezone: z.string().optional()
    })
    .optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = actionSchema.parse(await request.json());

  if (payload.action === "publishNow") {
    // We need to import publishToLinkedIn and handle it here.
    // Since updateDraft is a sync updater, we'll handle the async call outside or use a different pattern.
    const { getStoreSnapshot } = await import("@/lib/store");
    const { publishToLinkedIn } = await import("@/lib/linkedin");
    const snapshot = await getStoreSnapshot();
    const draft = snapshot.drafts.find(d => d.id === id);
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    
    try {
      const result = await publishToLinkedIn(draft);
      const postUrn = result.id; // LinkedIn returns the URN in the 'id' field for /rest/posts

      const nextSnapshot = await updateDraft(id, (d) => ({
        ...d,
        status: "posted",
        postedAt: new Date().toISOString(),
        linkedinPostUrn: postUrn,
        updatedAt: new Date().toISOString()
      }));
      return NextResponse.json(nextSnapshot);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Get existing draft to check for previous QStash messages
  const initialSnapshot = await getStoreSnapshot();
  const existingDraft = initialSnapshot.drafts.find(d => d.id === id);

  let qstashMessageId: string | undefined = undefined;
  
  if (payload.action === "schedule") {
    // If there was an existing message, cancel it
    if (existingDraft?.qstashMessageId) {
      await cancelPublication(existingDraft.qstashMessageId);
    }

    const profile = initialSnapshot.creatorProfiles.find(p => p.id === initialSnapshot.activeProfileId);
    const scheduledAt = resolveSchedule(payload.schedule ?? { mode: "default" }, profile?.defaultPostTime ?? "10:30");
    
    // Schedule new message
    const newMsgId = await schedulePublication(id, scheduledAt);
    if (newMsgId) qstashMessageId = newMsgId;
  } else if (existingDraft?.qstashMessageId) {
    // If switching away from "scheduled" status, cancel the existing message
    await cancelPublication(existingDraft.qstashMessageId);
  }

  const snapshot = await updateDraft(id, async (draft, currentSnapshot) => {
    const now = new Date().toISOString();

    if (payload.action === "approve") {
      return { ...draft, status: "approved", qstashMessageId: undefined, updatedAt: now };
    }

    if (payload.action === "reject") {
      return { ...draft, status: "rejected", qstashMessageId: undefined, updatedAt: now };
    }

    if (payload.action === "regenerateText") {
      return await regenerateDraftText(draft, currentSnapshot);
    }

    if (payload.action === "regenerateImage") {
      return await regenerateImagePrompt(draft);
    }

    if (payload.action === "regenerateBoth") {
      const updatedTextDraft = await regenerateDraftText(draft, currentSnapshot);
      return await regenerateImagePrompt(updatedTextDraft);
    }

    if (payload.action === "schedule") {
      const profile = currentSnapshot.creatorProfiles.find(p => p.id === currentSnapshot.activeProfileId);
      const scheduledAt = resolveSchedule(payload.schedule ?? { mode: "default" }, profile?.defaultPostTime ?? "10:30");
      return {
        ...draft,
        status: "scheduled",
        scheduledAt,
        qstashMessageId,
        updatedAt: now
      };
    }

    return {
      ...draft,
      status: "posted",
      postedAt: now,
      qstashMessageId: undefined,
      updatedAt: now
    };
  });

  return NextResponse.json(snapshot);
}
