import { GoogleGenAI } from "@google/genai";
import { extractJsonPayload } from "@/lib/llm/json";
import { buildConsultantPrompt, buildTranslatorPrompt } from "@/lib/llm/prompts";
import type { LlmProvider } from "@/lib/llm/providers/types";
import type { Recommendation, TranslationMap } from "@/lib/types";

export class GeminiProvider implements LlmProvider {
  providerId = "gemini" as const;
  isConfigured: boolean;
  private readonly client?: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.isConfigured = Boolean(apiKey);
    this.model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async translateChunk(input: Parameters<LlmProvider["translateChunk"]>[0]): Promise<TranslationMap> {
    if (!this.client) {
      throw new Error("Gemini provider is not configured.");
    }

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: buildTranslatorPrompt(input),
    });

    const payload = extractJsonPayload(response.text ?? "");
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Gemini translation response was not a JSON object.");
    }

    return payload as TranslationMap;
  }

  async consultDiff(input: Parameters<LlmProvider["consultDiff"]>[0]): Promise<Recommendation[]> {
    if (!this.client) {
      throw new Error("Gemini provider is not configured.");
    }

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: buildConsultantPrompt(input),
    });

    const payload = extractJsonPayload(response.text ?? "");
    if (!Array.isArray(payload)) {
      throw new Error("Gemini consultant response was not an array.");
    }

    return payload as Recommendation[];
  }
}
