import { useContext } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DiffItem, FinalSelection, TranslationId } from "@/lib/types";
import { AppContext } from "@/app/page";
import { Input } from "@/components/ui/input";

const TRANSLATION_OPTIONS: TranslationId[] = ["A", "B", "C"];

export function DiffViewer({
  diffItems,
  selections,
  onSelectionChange,
  onCustomValueChange,
}: {
  diffItems: DiffItem[];
  selections: Record<string, FinalSelection>;
  onSelectionChange: (keyPath: string, selection: FinalSelection) => void;
  onCustomValueChange: (keyPath: string, value: string) => void;
}) {
  const appContext = useContext(AppContext);
  const isTranslator = appContext?.appState.persona === "translator";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Differences</CardTitle>
        <CardDescription>
          <span className="text-blue-700 text-lg font-semibold">
            {diffItems.length}
          </span>{" "}
          {isTranslator
            ? "keys require your final selection."
            : "keys need consultant review."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {diffItems.slice(0, 50).map((item, i) => {
            const selected = selections[item.keyPath];
            const customValue =
              selected?.source === "custom" ? selected.value : "";

            return (
              <li key={item.keyPath}>
                <div className="flex flex-col gap-2 px-6 py-3 text-sm">
                  <p className="relative">
                    <span className="absolute top right-[101%] text-md">
                      {i + 1})
                    </span>
                    <span className="font-mono font-semibold text-md text-blue-700">
                      {item.keyPath}
                    </span>
                    :{" "}
                    <span className="mt-1 text-md">
                      &quot;{item.english}&quot;
                    </span>
                  </p>
                  <div className="mt-2 flex flex-col gap-2">
                    {TRANSLATION_OPTIONS.map((translationId) => (
                      <div key={`${item.keyPath}-${translationId}`}>
                        {isTranslator ? (
                          <label className="flex items-start gap-2">
                            <input
                              type="radio"
                              value={translationId}
                              name={item.keyPath}
                              checked={selected?.source === translationId}
                              onChange={() =>
                                onSelectionChange(item.keyPath, {
                                  source: translationId,
                                  value: "",
                                })
                              }
                            />
                            <span>
                              <span className="text-gray-700">
                                Translation {translationId}:
                              </span>{" "}
                              {item[translationId]}
                            </span>
                          </label>
                        ) : (
                          <>
                            <span className="text-gray-700">
                              Translation {translationId}:
                            </span>
                            <span> {item[translationId]}</span>
                          </>
                        )}
                      </div>
                    ))}
                    {isTranslator ? (
                      <label className="flex flex-col gap-2 rounded border border-dashed p-3">
                        <span className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={item.keyPath}
                            checked={selected?.source === "custom"}
                            onChange={() =>
                              onSelectionChange(item.keyPath, {
                                source: "custom",
                                value:
                                  selected?.source === "custom"
                                    ? selected.value
                                    : "",
                              })
                            }
                          />
                          <span>
                            Option 4: Enter your preferred translation
                          </span>
                        </span>
                        <Input
                          id={`custom-text-${item.keyPath}`}
                          type="text"
                          value={customValue}
                          placeholder="Enter your preferred translation"
                          onFocus={() =>
                            onSelectionChange(item.keyPath, {
                              source: "custom",
                              value: customValue,
                            })
                          }
                          onChange={(event) =>
                            onCustomValueChange(
                              item.keyPath,
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {diffItems.length > 50 ? (
          <p className="border-bs py-4 text-xs text-gray-600">
            Showing first 50 differences.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
