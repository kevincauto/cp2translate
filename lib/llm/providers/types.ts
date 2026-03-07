import type {
  DiffItem,
  FlatEntry,
  ProviderId,
  Recommendation,
  TranslationMap,
} from "@/lib/types";

export type TranslateChunkInput = {
  locale: string;
  chunk: FlatEntry[];
};

export type ConsultDiffInput = {
  locale: string;
  diffItems: DiffItem[];
};

export interface LlmProvider {
  providerId: ProviderId;
  isConfigured: boolean;
  translateChunk(input: TranslateChunkInput): Promise<TranslationMap>;
  consultDiff(input: ConsultDiffInput): Promise<Recommendation[]>;
}
