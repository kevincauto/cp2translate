import { NextResponse } from "next/server";
import { z } from "zod";
import { unflattenI18nJson } from "@/lib/i18n/flatten";

const translationMapSchema = z.record(z.string(), z.string());

const bodySchema = z.object({
  english: translationMapSchema,
  finalTranslations: translationMapSchema,
  locale: z.string().min(2),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const requiredKeys = Object.keys(body.english);
    for (const key of requiredKeys) {
      if (!(key in body.finalTranslations)) {
        return NextResponse.json(
          { ok: false, error: `Missing final translation for key "${key}".` },
          { status: 400 },
        );
      }
      if (body.finalTranslations[key].trim().length === 0) {
        return NextResponse.json(
          { ok: false, error: `Final translation is empty for key "${key}".` },
          { status: 400 },
        );
      }
    }

    const nestedJson = unflattenI18nJson(body.finalTranslations);
    return NextResponse.json({
      ok: true,
      locale: body.locale,
      nestedJson,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assemble failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
