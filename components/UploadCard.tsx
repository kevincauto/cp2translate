"use client";

import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function UploadCard({
  jsonText,
  onJsonTextChange,
  onParse,
  isParsing,
  parseError,
  warnings
}: {
  jsonText: string;
  onJsonTextChange: (value: string) => void;
  onParse: () => void;
  isParsing: boolean;
  parseError?: string | null;
  warnings: Array<{ keyPath: string; message: string }>
}) {

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload or paste JSON translation file</CardTitle>
        <CardDescription>Provide the English-based file with unique translation keys or just process the sample JSON in the text area below</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Upload JSON File
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }
              const text = await file.text();
              onJsonTextChange(text);
            }}
          />
        </div>
        <Textarea
          value={jsonText}
          onChange={(event) => onJsonTextChange(event.target.value)}
          placeholder='{"common":{"welcome":"Hello {name}"}}'
          className="min-h-44 font-mono"
        />
        {parseError ? <p className="text-sm text-red-700">{parseError}</p> : null}
        <Button type="button" onClick={onParse} disabled={(isParsing || !jsonText.trim())}>
          {isParsing ? "Parsing..." : "Process JSON File"}
        </Button>

        { !!warnings.length &&
          <>
            <hr></hr>
            <div>
              <h4 className="text-orange-700">Security Warnings</h4>
              <p className="text-xs">If there are any keys that resemble sensitive data, they'll be listed below.</p>
              <ol className="text-sm list-decimal list-inside mt-4">
                {warnings.map((warning) => (
                  <li className="mb-2" key={`${warning.keyPath}-${warning.message}`}>
                    <span className="font-semibold text-orange-700">{warning.keyPath}</span>: {warning.message}
                  </li>
                ))}
              </ol>
          </div>
          </>
      }
      </CardContent>
    </Card>
  );
}
