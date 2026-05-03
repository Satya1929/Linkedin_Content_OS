import { NextResponse } from "next/server";
import { getLinkedInAuthUrl } from "@/lib/linkedin";

export async function GET() {
  try {
    const url = await getLinkedInAuthUrl();
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
