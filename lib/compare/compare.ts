import { TRANSLATION_ORDER } from "@/lib/translations";
import type {
  DiffItem,
  MatchCounts,
  MatchMatrix,
  TranslationId,
  TranslationMap,
} from "@/lib/types";

const TRANSLATIONS: TranslationId[] = TRANSLATION_ORDER;

export function normalizeForMatch(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function computePairMatch(
  left: TranslationMap,
  right: TranslationMap,
  keyPaths: string[],
): number {
  if (keyPaths.length === 0) {
    return 100;
  }

  let same = 0;
  for (const keyPath of keyPaths) {
    const a = normalizeForMatch(left[keyPath] ?? "");
    const b = normalizeForMatch(right[keyPath] ?? "");
    if (a === b) {
      same += 1;
    }
  }

  return Number(((same / keyPaths.length) * 100).toFixed(2));
}

export function computePairMatchCounts(
  left: TranslationMap,
  right: TranslationMap,
  keyPaths: string[],
): { same: number; total: number } {
  const total = keyPaths.length;
  if (total === 0) {
    return { same: 0, total: 0 };
  }

  let same = 0;
  for (const keyPath of keyPaths) {
    const a = normalizeForMatch(left[keyPath] ?? "");
    const b = normalizeForMatch(right[keyPath] ?? "");
    if (a === b) {
      same += 1;
    }
  }

  return { same, total };
}

export function buildMatchMatrix(
  translations: Record<TranslationId, TranslationMap>,
): MatchMatrix {
  const keyPaths = Object.keys(translations.A);
  const matrix = {} as MatchMatrix;

  for (const a of TRANSLATIONS) {
    matrix[a] = {} as MatchMatrix[TranslationId];
    for (const b of TRANSLATIONS) {
      matrix[a][b] =
        a === b
          ? 100
          : computePairMatch(translations[a], translations[b], keyPaths);
    }
  }

  return matrix;
}

export function buildMatchCounts(
  translations: Record<TranslationId, TranslationMap>,
): MatchCounts {
  const keyPaths = Object.keys(translations.A);
  const matrix = {} as MatchCounts;

  for (const a of TRANSLATIONS) {
    matrix[a] = {} as MatchCounts[TranslationId];
    for (const b of TRANSLATIONS) {
      matrix[a][b] =
        a === b
          ? { same: keyPaths.length, total: keyPaths.length }
          : computePairMatchCounts(translations[a], translations[b], keyPaths);
    }
  }

  return matrix;
}

export function buildDiffItems(params: {
  english: TranslationMap;
  translations: Record<TranslationId, TranslationMap>;
}): DiffItem[] {
  const keyPaths = Object.keys(params.english);
  const diffs: DiffItem[] = [];

  for (const keyPath of keyPaths) {
    const A = params.translations.A[keyPath] ?? "";
    const B = params.translations.B[keyPath] ?? "";
    const C = params.translations.C[keyPath] ?? "";

    const normalized = new Set([
      normalizeForMatch(A),
      normalizeForMatch(B),
      normalizeForMatch(C),
    ]);

    if (normalized.size > 1) {
      diffs.push({
        keyPath,
        english: params.english[keyPath] ?? "",
        A,
        B,
        C,
      });
    }
  }

  return diffs;
}
