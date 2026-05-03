import { NextResponse } from "next/server";
import { starterNewsSources } from "@/lib/news";

export async function GET() {
  return NextResponse.json({
    sources: starterNewsSources,
    note: "These are the compliant Phase 5 sources used for local news discovery."
  });
}
