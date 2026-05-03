import { NextResponse } from "next/server";
import { createNewsPlaceholder, starterNewsSources } from "@/lib/news";

export async function GET() {
  return NextResponse.json({
    sources: starterNewsSources,
    placeholders: createNewsPlaceholder(),
    note: "News fetching is staged for the next implementation phase; these are the approved initial sources."
  });
}
