import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePerformanceInsights, parseAnalyticsCsv } from "@/lib/analytics";
import { addMetricsAndInsights, getStoreSnapshot } from "@/lib/store";

const importSchema = z.object({
  csv: z.string().min(1)
});

export async function POST(request: Request) {
  const payload = importSchema.parse(await request.json());
  const current = await getStoreSnapshot();
  const metrics = parseAnalyticsCsv(payload.csv);
  const insights = generatePerformanceInsights(metrics, current.drafts);
  const snapshot = await addMetricsAndInsights(metrics, insights);

  return NextResponse.json(snapshot);
}
