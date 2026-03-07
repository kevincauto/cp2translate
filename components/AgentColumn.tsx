import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRANSLATION_BY_ID } from "@/lib/translations";
import type { TranslationId } from "@/lib/types";

export function AgentColumn({
  translationId,
  keysDone,
  percent,
  total,
  status,
}: {
  translationId: TranslationId;
  keysDone: number;
  percent: number;
  total: number;
  status: string;
}) {
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  const translation = TRANSLATION_BY_ID[translationId];
  const statusLabel =
    status === "running" ? (
      <>
        running<span className="running-dots" aria-hidden="true">...</span>
      </>
    ) : (
      status
    );
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{translation.label}</span>
          <Badge>{safePercent}%</Badge>
        </CardTitle>
        <CardDescription>
          Powered by {translation.poweredBy} · {statusLabel}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-2 w-full rounded bg-gray-100">
          <div
            className="h-2 rounded bg-blue-600 transition-all"
            style={{ width: `${safePercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-600">
          {keysDone} / {total} keys translated
        </p>
      </CardContent>
    </Card>
  );
}
