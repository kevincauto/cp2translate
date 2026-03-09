import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TRANSLATION_ORDER } from "@/lib/translations";
import type {
  MatchCounts,
  MatchMatrix as MatchMatrixType,
  TranslationId,
} from "@/lib/types";

const TRANSLATIONS: TranslationId[] = TRANSLATION_ORDER;

export function MatchMatrix({
  matrix,
  counts,
}: {
  matrix: MatchMatrixType | null;
  counts?: MatchCounts | null;
}) {
  if (!matrix) {
    return null;
  }

  const pairs: Array<{ left: TranslationId; right: TranslationId }> = [];
  for (let i = 0; i < TRANSLATIONS.length; i++) {
    for (let j = i + 1; j < TRANSLATIONS.length; j++) {
      pairs.push({ left: TRANSLATIONS[i], right: TRANSLATIONS[j] });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>4) Comparing the Translations A, B, and C</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 text-sm">
          {pairs.map(({ left, right }) => {
            const percent = matrix[left][right];
            const pairCounts = counts?.[left]?.[right] ?? null;

            return (
              <div key={`${left}-${right}`} className="space-y-1">
                <div className="font-semibold">
                  [{left} vs {right}]: {percent.toFixed(2)}% match
                </div>
                {pairCounts ? (
                  <div className="text-muted-foreground">
                    ({pairCounts.same}/{pairCounts.total} translated phrases
                    were an exact match)
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
