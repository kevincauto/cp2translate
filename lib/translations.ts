import type { ProviderId, TranslationId } from "@/lib/types";

export const TRANSLATION_ORDER: TranslationId[] = ["A", "B", "C"];

export const TRANSLATIONS: Array<{
  id: TranslationId;
  label: string;
  poweredBy: string;
  providerId: ProviderId;
}> = [
  {
    id: "A",
    label: "Translation A",
    poweredBy: "OpenAI's GPT",
    providerId: "openai",
  },
  {
    id: "B",
    label: "Translation B",
    poweredBy: "Google Gemini",
    providerId: "gemini",
  },
  {
    id: "C",
    label: "Translation C",
    poweredBy: "Anthropic's Claude",
    providerId: "anthropic",
  },
];

export const TRANSLATION_BY_ID = Object.fromEntries(
  TRANSLATIONS.map((translation) => [translation.id, translation]),
) as Record<TranslationId, (typeof TRANSLATIONS)[number]>;
