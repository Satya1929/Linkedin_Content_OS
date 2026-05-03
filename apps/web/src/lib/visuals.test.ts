import { describe, expect, it } from "vitest";
import { buildCarouselOutline, buildVisualConcepts, carouselToMarkdown, primaryImagePrompt } from "./visuals";

describe("visual workflow", () => {
  it("creates multiple useful visual concepts", () => {
    const concepts = buildVisualConcepts("AI agent evaluation workflow for local model builders");

    expect(concepts).toHaveLength(3);
    expect(concepts.map((concept) => concept.type)).toEqual(["workflow", "comparison", "pattern-breaker"]);
    expect(concepts[0].prompt).toContain("workflow diagram");
  });

  it("creates a carousel outline with visual notes", () => {
    const slides = buildCarouselOutline("local LLM evaluation for developers");

    expect(slides).toHaveLength(7);
    expect(slides.every((slide) => Boolean(slide.visualNote))).toBe(true);
  });

  it("exports carousel markdown", () => {
    const markdown = carouselToMarkdown(buildCarouselOutline("AI builder workflow"));

    expect(markdown).toContain("Slide 1:");
    expect(markdown).toContain("Visual:");
  });

  it("returns the primary prompt from the first concept", () => {
    expect(primaryImagePrompt("AI workflow")).toContain("Create a practical workflow diagram");
  });
});
