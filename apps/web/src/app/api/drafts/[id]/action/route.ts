import { NextResponse } from "next/server";
import { z } from "zod";
import { regenerateDraftText, regenerateImagePrompt } from "@/lib/engine";
import { resolveSchedule } from "@/lib/scheduling";
import { updateDraft } from "@/lib/store";

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
      await publishToLinkedIn(draft);
      const nextSnapshot = await updateDraft(id, (d) => ({
        ...d,
        status: "posted",
        postedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      return NextResponse.json(nextSnapshot);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const snapshot = await updateDraft(id, (draft, currentSnapshot) => {
    const now = new Date().toISOString();

    if (payload.action === "approve") {
      return {
        ...draft,
        status: "approved",
        updatedAt: now
      };
    }

    if (payload.action === "reject") {
      return {
        ...draft,
        status: "rejected",
        updatedAt: now
      };
    }

    if (payload.action === "regenerateText") {
      return regenerateDraftText(draft, currentSnapshot);
    }

    if (payload.action === "regenerateImage") {
      return regenerateImagePrompt(draft);
    }

    if (payload.action === "regenerateBoth") {
      return regenerateImagePrompt(regenerateDraftText(draft, currentSnapshot));
    }

    if (payload.action === "schedule") {
      return {
        ...draft,
        status: "scheduled",
        scheduledAt: resolveSchedule(payload.schedule ?? { mode: "default" }, currentSnapshot.creatorProfile.defaultPostTime),
        updatedAt: now
      };
    }

    return {
      ...draft,
      status: "posted",
      postedAt: now,
      updatedAt: now
    };
  });

  return NextResponse.json(snapshot);
}
