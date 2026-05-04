import { NextResponse } from "next/server";
import { getStoreSnapshot, saveStoreSnapshot } from "@/lib/store";
import { publishToLinkedIn } from "@/lib/linkedin";

export async function GET(request: Request) {
  return handlePublish(request);
}

export async function POST(request: Request) {
  return handlePublish(request);
}

async function handlePublish(request: Request) {
  console.log("[CRON] Starting publication check...");
  try {
    const snapshot = await getStoreSnapshot();
    const now = new Date();
    
    // Check if a specific draftId was passed (QStash mode)
    let targetDraftId: string | undefined;
    if (request.method === "POST") {
      try {
        const body = await request.json();
        targetDraftId = body.draftId;
      } catch (e) {
        // Not a JSON body or no draftId
      }
    }

    const dueDrafts = snapshot.drafts.filter(d => {
      if (targetDraftId) {
        return d.id === targetDraftId && d.status === "scheduled";
      }
      return (
        d.status === "scheduled" && 
        d.scheduledAt && 
        new Date(d.scheduledAt) <= now
      );
    });

    console.log(`[CRON] Found ${dueDrafts.length} due drafts${targetDraftId ? ` (Target: ${targetDraftId})` : ""}`);

    if (dueDrafts.length === 0) {
      return NextResponse.json({ message: "No posts due for publication", processed: 0 });
    }

    const results = [];
    
    for (const draft of dueDrafts) {
      try {
        console.log(`[CRON] Publishing: ${draft.id} - ${draft.hook}`);
        const publishResult = await publishToLinkedIn(draft);
        
        draft.status = "posted";
        draft.postedAt = new Date().toISOString();
        draft.linkedinPostUrn = publishResult.id || "manual-id";
        draft.qstashMessageId = undefined; // Clear the message ID
        draft.updatedAt = new Date().toISOString();
        
        results.push({ id: draft.id, success: true });
        console.log(`[CRON] Success: ${draft.id}`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`[CRON] Failed: ${draft.id} - ${msg}`);
        results.push({ 
          id: draft.id, 
          success: false, 
          error: msg
        });
      }
    }

    await saveStoreSnapshot(snapshot);
    console.log("[CRON] Snapshot saved.");

    return NextResponse.json({
      processed: dueDrafts.length,
      results
    });
  } catch (error) {
    console.error("[CRON] CRITICAL ERROR:", error);
    return NextResponse.json({ 
      error: "Internal Server Error", 
      message: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}