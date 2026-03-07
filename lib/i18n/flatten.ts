import { hasHtmlLikeTags, hasNewlines, extractTokens } from "@/lib/i18n/tokens";
import type { FlatEntry, TranslationMap } from "@/lib/types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function flattenI18nJson(input: unknown): FlatEntry[] {
  if (!isPlainObject(input)) {
    throw new Error("Input must be a JSON object.");
  }

  const entries: FlatEntry[] = [];

  function walk(node: unknown, prefix: string) {
    if (typeof node === "string") {
      entries.push({
        keyPath: prefix,
        value: node,
        meta: {
          tokens: extractTokens(node),
          hasHtmlLikeTags: hasHtmlLikeTags(node),
          hasNewlines: hasNewlines(node),
        },
      });
      return;
    }

    if (!isPlainObject(node)) {
      throw new Error(`Invalid leaf at "${prefix}". Leaf values must be strings.`);
    }

    for (const [key, value] of Object.entries(node)) {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      walk(value, nextPath);
    }
  }

  walk(input, "");

  return entries;
}

export function unflattenI18nJson(translations: TranslationMap): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const [keyPath, value] of Object.entries(translations)) {
    const parts = keyPath.split(".");
    let cursor: Record<string, unknown> = root;

    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;

      if (isLeaf) {
        cursor[part] = value;
        continue;
      }

      const existing = cursor[part];
      if (!isPlainObject(existing)) {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    }
  }

  return root;
}

export function flatEntriesToMap(entries: FlatEntry[]): TranslationMap {
  return Object.fromEntries(entries.map((entry) => [entry.keyPath, entry.value]));
}
