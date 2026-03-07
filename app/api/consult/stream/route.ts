import { NextResponse } from "next/server";
import { z } from "zod";
import { humanizeModelError } from "@/lib/errors";
import { getConfiguredProviders } from "@/lib/llm/providers";
import { formatSseEvent } from "@/lib/sse";
import { TRANSLATION_ORDER } from "@/lib/translations";
import type { DiffItem, Recommendation, TranslationId } from "@/lib/types";

export const runtime = "nodejs";

const diffItemSchema = z.object({
  keyPath: z.string(),
  english: z.string(),
  A: z.string(),
  B: z.string(),
  C: z.string(),
});

const bodySchema = z.object({
  locale: z.string().min(2),
  consultantProviderId: z.enum(["openai", "gemini", "anthropic"]),
  diffItems: z.array(diffItemSchema),
});

const recommendationSchema = z.object({
  keyPath: z.string(),
  english: z.string().optional().default(""),
  chosen: z.enum(["A", "B", "C"]),
  translation: z.string(),
  explanation: z.string(),
  alternatives: z
    .array(
      z.object({
        source: z.enum(["A", "B", "C"]),
        translation: z.string(),
        meaningInEnglish: z.string(),
        explanation: z.string(),
      }),
    )
    .default([]),
});

function normalizeRecommendations(
  diffItems: DiffItem[],
  raw: Recommendation[],
): Recommendation[] {
  const byKey = new Map(raw.map((item) => [item.keyPath, item]));
  return diffItems.map((item) => {
    const found = byKey.get(item.keyPath);
    if (!found) {
      const chosen: TranslationId = "A";
      const alternatives: Recommendation["alternatives"] = (["B", "C"] as TranslationId[]).map(
        (source) => ({
          source,
          translation: item[source],
          meaningInEnglish: "No consultant explanation available.",
          explanation: "Fallback alternative due to missing recommendation.",
        }),
      );
      return {
        keyPath: item.keyPath,
        english: item.english,
        chosen,
        translation: item[chosen],
        explanation: "Fallback recommendation due to missing consultant output.",
        alternatives,
      };
    }

    const alternativeSources = TRANSLATION_ORDER.filter(
      (source) => source !== found.chosen,
    );
    const existing = new Map(found.alternatives.map((alt) => [alt.source, alt]));
    const alternatives = alternativeSources.map((source) => {
      const candidate = existing.get(source);
      if (candidate) {
        return candidate;
      }
      return {
        source,
        translation: item[source],
        meaningInEnglish: "No consultant explanation available.",
        explanation: "No additional rationale returned for this option.",
      };
    });

    return {
      ...found,
      english: found.english || item.english,
      translation: found.translation || item[found.chosen],
      alternatives,
    };
  });
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
  const provider = providers[parsedBody.consultantProviderId];
  if (!provider) {
    return NextResponse.json(
      {
        ok: false,
        error: `Consultant provider "${parsedBody.consultantProviderId}" is not configured on the server.`,
      },
      { status: 400 },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        controller.enqueue(
          encoder.encode(
            formatSseEvent("consultantStarted", {
              consultantProviderId: parsedBody.consultantProviderId,
              diffCount: parsedBody.diffItems.length,
            }),
          ),
        );

        try {
          const rawRecommendations = await provider.consultDiff({
            locale: parsedBody.locale,
            diffItems: parsedBody.diffItems,
          });

          const validated = z.array(recommendationSchema).parse(rawRecommendations);
          const normalized = normalizeRecommendations(parsedBody.diffItems, validated);

          controller.enqueue(
            encoder.encode(
              formatSseEvent("consultantCompleted", {
                consultantProviderId: parsedBody.consultantProviderId,
                recommendations: normalized,
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              formatSseEvent("done", {
                consultantProviderId: parsedBody.consultantProviderId,
                recommendations: normalized,
              }),
            ),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              formatSseEvent("error", {
                consultantProviderId: parsedBody.consultantProviderId,
                message: humanizeModelError(error),
              }),
            ),
          );
          controller.enqueue(
            encoder.encode(
              formatSseEvent("done", {
                consultantProviderId: parsedBody.consultantProviderId,
                recommendations: [],
              }),
            ),
          );
        }

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
