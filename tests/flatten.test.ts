import { describe, expect, it } from "vitest";
import { flattenI18nJson, unflattenI18nJson } from "@/lib/i18n/flatten";

describe("flatten/unflatten", () => {
  it("roundtrips nested i18n objects", () => {
    const source = {
      common: {
        welcome: "Hello {name}",
        nested: {
          count: "You have {count} items",
        },
      },
    };

    const flat = flattenI18nJson(source);
    expect(flat).toHaveLength(2);
    expect(flat.map((item) => item.keyPath).sort()).toEqual([
      "common.nested.count",
      "common.welcome",
    ]);

    const rebuilt = unflattenI18nJson(
      Object.fromEntries(flat.map((item) => [item.keyPath, item.value])),
    );
    expect(rebuilt).toEqual(source);
  });
});
