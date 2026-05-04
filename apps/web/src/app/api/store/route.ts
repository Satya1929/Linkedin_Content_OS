import { NextResponse } from "next/server";
import { getStoreSnapshot } from "@/lib/store";

export async function GET() {
  const snapshot = await getStoreSnapshot();
  return NextResponse.json(snapshot);
}
