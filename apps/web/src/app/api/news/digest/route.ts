import { NextResponse } from "next/server";
import { buildNewsDigest } from "@/lib/news";
import { addSourceItems, getStoreSnapshot } from "@/lib/store";

export async function GET() {
  const snapshot = await getStoreSnapshot();
  const digest = await buildNewsDigest(snapshot.drafts);
  await addSourceItems(digest.items);

  return NextResponse.json(digest);
}
