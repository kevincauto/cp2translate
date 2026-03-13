export type TranslationId = "A" | "B" | "C";
export type ProviderId = "openai" | "gemini" | "anthropic";

export type FlatEntry = {
  keyPath: string;
  value: string;
  meta: {
    tokens: string[];
    hasHtmlLikeTags: boolean;
    hasNewlines: boolean;
  };
};

export type DiffItem = {
  keyPath: string;
  english: string;
  A: string;
  B: string;
  C: string;
};

export type FinalSelection = {
  source: TranslationId | "custom";
  value: string;
};

export type Recommendation = {
  keyPath: string;
  english: string;
  chosen: TranslationId;
  translation: string;
  explanation: string; // Always English rationale for recommended choice.
  alternatives: Array<{
    source: TranslationId;
    translation: string;
    meaningInEnglish: string;
    explanation: string;
  }>;
};

export type TranslationMap = Record<string, string>;

export type MatchMatrix = Record<TranslationId, Record<TranslationId, number>>;

export type MatchCounts = Record<
  TranslationId,
  Record<TranslationId, { same: number; total: number }>
>;
