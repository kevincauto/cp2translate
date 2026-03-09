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

  return (
    <Card>
      <CardHeader>
        <CardTitle>4) Match Matrix (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border p-2 text-left">Translation</th>
              {TRANSLATIONS.map((translationId) => (
                <th key={translationId} className="border p-2 text-left">
                  Translation {translationId}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRANSLATIONS.map((row) => (
              <tr key={row}>
                <td className="border p-2 font-medium">Translation {row}</td>
                {TRANSLATIONS.map((col) => (
                  <td key={`${row}-${col}`} className="border p-2">
                    {row === col ? (
                      <span className="text-gray-500" aria-hidden="true">
                        --
                      </span>
                    ) : (
                      <span>
                        {matrix[row][col].toFixed(2)}% match
                        {counts?.[row]?.[col]
                          ? ` (${counts[row][col].same}/${counts[row][col].total})`
                          : null}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
