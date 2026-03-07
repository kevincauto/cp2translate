"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { COMMON_LOCALES } from "@/lib/client/locales";

export function LanguageSelectCard({
  selectedLocale,
  onSelectedLocaleChange,
  onConfirm,
}: {
  selectedLocale: string;
  onSelectedLocaleChange: (value: string) => void;
  onConfirm: () => void;
}) {
  const selectedLabel = COMMON_LOCALES.find((locale) => locale.code === selectedLocale)?.label;
  return (
    <Card>
      <CardHeader>
        <CardTitle>2) Select Target Locale</CardTitle>
        <CardDescription>Choose the language you want to translate into.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="locale-select">
            Language
          </label>
          <Select
            id="locale-select"
            value={selectedLocale}
            onChange={(event) => onSelectedLocaleChange(event.target.value)}
          >
            {COMMON_LOCALES.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.label}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-sm text-gray-600">Selected: {selectedLabel ?? "—"}</p>
        <Button type="button" onClick={onConfirm} disabled={!selectedLocale}>
          Confirm Locale
        </Button>
      </CardContent>
    </Card>
  );
}
