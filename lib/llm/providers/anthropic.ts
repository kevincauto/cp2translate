import Anthropic from "@anthropic-ai/sdk";
import { extractJsonPayload } from "@/lib/llm/json";
import { buildConsultantPrompt, buildTranslatorPrompt } from "@/lib/llm/prompts";
import type { LlmProvider } from "@/lib/llm/providers/types";
import type { Recommendation, TranslationMap } from "@/lib/types";

export class AnthropicProvider implements LlmProvider {
  providerId = "anthropic" as const;
  isConfigured: boolean;
  private readonly client?: Anthropic;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.isConfigured = Boolean(apiKey);
    this.model = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  private readText(content: Anthropic.Messages.Message["content"]): string {
    return content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
  }

  async translateChunk(input: Parameters<LlmProvider["translateChunk"]>[0]): Promise<TranslationMap> {
    if (!this.client) {
      throw new Error("Anthropic provider is not configured.");
    }

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: buildTranslatorPrompt(input) }],
    });

    const payload = extractJsonPayload(this.readText(message.content));
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Anthropic translation response was not a JSON object.");
    }

    return payload as TranslationMap;
  }

  async consultDiff(input: Parameters<LlmProvider["consultDiff"]>[0]): Promise<Recommendation[]> {
    if (!this.client) {
      throw new Error("Anthropic provider is not configured.");
    }

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: [{ role: "user", content: buildConsultantPrompt(input) }],
    });

    const payload = extractJsonPayload(this.readText(message.content));
    if (!Array.isArray(payload)) {
      throw new Error("Anthropic consultant response was not an array.");
    }

    return payload as Recommendation[];
  }
}
