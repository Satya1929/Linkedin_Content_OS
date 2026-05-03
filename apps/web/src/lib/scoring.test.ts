import { describe, expect, it } from "vitest";
import { calculateSimilarity, scoreDraftParts } from "./scoring";
import type { Draft } from "./types";

describe("scoring", () => {
  it("rewards specific actionable drafts", () => {
    const score = scoreDraftParts({
      hook: "Most AI agent demos miss the real evaluation signal.",
      context: "Developers are shipping agent workflows with tool calls, APIs, and embeddings.",
      insight: "This matters because the useful skill is not prompting alone, but measuring whether the workflow is reliable.",
      takeaway: "Test one agent workflow with a small eval set before you automate it."
    });

    expect(score.overall).toBeGreaterThan(65);
  });

  it("flags strong repetition against approved drafts", () => {
    const existing = [
      {
        id: "draft-1",
        status: "approved",
        body: "AI agent workflows need evaluation before automation. Test tool calls and embeddings."
      } as Draft
    ];
    const similarity = calculateSimilarity("Agent workflows need evaluation before automation and tool calls need tests.", existing);

    expect(similarity.warning).toBe(true);
  });
});
