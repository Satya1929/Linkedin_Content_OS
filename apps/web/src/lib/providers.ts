import type { PromptBundle } from "./types";

export type GenerateTextInput = {
  system: string;
  prompt: string;
  temperature?: number;
};

export type ModelProvider = {
  name: string;
  available: () => Promise<boolean>;
  generateText: (input: GenerateTextInput) => Promise<string>;
  embedText: (text: string) => Promise<number[]>;
};

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function hashEmbedding(text: string, dimensions = 64) {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = text.toLowerCase().split(/\W+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 0;
    for (let index = 0; index < token.length; index += 1) {
      hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
    }
    vector[hash % dimensions] += 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, item) => sum + item * item, 0)) || 1;
  return vector.map((item) => item / magnitude);
}

export function createOpenRouterProvider(): ModelProvider {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-lite-preview-02-05:free"; // Default to a free model on OpenRouter

  return {
    name: "openrouter",
    async available() {
      return Boolean(apiKey && apiKey !== "YOUR_OPENROUTER_API_KEY");
    },
    async generateText(input) {
      if (!apiKey) {
        throw new Error("OpenRouter API key is not configured.");
      }

      const response = await fetchWithTimeout(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000",
            "X-Title": "LinkedIn Content OS"
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: "system", content: input.system },
              { role: "user", content: input.prompt }
            ],
            temperature: input.temperature ?? 0.4
          })
        },
        20000
      );

      if (!response.ok) {
        throw new Error(`OpenRouter generation failed with ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content ?? "";
    },
    async embedText(text) {
      return hashEmbedding(text);
    }
  };
}

export function createGeminiProvider(): ModelProvider {
  const apiKey = process.env.GOOGLE_AI_API_KEY || "";
  const host = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

  return {
    name: "gemini",
    async available() {
      return Boolean(apiKey && apiKey !== "YOUR_GEMINI_API_KEY");
    },
    async generateText(input) {
      if (!apiKey) {
        throw new Error("Google AI API key is not configured.");
      }

      const response = await fetchWithTimeout(
        `${host}?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${input.system}\n\n${input.prompt}` }]
              }
            ],
            generationConfig: {
              temperature: input.temperature ?? 0.4,
              topP: 0.8,
              topK: 40
            }
          })
        },
        20000
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini generation failed: ${error}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    },
    async embedText(text) {
    // Basic fallback for now, Google has a separate embedding API if needed
    return hashEmbedding(text);
  }
};
}

export async function createDefaultProvider(): Promise<ModelProvider> {
const gemini = createGeminiProvider();
if (await gemini.available()) return gemini;

const openrouter = createOpenRouterProvider();
if (await openrouter.available()) return openrouter;

// Fallback provider that doesn't do anything but won't crash
return {
  name: "fallback",
  available: async () => true,
  generateText: async () => "",
  embedText: async (text) => hashEmbedding(text)
};
}

export function buildGenerationSystemPrompt(bundle: PromptBundle) {
  return [
    "You are the content engine for a local-first LinkedIn authority system.",
    "Return structured, practical, thesis-led content for an AI builder profile.",
    bundle.contentRules,
    bundle.scoringRules
  ].join("\n\n");
}
