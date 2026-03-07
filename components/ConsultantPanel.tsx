import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProviderId, Recommendation } from "@/lib/types";

export function ConsultantPanel({
  consultantProviderId,
  recommendations,
}: {
  consultantProviderId: ProviderId;
  recommendations: Recommendation[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{consultantProviderId} consultant</CardTitle>
        <CardDescription>{recommendations.length} recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {recommendations.slice(0, 8).map((item) => (
          <div key={`${consultantProviderId}-${item.keyPath}`} className="rounded border p-2">
            <p className="font-mono text-xs text-gray-700">{item.keyPath}</p>
            <p>
              Chosen: <strong>Translation {item.chosen}</strong>
            </p>
            <p className="text-xs text-gray-600">{item.explanation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
