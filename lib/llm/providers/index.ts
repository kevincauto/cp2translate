import type { ProviderId } from "@/lib/types";
import { AnthropicProvider } from "@/lib/llm/providers/anthropic";
import { GeminiProvider } from "@/lib/llm/providers/gemini";
import { OpenAiProvider } from "@/lib/llm/providers/openai";
import type { LlmProvider } from "@/lib/llm/providers/types";

export function getProviderMap(): Record<ProviderId, LlmProvider> {
  return {
    openai: new OpenAiProvider(),
    gemini: new GeminiProvider(),
    anthropic: new AnthropicProvider(),
  };
}

export function getConfiguredProviders(): Record<ProviderId, LlmProvider | null> {
  const map = getProviderMap();
  return {
    openai: map.openai.isConfigured ? map.openai : null,
    gemini: map.gemini.isConfigured ? map.gemini : null,
    anthropic: map.anthropic.isConfigured ? map.anthropic : null,
  };
}
