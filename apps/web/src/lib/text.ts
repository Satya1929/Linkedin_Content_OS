const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "has",
  "have",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "this",
  "to",
  "with",
  "you",
  "your"
]);

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

export function extractUrls(value: string | undefined | null) {
  if (!value) return [];
  return Array.from(new Set(value.match(/https?:\/\/[^\s)]+/g) ?? []));
}

export function compactText(value: string | undefined | null, maxLength = 220) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

export function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

export function fingerprint(value: string, maxTokens = 8) {
  const tokens = Array.from(new Set(tokenize(value))).slice(0, maxTokens);
  return tokens.join("-");
}

export function keywordSummary(value: string, maxTokens = 6) {
  const counts = new Map<string, number>();
  for (const token of tokenize(value)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTokens)
    .map(([token]) => token);
}
