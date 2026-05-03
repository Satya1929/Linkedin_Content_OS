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

export function createOllamaProvider(): ModelProvider {
  const host = process.env.OLLAMA_HOST || "http://localhost:11434";
  const configuredTextModel = process.env.OLLAMA_TEXT_MODEL || "";
  const configuredEmbedModel = process.env.OLLAMA_EMBED_MODEL || "";

  async function listModels() {
    try {
      const response = await fetchWithTimeout(`${host}/api/tags`, undefined, 1500);
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as { models?: Array<{ name?: string }> };
      return (data.models ?? []).map((model) => model.name).filter((name): name is string => Boolean(name));
    } catch {
      return [];
    }
  }

  async function resolveModel(preferred: string) {
    if (preferred) {
      return preferred;
    }
    const models = await listModels();
    return models[0];
  }

  return {
    name: "ollama",
    async available() {
      return Boolean(await resolveModel(configuredTextModel));
    },
    async generateText(input) {
      const textModel = await resolveModel(configuredTextModel);
      if (!textModel) {
        throw new Error("No Ollama text model is configured or available.");
      }

      const response = await fetchWithTimeout(
        `${host}/api/generate`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            model: textModel,
            system: input.system,
            prompt: input.prompt,
            stream: false,
            options: {
              temperature: input.temperature ?? 0.4
            }
          })
        },
        20000
      );

      if (!response.ok) {
        throw new Error(`Ollama generation failed with ${response.status}`);
      }

      const data = (await response.json()) as { response?: string };
      return data.response ?? "";
    },
    async embedText(text) {
      try {
        const embedModel = (await resolveModel(configuredEmbedModel)) ?? (await resolveModel(configuredTextModel));
        if (!embedModel) {
          return hashEmbedding(text);
        }

        const response = await fetchWithTimeout(
          `${host}/api/embeddings`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              model: embedModel,
              prompt: text
            })
          },
          12000
        );
        if (!response.ok) {
          return hashEmbedding(text);
        }
        const data = (await response.json()) as { embedding?: number[] };
        return data.embedding ?? hashEmbedding(text);
      } catch {
        return hashEmbedding(text);
      }
    }
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
