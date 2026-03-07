import OpenAI from "openai";
import { extractJsonPayload } from "@/lib/llm/json";
import { buildConsultantPrompt, buildTranslatorPrompt } from "@/lib/llm/prompts";
import type { LlmProvider } from "@/lib/llm/providers/types";
import type { Recommendation, TranslationMap } from "@/lib/types";

export class OpenAiProvider implements LlmProvider {
  providerId = "openai" as const;
  isConfigured: boolean;
  private readonly client?: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.isConfigured = Boolean(apiKey);
    this.model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  async translateChunk(input: Parameters<LlmProvider["translateChunk"]>[0]): Promise<TranslationMap> {
    if (!this.client) {
      throw new Error("OpenAI provider is not configured.");
    }

    const response = await this.client.responses.create({
      model: this.model,
      input: buildTranslatorPrompt(input),
    });

    const payload = extractJsonPayload(response.output_text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("OpenAI translation response was not a JSON object.");
    }

    return payload as TranslationMap;
  }

  async consultDiff(input: Parameters<LlmProvider["consultDiff"]>[0]): Promise<Recommendation[]> {
    if (!this.client) {
      throw new Error("OpenAI provider is not configured.");
    }

    const response = await this.client.responses.create({
      model: this.model,
      input: buildConsultantPrompt(input),
    });

    const payload = extractJsonPayload(response.output_text);
    if (!Array.isArray(payload)) {
      throw new Error("OpenAI consultant response was not an array.");
    }

    return payload as Recommendation[];
  }
}
