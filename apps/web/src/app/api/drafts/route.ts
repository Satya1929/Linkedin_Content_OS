export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { z } from "zod";
import { createDraft } from "@/lib/engine";
import { addDraft, getStoreSnapshot } from "@/lib/store";

const createDraftSchema = z.object({
  rawText: z.string().min(1),
  sourceLinks: z.array(z.string().url()).optional().default([]),
  format: z.enum(["text", "image", "carousel", "mixed"]).default("text")
});

export async function GET() {
  return NextResponse.json(await getStoreSnapshot());
}

export async function POST(request: Request) {
  const payload = createDraftSchema.parse(await request.json());
  const snapshot = await getStoreSnapshot();
  const draft = await createDraft(payload, snapshot);
  const nextSnapshot = await addDraft(draft);

  return NextResponse.json(nextSnapshot);
}
