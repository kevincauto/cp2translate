import type { DiffItem, FlatEntry } from "@/lib/types";

export function buildTranslatorPrompt(params: {
  locale: string;
  chunk: FlatEntry[];
}) {
  const payload = Object.fromEntries(params.chunk.map((item) => [item.keyPath, item.value]));

  return [
    `You are a professional i18n translator.`,
    `Target locale: ${params.locale}.`,
    `Translate all values and return only a JSON object with exactly the same keys.`,
    `Strict rules:`,
    `1) Preserve keys exactly.`,
    `2) Preserve placeholders like {name}, {count}, and {{value}} exactly as-is.`,
    `3) Preserve any HTML-like tags and line breaks semantics.`,
    `4) Never return empty strings.`,
    `5) Output only valid JSON object, no markdown.`,
    `Input JSON:`,
    JSON.stringify(payload, null, 2),
  ].join("\n");
}

export function buildConsultantPrompt(params: {
  locale: string;
  diffItems: DiffItem[];
}) {
  return [
    `You are a translation consultant reviewing competing translations.`,
    `Target locale: ${params.locale}.`,
    `For each item, choose the best option among Translation A, Translation B, and Translation C.`,
    `IMPORTANT: All explanations MUST be in English even though translations are in ${params.locale}.`,
    `If all three options are effectively the same translation, still choose one option and explain the meaning in English plus why it is a good choice.`,
    `Also explain each non-chosen option in English (meaning + why it is slightly less good or equally good).`,
    `Return only a JSON array of objects with shape:`,
    `[{ "keyPath": string, "english": string, "chosen": "A"|"B"|"C", "translation": string, "explanation": string, "alternatives": [{ "source": "A"|"B"|"C", "translation": string, "meaningInEnglish": string, "explanation": string }] }]`,
    `"alternatives" should include only non-chosen options (1-2 entries).`,
    `Use the selected candidate text exactly for "translation".`,
    `Items:`,
    JSON.stringify(params.diffItems, null, 2),
  ].join("\n");
}
