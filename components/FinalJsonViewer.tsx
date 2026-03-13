"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TRANSLATION_ORDER } from "@/lib/translations";
import type { DiffItem, FinalSelection, TranslationMap } from "@/lib/types";

export function FinalJsonViewer({
  diffItems,
  selections,
  onSelectionChange,
  onDownload,
  finalPreview,
}: {
  diffItems: DiffItem[];
  selections: Record<string, FinalSelection>;
  onSelectionChange: (keyPath: string, selection: FinalSelection) => void;
  onDownload: () => void;
  finalPreview: TranslationMap | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>7) Final Selection + JSON Download</CardTitle>
        <CardDescription>
          Manually choose per diff key, then download final merged JSON.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-96 space-y-3 overflow-auto pr-1">
          {diffItems.map((item) => {
            const selected = selections[item.keyPath];
            return (
              <div key={item.keyPath} className="rounded border p-3 text-sm">
                <p className="font-mono text-xs text-gray-700">
                  {item.keyPath}
                </p>
                <div className="mt-2 grid gap-1">
                  {TRANSLATION_ORDER.map((translationId) => (
                    <label
                      key={translationId}
                      className="flex items-start gap-2"
                    >
                      <input
                        type="radio"
                        name={item.keyPath}
                        checked={selected?.source === translationId}
                        onChange={() =>
                          onSelectionChange(item.keyPath, {
                            source: translationId,
                            value: item[translationId],
                          })
                        }
                      />
                      <span>
                        <strong>Translation {translationId}:</strong>{" "}
                        {item[translationId]}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={item.keyPath}
                      checked={selected?.source === "custom"}
                      onChange={() =>
                        onSelectionChange(item.keyPath, {
                          source: "custom",
                          value: selected?.value ?? item.A,
                        })
                      }
                    />
                    <span>Custom</span>
                  </label>
                  {selected?.source === "custom" ? (
                    <Input
                      value={selected.value}
                      onChange={(event) =>
                        onSelectionChange(item.keyPath, {
                          source: "custom",
                          value: event.target.value,
                        })
                      }
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <Button onClick={onDownload} disabled={!finalPreview}>
            Download Final JSON
          </Button>
          {finalPreview ? (
            <p className="text-xs text-gray-600">
              {Object.keys(finalPreview).length} keys ready
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
