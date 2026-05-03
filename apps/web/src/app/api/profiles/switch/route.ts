import { NextResponse } from "next/server";
import { getStoreSnapshot, saveStoreSnapshot } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { profileId } = await request.json();
    const snapshot = await getStoreSnapshot();
    
    const profile = snapshot.creatorProfiles.find(p => p.id === profileId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    snapshot.activeProfileId = profileId;
    snapshot.activeWorkspaceId = profile.workspaceId;
    
    await saveStoreSnapshot(snapshot);
    return NextResponse.json(snapshot);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
