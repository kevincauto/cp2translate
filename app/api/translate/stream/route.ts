import { NextResponse } from "next/server";
import { z } from "zod";
import { chunkEntries } from "@/lib/chunking/chunk";
import { humanizeModelError } from "@/lib/errors";
import { validateTranslationMap } from "@/lib/i18n/validate";
import { getConfiguredProviders } from "@/lib/llm/providers";
import { formatSseEvent } from "@/lib/sse";
import { TRANSLATION_ORDER, TRANSLATION_BY_ID } from "@/lib/translations";
import type { FlatEntry, TranslationId, TranslationMap } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.string().min(2),
  flatEntries: z.array(
    z.object({
      keyPath: z.string(),
      value: z.string(),
      meta: z.object({
        tokens: z.array(z.string()),
        hasHtmlLikeTags: z.boolean(),
        hasNewlines: z.boolean(),
      }),
    }),
  ),
  chunkMin: z.number().int().positive().optional(),
  chunkMax: z.number().int().positive().optional(),
  retryLimit: z.number().int().min(0).max(3).optional(),
});

async function withRetry<T>(
  task: () => Promise<T>,
  retries: number,
): Promise<{ value?: T; error?: string }> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      const value = await task();
      return { value };
    } catch (error) {
      const message = humanizeModelError(error);
      if (attempt === retries) {
        return { error: message };
      }
      attempt += 1;
    }
  }
  return { error: "Retries exhausted" };
}

export async function POST(request: Request) {
  let parsedBody: z.infer<typeof bodySchema>;
  try {
    parsedBody = bodySchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request body";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const providers = getConfiguredProviders();
  const enabledTranslations = TRANSLATION_ORDER.filter(
    (translationId) => providers[TRANSLATION_BY_ID[translationId].providerId] !== null,
  );

  if (enabledTranslations.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No LLM providers are configured on the server." },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();
  const retryLimit = parsedBody.retryLimit ?? 1;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        const chunked = chunkEntries(parsedBody.flatEntries as FlatEntry[], {
          minSize: parsedBody.chunkMin,
          maxSize: parsedBody.chunkMax,
        });
        const results: Partial<Record<TranslationId, TranslationMap>> = {};

        await Promise.all(
          enabledTranslations.map(async (translationId) => {
            const providerId = TRANSLATION_BY_ID[translationId].providerId;
            const provider = providers[providerId];
            if (!provider) {
              return;
            }

            const merged: TranslationMap = {};
            controller.enqueue(
              encoder.encode(
                formatSseEvent("translationStarted", {
                  translationId,
                  totalChunks: chunked.length,
                }),
              ),
            );

            for (let chunkIndex = 0; chunkIndex < chunked.length; chunkIndex += 1) {
              const chunk = chunked[chunkIndex];
              controller.enqueue(
                encoder.encode(
                  formatSseEvent("chunkStarted", {
                    translationId,
                    chunkIndex,
                    totalChunks: chunked.length,
                  }),
                ),
              );

              const execution = await withRetry(
                async () => {
                  const translated = await provider.translateChunk({
                    locale: parsedBody.locale,
                    chunk,
                  });
                  const validationErrors = validateTranslationMap(chunk, translated);
                  if (validationErrors.length > 0) {
                    throw new Error(validationErrors[0]?.message ?? "Translation validation failed");
                  }
                  return translated;
                },
                retryLimit,
              );

              if (!execution.value) {
                controller.enqueue(
                  encoder.encode(
                    formatSseEvent("error", {
                      translationId,
                      chunkIndex,
                      message: execution.error ?? "Chunk failed.",
                    }),
                  ),
                );
                break;
              }

              Object.assign(merged, execution.value);
              controller.enqueue(
                encoder.encode(
                  formatSseEvent("chunkCompleted", {
                    translationId,
                    chunkIndex,
                    totalChunks: chunked.length,
                    keysDone: Object.keys(merged).length,
                    keysTotal: parsedBody.flatEntries.length,
                  }),
                ),
              );
            }

            results[translationId] = merged;
            controller.enqueue(
              encoder.encode(
                formatSseEvent("translationCompleted", {
                  translationId,
                  keysDone: Object.keys(merged).length,
                  keysTotal: parsedBody.flatEntries.length,
                }),
              ),
            );
          }),
        );

        controller.enqueue(
          encoder.encode(
            formatSseEvent("done", {
              locale: parsedBody.locale,
              translations: results,
            }),
          ),
        );
        controller.close();
      })().catch((error) => {
        controller.enqueue(
          encoder.encode(
            formatSseEvent("error", {
              message: humanizeModelError(error),
            }),
          ),
        );
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
