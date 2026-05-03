import { NextResponse } from "next/server";
import { z } from "zod";
import { createDraft } from "@/lib/engine";
import { buildNewsDraftInput } from "@/lib/news";
import { addDraft, getStoreSnapshot } from "@/lib/store";

const sourceItemSchema = z.object({
  id: z.string(),
  url: z.string().optional(),
  title: z.string(),
  summary: z.string().optional(),
  sourceType: z.literal("news"),
  publishedAt: z.string().optional(),
  rawText: z.string().optional(),
  createdAt: z.string()
});

const newsClusterSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(sourceItemSchema).min(1),
  score: z.number(),
  keywords: z.array(z.string()),
  angle: z.string(),
  repeatedWithPastPost: z.boolean()
});

const createNewsDraftSchema = z.object({
  cluster: newsClusterSchema,
  format: z.enum(["text", "image", "carousel", "mixed"]).default("text")
});

export async function POST(request: Request) {
  const payload = createNewsDraftSchema.parse(await request.json());
  const snapshot = await getStoreSnapshot();
  const input = buildNewsDraftInput(payload.cluster);
  const draft = await createDraft(
    {
      ...input,
      format: payload.format
    },
    snapshot
  );
  const nextSnapshot = await addDraft(draft);

  return NextResponse.json(nextSnapshot);
}
