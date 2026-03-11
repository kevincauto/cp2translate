"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { COMMON_LOCALES } from "@/lib/client/locales";

export function LanguageSelectCard({
  selectedLocale,
  onSelectedLocaleChange,
  disabled
}: {
  selectedLocale: string;
  onSelectedLocaleChange: (value: string) => void;
  disabled?: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Select target language</CardTitle>
        <CardDescription>Choose the language you want to translate into.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Select
            id="locale-select"
            value={selectedLocale}
            onChange={(event) => onSelectedLocaleChange(event.target.value)}
            disabled={disabled}
          >
            { !selectedLocale && <option key={''} value={''}>
                Select langauge
              </option>
              }
            {COMMON_LOCALES.map((locale) => (
              <option key={locale.code} value={locale.code}>
                {locale.label}
              </option>
            ))}
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
