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
}: {
  jsonText: string;
  onJsonTextChange: (value: string) => void;
  onParse: () => void;
  isParsing: boolean;
  parseError?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>1) Upload or Paste i18next JSON</CardTitle>
        <CardDescription>Provide nested English JSON with string-only leaves.</CardDescription>
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
        <Button type="button" onClick={onParse} disabled={isParsing || !jsonText.trim()}>
          {isParsing ? "Parsing..." : "Parse JSON"}
        </Button>
      </CardContent>
    </Card>
  );
}
