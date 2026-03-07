"use client";

import { useMemo, useRef, useState } from "react";
import { AgentColumns } from "@/components/AgentColumns";
import { DiffViewer } from "@/components/DiffViewer";
import { LanguageSelectCard } from "@/components/LanguageSelectCard";
import { MatchMatrix } from "@/components/MatchMatrix";
import { UploadCard } from "@/components/UploadCard";
import { postSse } from "@/lib/client/sse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import section1Default from "@/app/section1.default.json";
import type {
  DiffItem,
  FlatEntry,
  MatchMatrix as MatchMatrixType,
  ProviderId,
  Recommendation,
  TranslationId,
  TranslationMap,
} from "@/lib/types";

type AppState =
  | "idle"
  | "parsed"
  | "languageSelected"
  | "translating"
  | "translated"
  | "compared"
  | "consulting"
  | "reviewed";

type TranslationProgress = Record<
  TranslationId,
  { keysDone: number; percent: number; status: string }
>;

type ParseResponse = {
  ok: boolean;
  flatEntries: FlatEntry[];
  warnings: Array<{ keyPath: string; message: string }>;
  totalKeys: number;
  error?: string;
};

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [jsonText, setJsonText] = useState(() => JSON.stringify(section1Default, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarnings, setParseWarnings] = useState<Array<{ keyPath: string; message: string }>>([]);
  const [flatEntries, setFlatEntries] = useState<FlatEntry[]>([]);
  const [selectedLocale, setSelectedLocale] = useState("es");
  const [translations, setTranslations] = useState<Record<TranslationId, TranslationMap>>({
    A: {},
    B: {},
    C: {},
  });
  const [progressByTranslation, setProgressByTranslation] = useState<TranslationProgress>({
    A: { keysDone: 0, percent: 0, status: "idle" },
    B: { keysDone: 0, percent: 0, status: "idle" },
    C: { keysDone: 0, percent: 0, status: "idle" },
  });
  const [matchMatrix, setMatchMatrix] = useState<MatchMatrixType | null>(null);
  const [diffItems, setDiffItems] = useState<DiffItem[]>([]);
  const [consultantProviderId, setConsultantProviderId] = useState<ProviderId>("anthropic");
  const [opinionChains, setOpinionChains] = useState<Record<string, Recommendation[]>>({});
  const [activeOpinionIndexByKey, setActiveOpinionIndexByKey] = useState<Record<string, number>>({});
  const [secondOpinionProviderByKey, setSecondOpinionProviderByKey] = useState<
    Record<string, ProviderId>
  >({});
  const [secondOpinionLoadingByKey, setSecondOpinionLoadingByKey] = useState<Record<string, boolean>>({});
  const [finalSelections, setFinalSelections] = useState<Record<string, TranslationId>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const translateAbortRef = useRef<AbortController | null>(null);
  const consultAbortRef = useRef<AbortController | null>(null);

  const locale = selectedLocale;
  const englishMap = useMemo(
    () => Object.fromEntries(flatEntries.map((item) => [item.keyPath, item.value])),
    [flatEntries],
  );

  const finalPreview = useMemo(() => {
    if (!flatEntries.length) {
      return null;
    }

    const merged: TranslationMap = { ...translations.A };
    const byDiffKey = new Map(diffItems.map((item) => [item.keyPath, item]));
    for (const item of diffItems) {
      const selectedSource = finalSelections[item.keyPath];
      const diff = byDiffKey.get(item.keyPath);
      if (selectedSource && diff) {
        merged[item.keyPath] = diff[selectedSource];
      }
    }
    return merged;
  }, [diffItems, finalSelections, flatEntries.length, translations.A]);

  const diffItemByKey = useMemo(() => new Map(diffItems.map((item) => [item.keyPath, item])), [diffItems]);

  async function handleParse() {
    setParseError(null);
    setGlobalError(null);
    const response = await fetch("/api/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonText }),
    });
    const payload = (await response.json()) as ParseResponse;

    if (!response.ok || !payload.ok) {
      setParseError(payload.error ?? "Parse failed.");
      return;
    }

    setFlatEntries(payload.flatEntries);
    setParseWarnings(payload.warnings ?? []);
    setState("parsed");
  }

  async function handleTranslate() {
    setGlobalError(null);
    setState("translating");
    setProgressByTranslation({
      A: { keysDone: 0, percent: 0, status: "starting" },
      B: { keysDone: 0, percent: 0, status: "starting" },
      C: { keysDone: 0, percent: 0, status: "starting" },
    });

    translateAbortRef.current?.abort();
    translateAbortRef.current = new AbortController();

    try {
      await postSse(
        "/api/translate/stream",
        {
          locale,
          flatEntries,
        },
        (event, data) => {
          if (event === "translationStarted") {
            const payload = data as { translationId: TranslationId; totalChunks: number };
            setProgressByTranslation((prev) => ({
              ...prev,
              [payload.translationId]: {
                ...prev[payload.translationId],
                percent: Math.max(prev[payload.translationId].percent, 3),
                status: "running",
              },
            }));
          }

          if (event === "chunkStarted") {
            const payload = data as {
              translationId: TranslationId;
              chunkIndex: number;
              totalChunks: number;
            };
            const chunkFloor = Math.round(((payload.chunkIndex + 0.2) / payload.totalChunks) * 100);
            setProgressByTranslation((prev) => ({
              ...prev,
              [payload.translationId]: {
                ...prev[payload.translationId],
                percent: Math.min(99, Math.max(prev[payload.translationId].percent, chunkFloor)),
                status: "running",
              },
            }));
          }

          if (event === "chunkCompleted") {
            const payload = data as {
              translationId: TranslationId;
              keysDone: number;
              keysTotal: number;
              chunkIndex: number;
              totalChunks: number;
            };
            setProgressByTranslation((prev) => ({
              ...prev,
              [payload.translationId]: {
                keysDone: payload.keysDone,
                percent: Math.min(99, Math.round((payload.keysDone / payload.keysTotal) * 100)),
                status: "running",
              },
            }));
          }

          if (event === "translationCompleted") {
            const payload = data as { translationId: TranslationId; keysDone: number };
            setProgressByTranslation((prev) => ({
              ...prev,
              [payload.translationId]: {
                keysDone: payload.keysDone,
                percent: 100,
                status: "done",
              },
            }));
          }

          if (event === "error") {
            const payload = data as { message: string };
            setGlobalError(payload.message);
          }

          if (event === "done") {
            const payload = data as {
              translations: Partial<Record<TranslationId, TranslationMap>>;
            };
            setTranslations({
              A: payload.translations.A ?? {},
              B: payload.translations.B ?? {},
              C: payload.translations.C ?? {},
            });
            setState("translated");
          }
        },
        translateAbortRef.current.signal,
      );
      translateAbortRef.current = null;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setGlobalError("Translation cancelled.");
        setState("languageSelected");
        return;
      }
      setGlobalError(error instanceof Error ? error.message : "Translation failed.");
      setState("languageSelected");
    }
  }

  async function handleCompare() {
    setGlobalError(null);
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        english: englishMap,
        translations,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setGlobalError(payload.error ?? "Compare failed.");
      return;
    }
    setMatchMatrix(payload.matchMatrix);
    setDiffItems(payload.diffItems);
    setOpinionChains({});
    setActiveOpinionIndexByKey({});
    setSecondOpinionProviderByKey({});
    setSecondOpinionLoadingByKey({});
    setFinalSelections({});
    setState("compared");
  }

  async function handleConsult() {
    setGlobalError(null);
    setState("consulting");

    consultAbortRef.current?.abort();
    consultAbortRef.current = new AbortController();

    try {
      await postSse(
        "/api/consult/stream",
        {
          locale,
          consultantProviderId,
          diffItems,
        },
        (event, data) => {
          if (event === "consultantCompleted") {
            const payload = data as { consultantProviderId: ProviderId; recommendations: Recommendation[] };
            const chainMap: Record<string, Recommendation[]> = {};
            const activeMap: Record<string, number> = {};
            const secondOpinionProviderMap: Record<string, ProviderId> = {};
            const defaults: Record<string, TranslationId> = {};
            payload.recommendations.forEach((rec) => {
              chainMap[rec.keyPath] = [rec];
              activeMap[rec.keyPath] = 0;
              secondOpinionProviderMap[rec.keyPath] = consultantProviderId;
              defaults[rec.keyPath] = rec.chosen;
            });
            setOpinionChains(chainMap);
            setActiveOpinionIndexByKey(activeMap);
            setSecondOpinionProviderByKey(secondOpinionProviderMap);
            setFinalSelections(defaults);
          }

          if (event === "error") {
            const payload = data as { message: string };
            setGlobalError(payload.message);
          }

          if (event === "done") {
            setState("reviewed");
          }
        },
        consultAbortRef.current.signal,
      );
      consultAbortRef.current = null;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setGlobalError("Consulting cancelled.");
        setState("compared");
        return;
      }
      setGlobalError(error instanceof Error ? error.message : "Consulting failed.");
      setState("compared");
    }
  }

  async function handleDownload() {
    if (!finalPreview) {
      return;
    }

    const response = await fetch("/api/assemble", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        english: englishMap,
        finalTranslations: finalPreview,
        locale,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      setGlobalError(payload.error ?? "Assemble failed.");
      return;
    }

    const blob = new Blob([JSON.stringify(payload.nestedJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `translation.${locale}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleSecondOpinion(keyPath: string) {
    const diffItem = diffItemByKey.get(keyPath);
    const selectedProvider = secondOpinionProviderByKey[keyPath] ?? consultantProviderId;
    if (!diffItem) {
      return;
    }

    setSecondOpinionLoadingByKey((prev) => ({ ...prev, [keyPath]: true }));
    setGlobalError(null);

    try {
      await postSse(
        "/api/consult/stream",
        {
          locale,
          consultantProviderId: selectedProvider,
          diffItems: [diffItem],
        },
        (event, data) => {
          if (event === "consultantCompleted") {
            const payload = data as { recommendations: Recommendation[] };
            const rec = payload.recommendations[0];
            if (!rec) {
              return;
            }

            setOpinionChains((prev) => {
              const prior = prev[keyPath] ?? [];
              const nextChain = [...prior, rec];
              return {
                ...prev,
                [keyPath]: nextChain,
              };
            });
            setActiveOpinionIndexByKey((prev) => {
              const priorIndex = prev[keyPath] ?? 0;
              const nextIndex = priorIndex + 1;
              return {
                ...prev,
                [keyPath]: nextIndex,
              };
            });
            setFinalSelections((prev) => ({
              ...prev,
              [keyPath]: rec.chosen,
            }));
            setState("reviewed");
          }

          if (event === "error") {
            const payload = data as { message: string };
            setGlobalError(payload.message);
          }
        },
      );
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Second opinion failed.");
    } finally {
      setSecondOpinionLoadingByKey((prev) => ({ ...prev, [keyPath]: false }));
    }
  }

  function buildOptionSet(rec: Recommendation) {
    const sourceSet = new Set<TranslationId>([rec.chosen, ...rec.alternatives.map((alt) => alt.source)]);
    const allSources = Array.from(sourceSet) as TranslationId[];
    const ordered = [rec.chosen, ...allSources.filter((source) => source !== rec.chosen)].slice(0, 3);

    return ordered.map((source, index) => {
      const label = index === 0 ? "A" : index === 1 ? "B" : "C";
      if (source === rec.chosen) {
        return {
          label,
          source,
          translation: rec.translation,
          meaningInEnglish: "Recommended option",
          explanation: rec.explanation,
          isRecommended: true,
        };
      }

      const alternative = rec.alternatives.find((alt) => alt.source === source);
      return {
        label,
        source,
        translation: alternative?.translation ?? "",
        meaningInEnglish: alternative?.meaningInEnglish ?? "No English meaning provided.",
        explanation: alternative?.explanation ?? "No additional explanation provided.",
        isRecommended: false,
      };
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold">LLM i18next Translation Web App</h1>
        <p className="text-sm text-gray-600">State: {state}</p>
      </header>

      <UploadCard
        jsonText={jsonText}
        onJsonTextChange={setJsonText}
        onParse={handleParse}
        isParsing={false}
        parseError={parseError}
      />

      {parseWarnings.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Security Warnings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {parseWarnings.map((warning) => (
              <p key={`${warning.keyPath}-${warning.message}`}>
                {warning.keyPath}: {warning.message}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {state !== "idle" ? (
        <LanguageSelectCard
          selectedLocale={selectedLocale}
          onSelectedLocaleChange={setSelectedLocale}
          onConfirm={() => setState("languageSelected")}
        />
      ) : null}

      {(state === "languageSelected" ||
        state === "translating" ||
        state === "translated" ||
        state === "compared" ||
        state === "consulting" ||
        state === "reviewed") ? (
        <Card>
          <CardHeader>
            <CardTitle>3) Translation Run</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" onClick={handleTranslate} disabled={state === "translating"}>
              {state === "translating" ? "Translating..." : "Run 3 Translators"}
            </Button>
            {state === "translating" ? (
              <Button type="button" variant="outline" onClick={() => translateAbortRef.current?.abort()}>
                Cancel Translation
              </Button>
            ) : null}
            <AgentColumns progressByTranslation={progressByTranslation} totalKeys={flatEntries.length} />
          </CardContent>
        </Card>
      ) : null}

      {(state === "translated" || state === "compared" || state === "consulting" || state === "reviewed") ? (
        <Card>
          <CardHeader>
            <CardTitle>Compare Outputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button type="button" onClick={handleCompare}>
              Compute Match + Diffs
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {(state === "compared" || state === "consulting" || state === "reviewed") ? (
        <>
          <MatchMatrix matrix={matchMatrix} />
          <DiffViewer diffItems={diffItems} />
          <Card>
            <CardHeader>
              <CardTitle>6) Consultant Review + Final Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="consultant-model">
                    Consultant model
                  </label>
                  <Select
                    id="consultant-model"
                    value={consultantProviderId}
                    onChange={(event) => setConsultantProviderId(event.target.value as ProviderId)}
                    disabled={state === "consulting"}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </Select>
                </div>
                <Button type="button" onClick={handleConsult} disabled={state === "consulting"}>
                  {state === "consulting" ? "Running Consultant..." : "Run Consultant Agent"}
                </Button>
              </div>

              {state === "consulting" ? (
                <Button type="button" variant="outline" onClick={() => consultAbortRef.current?.abort()}>
                  Cancel Consulting
                </Button>
              ) : null}

              {Object.keys(opinionChains).length > 0 ? (
                <div className="space-y-4">
                  {diffItems.map((diffItem) => {
                    const chain = opinionChains[diffItem.keyPath] ?? [];
                    const activeIndex = activeOpinionIndexByKey[diffItem.keyPath] ?? 0;
                    if (chain.length === 0) {
                      return null;
                    }

                    return (
                      <div key={diffItem.keyPath} className="rounded border p-3 text-sm">
                        {chain.map((rec, chainIndex) => {
                          const options = buildOptionSet(rec);
                          const disabled = chainIndex !== activeIndex;
                          const isActive = !disabled;
                          return (
                            <div
                              key={`${rec.keyPath}-opinion-${chainIndex}`}
                              className={`mb-3 rounded border p-3 ${
                                disabled ? "bg-gray-50 opacity-65" : "bg-white"
                              }`}
                            >
                              <p className="font-mono text-xs text-gray-700">
                                id: {rec.keyPath} {isActive ? "(active opinion)" : "(disabled opinion)"}
                              </p>
                              <p className="mt-1">
                                <strong>English:</strong> {rec.english}
                              </p>
                              <p>
                                <strong>Recommended:</strong> {rec.english} {"->"} {rec.translation}
                              </p>
                              <p className="mt-1 text-xs text-gray-700">{rec.explanation}</p>

                              <div className="mt-3 space-y-2">
                                {options.map((option) => (
                                  <div key={`${rec.keyPath}-${chainIndex}-${option.label}`} className="rounded bg-gray-50 p-2">
                                    <label className="flex items-start gap-2">
                                      <input
                                        type="radio"
                                        name={`${rec.keyPath}-${chainIndex}`}
                                        disabled={disabled}
                                        checked={finalSelections[rec.keyPath] === option.source && isActive}
                                        onChange={() =>
                                          setFinalSelections((prev) => ({
                                            ...prev,
                                            [rec.keyPath]: option.source,
                                          }))
                                        }
                                      />
                                      <span>
                                        <strong>
                                          Choice {option.label}
                                          {option.isRecommended ? " (recommended)" : ""}
                                        </strong>{" "}
                                        [Translation {option.source}]
                                        <br />
                                        {rec.english} {"->"} {option.translation}
                                      </span>
                                    </label>
                                    {!option.isRecommended ? (
                                      <p className="mt-1 text-xs text-gray-700">
                                        Meaning in English: {option.meaningInEnglish}
                                        <br />
                                        Why not this choice? {option.explanation}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>

                              {isActive ? (
                                <div className="mt-3 rounded border border-dashed p-2">
                                  <p className="text-xs font-medium">Choice D: Get a second opinion</p>
                                  <div className="mt-2 grid gap-2 md:grid-cols-[1fr_auto] md:items-end">
                                    <div className="space-y-1">
                                      <label
                                        className="text-xs font-medium"
                                        htmlFor={`second-opinion-model-${rec.keyPath}`}
                                      >
                                        Model
                                      </label>
                                      <Select
                                        id={`second-opinion-model-${rec.keyPath}`}
                                        value={
                                          secondOpinionProviderByKey[rec.keyPath] ?? consultantProviderId
                                        }
                                        onChange={(event) =>
                                          setSecondOpinionProviderByKey((prev) => ({
                                            ...prev,
                                            [rec.keyPath]: event.target.value as ProviderId,
                                          }))
                                        }
                                        disabled={Boolean(secondOpinionLoadingByKey[rec.keyPath])}
                                      >
                                        <option value="openai">OpenAI</option>
                                        <option value="gemini">Google Gemini</option>
                                        <option value="anthropic">Anthropic Claude</option>
                                      </Select>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      disabled={Boolean(secondOpinionLoadingByKey[rec.keyPath])}
                                      onClick={() => handleSecondOpinion(rec.keyPath)}
                                    >
                                      {secondOpinionLoadingByKey[rec.keyPath]
                                        ? "Getting second opinion..."
                                        : "Give me a second opinion"}
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        <div className="text-xs text-gray-600">Opinion count: {chain.length}</div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="pt-2">
                <Button onClick={handleDownload} disabled={!finalPreview || Object.keys(opinionChains).length === 0}>
                  Download Final JSON
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {globalError ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-red-700">{globalError}</p>
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

