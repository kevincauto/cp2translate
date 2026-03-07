export function humanizeModelError(error: unknown): string {
  const raw = error instanceof Error ? error.message : "Unknown model error";
  const lower = raw.toLowerCase();

  if (lower.includes("rate limit") || lower.includes("429")) {
    return "Provider rate limit reached. Wait briefly and retry this agent.";
  }

  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")) {
    return "Provider authentication failed. Verify server API key configuration.";
  }

  return raw;
}
