export function extractJsonPayload(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed);
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1]);
  }

  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  const starts = [firstBrace, firstBracket].filter((x) => x >= 0);
  if (starts.length === 0) {
    throw new Error("Model response did not contain JSON.");
  }

  const start = Math.min(...starts);
  const candidate = trimmed.slice(start);

  for (let end = candidate.length; end > 0; end -= 1) {
    const piece = candidate.slice(0, end);
    try {
      return JSON.parse(piece);
    } catch {
      // Continue searching for closest parseable JSON prefix.
    }
  }

  throw new Error("Unable to parse JSON from model response.");
}
