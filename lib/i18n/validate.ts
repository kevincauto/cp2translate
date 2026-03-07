import { extractTokens, tokensEqual } from "@/lib/i18n/tokens";
import type { FlatEntry, TranslationMap } from "@/lib/types";

export type TranslationValidationError = {
  keyPath: string;
  message: string;
};

export function validateTranslationMap(
  sourceEntries: FlatEntry[],
  translatedMap: TranslationMap,
): TranslationValidationError[] {
  const errors: TranslationValidationError[] = [];
  const sourceKeys = new Set(sourceEntries.map((entry) => entry.keyPath));

  for (const key of sourceKeys) {
    if (!(key in translatedMap)) {
      errors.push({ keyPath: key, message: "Missing translation key." });
    }
  }

  for (const key of Object.keys(translatedMap)) {
    if (!sourceKeys.has(key)) {
      errors.push({ keyPath: key, message: "Unexpected translation key." });
    }
  }

  for (const source of sourceEntries) {
    const translated = translatedMap[source.keyPath];
    if (typeof translated !== "string" || translated.trim().length === 0) {
      errors.push({
        keyPath: source.keyPath,
        message: "Translation must be a non-empty string.",
      });
      continue;
    }

    const translatedTokens = extractTokens(translated);
    if (!tokensEqual(source.meta.tokens, translatedTokens)) {
      errors.push({
        keyPath: source.keyPath,
        message: "Token mismatch between source and translation.",
      });
    }
  }

  return errors;
}
