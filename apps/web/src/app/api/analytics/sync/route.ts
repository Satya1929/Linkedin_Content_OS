import { NextResponse } from "next/server";
import { getStoreSnapshot, saveStoreSnapshot } from "@/lib/store";
import { fetchLinkedInAnalytics } from "@/lib/linkedin";

export async function POST() {
  try {
    const snapshot = await getStoreSnapshot();
    const postedDrafts = snapshot.drafts.filter(d => d.status === "posted" || d.status === "measured");
    
    if (!postedDrafts.length) {
      return NextResponse.json(snapshot);
    }

    const newMetrics = [];
    for (const draft of postedDrafts) {
      if (!draft.linkedinPostUrn) continue;
      
      const metrics = await fetchLinkedInAnalytics(draft.linkedinPostUrn);
      if (metrics) {
        metrics.draftId = draft.id;
        newMetrics.push(metrics);
        
        // Update draft status to measured if it wasn't
        draft.status = "measured";
      }
    }

    snapshot.metrics = [...newMetrics, ...snapshot.metrics];
    // Limit metrics to last 50 for MVP performance
    snapshot.metrics = snapshot.metrics.slice(0, 50);
    
    await saveStoreSnapshot(snapshot);
    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
