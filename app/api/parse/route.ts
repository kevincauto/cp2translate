import { NextResponse } from "next/server";
import { z } from "zod";
import { flattenI18nJson } from "@/lib/i18n/flatten";
import { detectSuspiciousKeys } from "@/lib/security/warnings";

const requestSchema = z
  .object({
    jsonText: z.string().optional(),
    json: z.unknown().optional(),
  })
  .refine((value) => Boolean(value.jsonText || value.json), {
    message: "Provide either jsonText or json.",
  });

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const body = requestSchema.parse(rawBody);

    let parsedJson: unknown = body.json;
    if (body.jsonText) {
      parsedJson = JSON.parse(body.jsonText);
    }

    const flatEntries = flattenI18nJson(parsedJson);
    const warnings = detectSuspiciousKeys(flatEntries.map((entry) => entry.keyPath));

    return NextResponse.json({
      ok: true,
      flatEntries,
      warnings,
      totalKeys: flatEntries.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected parse failure.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 400 },
    );
  }
}
