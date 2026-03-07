import { NextResponse } from "next/server";
import { z } from "zod";
import { buildDiffItems, buildMatchMatrix } from "@/lib/compare/compare";
import { TRANSLATION_ORDER } from "@/lib/translations";
import type { TranslationId, TranslationMap } from "@/lib/types";

const translationMapSchema = z.record(z.string(), z.string());

const bodySchema = z.object({
  english: translationMapSchema,
  translations: z.object({
    A: translationMapSchema,
    B: translationMapSchema,
    C: translationMapSchema,
  }),
});

function fillMissingKeys(
  english: TranslationMap,
  translations: Record<TranslationId, TranslationMap>,
): Record<TranslationId, TranslationMap> {
  const keys = Object.keys(english);
  const ensured = { ...translations };

  TRANSLATION_ORDER.forEach((translationId) => {
    const base = { ...ensured[translationId] };
    keys.forEach((key) => {
      if (!(key in base)) {
        base[key] = "";
      }
    });
    ensured[translationId] = base;
  });

  return ensured;
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const translations = fillMissingKeys(body.english, body.translations);
    const matchMatrix = buildMatchMatrix(translations);
    const diffItems = buildDiffItems({ english: body.english, translations });

    return NextResponse.json({
      ok: true,
      matchMatrix,
      diffItems,
      diffCount: diffItems.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Compare failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
