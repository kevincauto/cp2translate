import { AgentColumn } from "@/components/AgentColumn";
import { TRANSLATION_ORDER } from "@/lib/translations";
import type { TranslationId } from "@/lib/types";

export function AgentColumns({
  progressByTranslation,
  totalKeys,
}: {
  progressByTranslation: Record<TranslationId, { keysDone: number; percent: number; status: string }>;
  totalKeys: number;
}) {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {TRANSLATION_ORDER.map((translationId) => (
        <AgentColumn
          key={translationId}
          translationId={translationId}
          keysDone={progressByTranslation[translationId].keysDone}
          percent={progressByTranslation[translationId].percent}
          total={totalKeys}
          status={progressByTranslation[translationId].status}
        />
      ))}
    </section>
  );
}
