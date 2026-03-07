import { describe, expect, it } from "vitest";
import { buildDiffItems, buildMatchMatrix } from "@/lib/compare/compare";

describe("compare utilities", () => {
  it("builds pairwise match matrix", () => {
    const matrix = buildMatchMatrix({
      A: { k1: "A", k2: "B" },
      B: { k1: "A", k2: "C" },
      C: { k1: "A", k2: "B" },
    });

    expect(matrix.A.A).toBe(100);
    expect(matrix.A.B).toBe(50);
    expect(matrix.A.C).toBe(100);
  });

  it("extracts diff items where candidates differ", () => {
    const diffs = buildDiffItems({
      english: { k1: "Hello", k2: "World" },
      translations: {
        A: { k1: "Hola", k2: "Mundo" },
        B: { k1: "Hola", k2: "Monde" },
        C: { k1: "Hola", k2: "Mundo" },
      },
    });

    expect(diffs).toHaveLength(1);
    expect(diffs[0]?.keyPath).toBe("k2");
  });
});
