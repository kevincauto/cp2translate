import { useContext } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DiffItem } from "@/lib/types";
import { AppContext } from "@/app/page";
import { Input } from "@/components/ui/input";

export function DiffViewer({
  diffItems,
  onChange,
}: {
  diffItems: DiffItem[];
  onChange: (item: string) => void;
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
          keys need consultant review.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {diffItems.slice(0, 50).map((item, i) => (
            <li key={item.keyPath} className="">
              <div className="inline-block px-6 py-3 text-sm flex flex-col gap-2">
                <p className="relative">
                  <span className="absolute top right-[101%] text-md">
                    {i + 1})
                  </span>
                  <span className="font-mono font-semibold text-md text-blue-700">
                    {item.keyPath}
                  </span>
                  : <span className="mt-1 text-md">"{item.english}"</span>
                </p>
                <div className="flex flex-col gap-2 mt-2">
                  <div>
                    {isTranslator ? (
                      <>
                        <input
                          type="radio"
                          value={item.A}
                          name="diff-select-group"
                          onChange={(e) => onChange(e.target.value)}
                        />
                        &nbsp;
                        <label htmlFor={item.A} className="mt-1">
                          Translation A: {item.A}
                        </label>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-700">Translation A:</span>
                        <span className=""> {item.A}</span>
                      </>
                    )}
                  </div>
                  <div>
                    {isTranslator ? (
                      <>
                        <input
                          type="radio"
                          value={item.B}
                          name="diff-select-group"
                          onChange={(e) => onChange(e.target.value)}
                        />
                        &nbsp;
                        <label htmlFor={item.B} className="mt-1">
                          Translation B: {item.B}
                        </label>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-700">Translation B:</span>
                        <span className=""> {item.B}</span>
                      </>
                    )}
                  </div>
                  <div>
                    {isTranslator ? (
                      <>
                        <input
                          type="radio"
                          value={item.C}
                          name="diff-select-group"
                          onChange={(e) => onChange(e.target.value)}
                        />
                        &nbsp;
                        <label htmlFor={item.C} className="mt-1">
                          Translation C: {item.C}
                        </label>
                      </>
                    ) : (
                      <span className="text-gray-700">
                        Translation C: {item.C}
                      </span>
                    )}
                  </div>
                  {isTranslator && (
                    <div>
                      <label htmlFor="custom-text">
                        Or enter your preferred translation:
                      </label>
                      <Input id="custom-text" type="text" />
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
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
