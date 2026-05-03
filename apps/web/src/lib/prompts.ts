import { access, readFile } from "node:fs/promises";
import path from "node:path";
import type { PromptBundle, PromptRuleSet } from "./types";

async function resolvePromptRoot() {
  const candidates = [
    path.resolve(process.cwd(), "prompts"),
    path.resolve(process.cwd(), "../../prompts")
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next likely workspace root.
    }
  }

  return candidates[0];
}

async function readPrompt(fileName: string) {
  return readFile(path.join(await resolvePromptRoot(), fileName), "utf8");
}

export async function loadPromptBundle(): Promise<PromptBundle> {
  const [contentRules, newsRules, scoringRules, imageStyleRules] = await Promise.all([
    readPrompt("content_agent_rules.md"),
    readPrompt("news_agent_rules.md"),
    readPrompt("scoring_rules.md"),
    readPrompt("image_style_rules.md")
  ]);

  return {
    contentRules,
    newsRules,
    scoringRules,
    imageStyleRules
  };
}

export async function loadPromptRuleSets(): Promise<PromptRuleSet[]> {
  const bundle = await loadPromptBundle();
  const createdAt = new Date().toISOString();

  return [
    {
      id: "content-agent-rules-v1",
      name: "Content Agent Rules",
      version: 1,
      content: bundle.contentRules,
      active: true,
      createdAt
    },
    {
      id: "news-agent-rules-v1",
      name: "News Agent Rules",
      version: 1,
      content: bundle.newsRules,
      active: true,
      createdAt
    },
    {
      id: "scoring-rules-v1",
      name: "Scoring Rules",
      version: 1,
      content: bundle.scoringRules,
      active: true,
      createdAt
    },
    {
      id: "image-style-rules-v1",
      name: "Image Style Rules",
      version: 1,
      content: bundle.imageStyleRules,
      active: true,
      createdAt
    }
  ];
}
