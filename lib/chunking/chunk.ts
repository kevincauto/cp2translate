import type { FlatEntry } from "@/lib/types";

export function chunkEntries(
  entries: FlatEntry[],
  opts?: { minSize?: number; maxSize?: number },
): FlatEntry[][] {
  const minSize = opts?.minSize ?? 50;
  const maxSize = opts?.maxSize ?? 150;

  if (minSize <= 0 || maxSize < minSize) {
    throw new Error("Invalid chunk sizing configuration.");
  }

  if (entries.length <= maxSize) {
    return [entries];
  }

  const chunkCount = Math.ceil(entries.length / maxSize);
  const targetSize = Math.max(minSize, Math.ceil(entries.length / chunkCount));
  const chunks: FlatEntry[][] = [];

  for (let i = 0; i < entries.length; i += targetSize) {
    chunks.push(entries.slice(i, i + targetSize));
  }

  return chunks;
}
