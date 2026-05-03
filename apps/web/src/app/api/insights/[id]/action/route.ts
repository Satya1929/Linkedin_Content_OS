import { NextResponse } from "next/server";
import { z } from "zod";
import { updateInsight } from "@/lib/store";

const insightActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  observation: z.string().optional(),
  reason: z.string().optional(),
  improvement: z.string().optional()
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const payload = insightActionSchema.parse(await request.json());
  const snapshot = await updateInsight(id, payload.action === "approve" ? "approved" : "rejected", {
    observation: payload.observation,
    reason: payload.reason,
    improvement: payload.improvement
  });

  return NextResponse.json(snapshot);
}
