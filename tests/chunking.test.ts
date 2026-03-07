import { describe, expect, it } from "vitest";
import { chunkEntries } from "@/lib/chunking/chunk";
import type { FlatEntry } from "@/lib/types";

function makeEntries(size: number): FlatEntry[] {
  return Array.from({ length: size }, (_, i) => ({
    keyPath: `k${i}`,
    value: `v${i}`,
    meta: {
      tokens: [],
      hasHtmlLikeTags: false,
      hasNewlines: false,
    },
  }));
}

describe("chunkEntries", () => {
  it("keeps chunks within expected range for large payload", () => {
    const chunks = chunkEntries(makeEntries(400), { minSize: 50, maxSize: 150 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      expect(chunk.length).toBeGreaterThanOrEqual(50);
      expect(chunk.length).toBeLessThanOrEqual(150);
    });
  });
});
