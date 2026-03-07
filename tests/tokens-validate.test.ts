import { describe, expect, it } from "vitest";
import { flattenI18nJson } from "@/lib/i18n/flatten";
import { validateTranslationMap } from "@/lib/i18n/validate";

describe("token validation", () => {
  it("flags token mismatches", () => {
    const entries = flattenI18nJson({
      common: {
        hello: "Hello {name}",
      },
    });

    const errors = validateTranslationMap(entries, {
      "common.hello": "Bonjour {prenom}",
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain("Token mismatch");
  });

  it("passes when tokens are preserved", () => {
    const entries = flattenI18nJson({
      common: {
        hello: "Hello {name}",
      },
    });

    const errors = validateTranslationMap(entries, {
      "common.hello": "Bonjour {name}",
    });

    expect(errors).toHaveLength(0);
  });
});
