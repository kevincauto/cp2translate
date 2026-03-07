import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiffItem } from "@/lib/types";

export function DiffViewer({ diffItems }: { diffItems: DiffItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>5) Differences</CardTitle>
        <CardDescription>{diffItems.length} keys need consultant review.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {diffItems.slice(0, 50).map((item) => (
          <div key={item.keyPath} className="rounded border p-3 text-sm">
            <p className="font-mono text-xs text-gray-700">{item.keyPath}</p>
            <p className="mt-1 text-xs text-gray-500">EN: {item.english}</p>
            <p className="mt-1">Translation A: {item.A}</p>
            <p>Translation B: {item.B}</p>
            <p>Translation C: {item.C}</p>
          </div>
        ))}
        {diffItems.length > 50 ? (
          <p className="text-xs text-gray-600">Showing first 50 differences.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
