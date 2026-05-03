import { NextResponse } from "next/server";
import { getStoreSnapshot, saveStoreSnapshot } from "@/lib/store";
import { createOllamaProvider, buildGenerationSystemPrompt } from "@/lib/providers";
import { loadPromptBundle } from "@/lib/prompts";

export async function POST(request: Request) {
  try {
    const { idea, ctaLink } = await request.json();
    const snapshot = await getStoreSnapshot();

    const provider = createOllamaProvider();
    const bundle = await loadPromptBundle();
    
    let pdfOutline = ["1. Introduction to " + idea, "2. Core Concept", "3. Step-by-Step Implementation", "4. Advanced Workflow", "5. Summary"];
    let postSequence = ["Teaser Post: The problem with current approaches", "Value Post: Here's a framework to solve it", "Launch Post: I've packaged my entire workflow into a PDF guide"];

    if (await provider.available()) {
      try {
        const generated = await provider.generateText({
          system: buildGenerationSystemPrompt(bundle),
          prompt: `Generate a Lead Magnet Funnel strategy for the idea: "${idea}". 
          Respond in strict JSON with keys: 
          "pdfOutline" (array of 5-7 string bullet points for a PDF guide), 
          "postSequence" (array of 3-5 string descriptions for LinkedIn posts promoting it).`,
          temperature: 0.5
        });

        const parsed = JSON.parse(generated);
        if (parsed.pdfOutline && parsed.postSequence) {
          pdfOutline = parsed.pdfOutline;
          postSequence = parsed.postSequence;
        }
      } catch (e) {
        console.warn("Failed to generate lead magnet strategy via provider, using fallback.", e);
      }
    }

    const leadMagnet = {
      id: crypto.randomUUID(),
      workspaceId: snapshot.activeWorkspaceId,
      productIdea: idea,
      pdfOutline,
      postSequence,
      ctaLink: ctaLink || "https://example.com/download-guide",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    snapshot.leadMagnets = [leadMagnet, ...snapshot.leadMagnets];
    await saveStoreSnapshot(snapshot);

    return NextResponse.json(leadMagnet);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
