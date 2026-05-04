import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoreSnapshot, saveStoreSnapshot, patchDraft } from "@/lib/store";
import { cancelPublication } from "@/lib/qstash";

const patchDraftSchema = z.object({
  hook: z.string().optional(),
  context: z.string().optional(),
  insight: z.string().optional(),
  takeaway: z.string().optional(),
  cta: z.string().optional(),
  format: z.enum(["text", "image", "carousel", "mixed"]).optional(),
  imagePrompt: z.string().optional(),
  carouselOutline: z
    .array(
      z.object({
        title: z.string(),
        body: z.string()
      })
    )
    .optional(),
  locks: z
    .object({
      hook: z.boolean(),
      context: z.boolean(),
      insight: z.boolean(),
      takeaway: z.boolean(),
      cta: z.boolean()
    })
    .optional()
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = patchDraftSchema.parse(await request.json());
  const snapshot = await patchDraft(id, payload);

  return NextResponse.json(snapshot);
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const snapshot = await getStoreSnapshot();
  const draft = snapshot.drafts.find((d) => d.id === id);
  
  if (draft?.qstashMessageId) {
    await cancelPublication(draft.qstashMessageId);
  }

  snapshot.drafts = snapshot.drafts.filter((d) => d.id !== id);
  await saveStoreSnapshot(snapshot);
  return NextResponse.json(snapshot);
}
