import type { CarouselSlide, VisualConcept } from "./types";
import { keywordSummary, titleCase } from "./text";

function topicFromText(value: string) {
  const keywords = keywordSummary(value, 5);
  return keywords.length ? titleCase(keywords.join(" ")) : "AI Builder Workflow";
}

const sharedStyle =
  "Clean modern LinkedIn visual, high contrast, readable on mobile, restrained color palette with green/ink accents, no stock-photo look, no tiny labels.";

const negativePrompt =
  "Avoid hype words, fake UI screenshots, unreadable text, clutter, photorealistic corporate stock imagery, exaggerated claims, logos, and misleading benchmark charts.";

export function buildVisualConcepts(input: string): VisualConcept[] {
  const topic = topicFromText(input);

  return [
    {
      id: "workflow-map",
      type: "workflow",
      title: `${topic}: workflow map`,
      layout: "Left-to-right workflow with 4 labeled steps and one highlighted decision point.",
      style: sharedStyle,
      negativePrompt,
      prompt: `Create a practical workflow diagram for "${topic}". Show a developer moving from source signal to small test, evaluation, and decision. Use 4 clear blocks, one highlighted risk, minimal text. ${sharedStyle}`
    },
    {
      id: "before-after",
      type: "comparison",
      title: `${topic}: before vs after`,
      layout: "Two-column before/after comparison with a single central arrow.",
      style: sharedStyle,
      negativePrompt,
      prompt: `Create a before/after visual for "${topic}". Left side: passive news consumption. Right side: builder turns the signal into an experiment or workflow improvement. Use a central arrow and concise labels. ${sharedStyle}`
    },
    {
      id: "pattern-breaker",
      type: "pattern-breaker",
      title: `${topic}: curiosity hook`,
      layout: "One bold central statement, 3 small supporting chips, strong whitespace.",
      style: sharedStyle,
      negativePrompt,
      prompt: `Create a pattern-breaker LinkedIn image for "${topic}". The central message should make a technical reader pause without using clickbait. Include three small chips: signal, test, decision. ${sharedStyle}`
    }
  ];
}

export function primaryImagePrompt(input: string) {
  return buildVisualConcepts(input)[0].prompt;
}

export function buildCarouselOutline(input: string): CarouselSlide[] {
  const topic = topicFromText(input);

  return [
    {
      title: `${topic}: the builder signal`,
      body: "Open with the practical change hidden inside the news, tool, paper, or workflow.",
      visualNote: "Bold title slide with one signal icon and one small source tag."
    },
    {
      title: "What changed",
      body: "Name the exact capability, constraint, or workflow shift in plain technical language.",
      visualNote: "Simple before/after row with one highlighted delta."
    },
    {
      title: "Why developers should care",
      body: "Connect the shift to prototyping speed, evaluation quality, cost control, or product reliability.",
      visualNote: "Four compact tiles: speed, evals, cost, reliability."
    },
    {
      title: "The wrong takeaway",
      body: "Call out the lazy interpretation people may repeat without understanding the practical signal.",
      visualNote: "Muted warning card with a crossed-out generic claim."
    },
    {
      title: "The useful test",
      body: "Suggest one small experiment a builder could run within a day.",
      visualNote: "Mini checklist with test input, expected output, and pass/fail signal."
    },
    {
      title: "Career signal",
      body: "Explain how this pattern makes the creator more useful to AI teams, recruiters, founders, or clients.",
      visualNote: "Bridge from builder skill to business/team impact."
    },
    {
      title: "Decision rule",
      body: "End with one reusable rule readers can apply the next time they see similar AI news.",
      visualNote: "One-sentence rule in a clean framed layout."
    }
  ];
}

export function carouselToMarkdown(slides: CarouselSlide[]) {
  return slides
    .map((slide, index) => {
      const visual = slide.visualNote ? `\nVisual: ${slide.visualNote}` : "";
      return `Slide ${index + 1}: ${slide.title}\n${slide.body}${visual}`;
    })
    .join("\n\n");
}
