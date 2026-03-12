# CP2Translate - Detailed App Breakdown

This document explains the app end-to-end so it can be rebuilt from scratch. It covers architecture, tech stack, APIs, UI flow, data contracts, prompts, validation, and tests.

## 1) Product Overview

This app translates nested i18next JSON with a multi-agent LLM workflow:

1. Parse and flatten nested English JSON.
2. Run 3 translator agents in parallel (A, B, C).
3. Compare outputs and isolate only keys where translations differ.
4. Run a consultant agent to recommend best options for diff keys.
5. Let the user override choices and request second opinions.
6. Rebuild nested JSON and download final locale file.

Important constraints:

- Uploaded JSON is processed in memory only.
- API keys stay server-side.
- Leaf values must be strings.
- Placeholder tokens (`{name}`, `{{value}}`) must be preserved.

## 2) Tech Stack

### Framework and Language
- Next.js App Router (`next`)
- React 19
- TypeScript (strict mode)

### Styling/UI
- Tailwind CSS v4 (`@import "tailwindcss"`)
- In-repo UI primitives (`button`, `card`, `input`, `select`, `textarea`, `badge`)
- Utility libraries:
  - `class-variance-authority`
  - `clsx`
  - `tailwind-merge`

### Runtime Validation
- `zod` for request schema parsing and defensive checks.

### LLM Providers
- OpenAI (`openai`)
- Google Gemini (`@google/genai`)
- Anthropic (`@anthropic-ai/sdk`)

### Streaming
- Server-Sent Events using `ReadableStream` in route handlers.
- Custom client POST+SSE parser in `lib/client/sse.ts`.

### Testing
- Vitest (`vitest`)
- Coverage via V8 provider.

## 3) Build and Configuration

### NPM scripts
- `npm run dev` - start local server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
- `npm run test` - run Vitest tests

### Environment variables

From `.env.example`:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_MODEL` (default `gpt-4.1-mini`)
- `GEMINI_MODEL` (default `gemini-2.5-flash`)
- `ANTHROPIC_MODEL` (default `claude-3-5-sonnet-latest`)

Provider enablement is dynamic: a provider is considered configured only if its API key exists.

## 4) Directory and File Responsibilities

### App entry and global setup
- `app/layout.tsx`: metadata + root layout.
- `app/globals.css`: design tokens + base styles + running dots animation.
- `app/page.tsx`: full workflow orchestration (main client component).
- `app/shortened-en.json`: sample i18next JSON used as initial textarea content.

### API routes
- `app/api/parse/route.ts`: validate + flatten + warning detection.
- `app/api/translate/stream/route.ts`: streaming parallel translation with retries.
- `app/api/compare/route.ts`: match matrix + diff computation.
- `app/api/consult/stream/route.ts`: streaming consultant recommendations.
- `app/api/assemble/route.ts`: final validation + unflatten nested JSON.

### Domain logic
- `lib/i18n/flatten.ts`: flatten/unflatten + map conversion.
- `lib/i18n/tokens.ts`: token extraction and equality checks.
- `lib/i18n/validate.ts`: translation map validation.
- `lib/chunking/chunk.ts`: adaptive chunk sizing.
- `lib/compare/compare.ts`: match matrix + diff extraction.
- `lib/llm/prompts.ts`: translator and consultant prompt builders.
- `lib/llm/json.ts`: robust JSON extraction from model output.
- `lib/llm/providers/*`: provider adapters and provider map.
- `lib/security/warnings.ts`: key-name security warning detection.
- `lib/errors.ts`: user-friendly model/provider error messages.
- `lib/sse.ts`: server SSE formatting utility.
- `lib/client/sse.ts`: client-side SSE stream parser.
- `lib/translations.ts`: A/B/C mapping to providers.
- `lib/types.ts`: shared type contracts.

### UI components
- Workflow UI:
  - `components/UploadCard.tsx`
  - `components/LanguageSelectCard.tsx`
  - `components/AgentColumns.tsx`
  - `components/AgentColumn.tsx`
  - `components/MatchMatrix.tsx`
  - `components/DiffViewer.tsx`
- Present but currently not mounted by `app/page.tsx`:
  - `components/ConsultantPanel.tsx`
  - `components/FinalJsonViewer.tsx`

## 5) Domain Model (Types)

Defined in `lib/types.ts`.

- `TranslationId`: `"A" | "B" | "C"`
- `ProviderId`: `"openai" | "gemini" | "anthropic"`
- `FlatEntry`:
  - `keyPath`: dotted i18n key (example: `dashboard.metrics.totalVolume`)
  - `value`: English source string
  - `meta.tokens`: placeholders extracted from source
  - `meta.hasHtmlLikeTags`
  - `meta.hasNewlines`
- `TranslationMap`: `Record<string, string>`
- `DiffItem`: key + English + A/B/C candidate texts
- `Recommendation`: consultant decision shape:
  - chosen source
  - recommended translation text
  - explanation
  - alternative explanations
- `MatchMatrix`: pairwise percentage matrix among A/B/C

## 6) Frontend State Machine

The main page uses:

- `idle`
- `parsed`
- `languageSelected`
- `translating`
- `translated`
- `compared`
- `consulting`
- `reviewed`

Flow:

1. `idle` -> user enters JSON.
2. Parse success -> `parsed`.
3. Locale confirm -> `languageSelected`.
4. Start translation stream -> `translating`.
5. Translation stream done -> `translated`.
6. Compare done -> `compared`.
7. Consultant stream running -> `consulting`.
8. Consultant done -> `reviewed`.

Abort support exists for both translation and consulting streams via `AbortController`.

## 7) API Endpoints (Detailed)

### 7.1 `POST /api/parse`

Purpose: Validate payload, parse JSON, flatten nested keys, and flag suspicious key names.

Accepted body:
- `{ jsonText?: string, json?: unknown }` (must provide one)

Processing:
1. Parse with Zod schema.
2. If `jsonText` exists, run `JSON.parse`.
3. Flatten object recursively:
   - branch nodes must be plain objects
   - leaf nodes must be strings
4. Derive per-entry metadata:
   - token list
   - has HTML-like tags
   - has newlines
5. Run suspicious key detection regex:
   - matches `secret|token|password|passwd|apikey|api_key`

Success response:
- `{ ok: true, flatEntries, warnings, totalKeys }`

Failure:
- 400 + `{ ok: false, error }`

### 7.2 `POST /api/translate/stream`

Purpose: Translate all keys with available providers and stream progress.

Accepted body:
- `locale: string`
- `flatEntries: FlatEntry[]`
- optional tuning:
  - `chunkMin`
  - `chunkMax`
  - `retryLimit` (0..3, default 1)

Execution model:
1. Determine configured providers.
2. Filter translation lanes A/B/C to only those with configured provider.
3. Chunk entries adaptively:
   - defaults: min 50, max 150
4. For each enabled lane (parallel):
   - stream `translationStarted`
   - for each chunk:
     - stream `chunkStarted`
     - call provider `translateChunk`
     - validate output map:
       - all required keys present
       - no extra keys
       - non-empty strings
       - placeholder tokens preserved
     - on success stream `chunkCompleted`
     - on repeated failure stream `error` for that chunk/lane
   - stream `translationCompleted`
5. Stream final `done` with all collected maps.

SSE events emitted:
- `translationStarted`
- `chunkStarted`
- `chunkCompleted`
- `translationCompleted`
- `error`
- `done`

Response headers:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`

### 7.3 `POST /api/compare`

Purpose: Compute pairwise similarity and diff set for consultant review.

Accepted body:
- `english: TranslationMap`
- `translations: { A: TranslationMap, B: TranslationMap, C: TranslationMap }`

Processing:
1. Fill missing translation keys with empty string for each lane.
2. Build match matrix:
   - normalize by trim + collapse whitespace
   - pairwise exact-equality percentage
3. Build diff items:
   - if normalized A/B/C are not all equal, include key in `diffItems`.

Success response:
- `{ ok: true, matchMatrix, diffItems, diffCount }`

### 7.4 `POST /api/consult/stream`

Purpose: Use chosen consultant provider to decide best option for each diff key.

Accepted body:
- `locale`
- `consultantProviderId: "openai" | "gemini" | "anthropic"`
- `diffItems: DiffItem[]`

Processing:
1. Ensure chosen consultant provider is configured.
2. Stream `consultantStarted`.
3. Call `provider.consultDiff`.
4. Validate result array with Zod recommendation schema.
5. Normalize results against requested diff keys:
   - inject fallback recommendations when missing
   - ensure non-chosen alternatives exist for all other sources
   - fill missing explanation fields with defaults
6. Stream `consultantCompleted` and `done`.
7. On error, stream `error` then `done` with empty recommendations.

SSE events emitted:
- `consultantStarted`
- `consultantCompleted`
- `error`
- `done`

### 7.5 `POST /api/assemble`

Purpose: Construct final nested locale JSON for download.

Accepted body:
- `english: TranslationMap`
- `finalTranslations: TranslationMap`
- `locale: string`

Validation:
- every key in `english` must exist in `finalTranslations`
- each final value must be non-empty after trim

Processing:
- unflatten dotted key paths to nested object

Success:
- `{ ok: true, locale, nestedJson }`

## 8) LLM Provider Abstraction

Interface (`lib/llm/providers/types.ts`):

- `translateChunk(input) => Promise<TranslationMap>`
- `consultDiff(input) => Promise<Recommendation[]>`
- plus metadata:
  - `providerId`
  - `isConfigured`

Concrete adapters:
- `OpenAiProvider`
- `GeminiProvider`
- `AnthropicProvider`

Each adapter:
1. Reads API key and model from env.
2. Sends prompt text generated by `lib/llm/prompts.ts`.
3. Extracts JSON from provider text using `extractJsonPayload`.
4. Asserts expected top-level shape (object for translation, array for consultant).

Provider registry:
- `getProviderMap()`
- `getConfiguredProviders()`

## 9) Prompt Strategy

### Translator prompt
- Declares translator role.
- Sets target locale.
- Enforces strict rules:
  - same keys
  - preserve placeholders
  - preserve HTML/newlines semantics
  - no empty strings
  - output JSON only (no markdown)
- Appends input JSON object for current chunk.

### Consultant prompt
- Declares reviewer role.
- Requires English explanations.
- Requires choosing A/B/C for each item.
- Requires justification for chosen and non-chosen options.
- Requires strict JSON array output shape with alternatives.

## 10) JSON Extraction and Robustness

`extractJsonPayload` handles non-ideal model responses by trying, in order:

1. Full response parse if text starts with `{` or `[`.
2. JSON fenced code block parse.
3. Scan for first `{` or `[` and progressively parse decreasing prefixes until valid JSON is found.

This protects against extra prose or malformed wrappers.

## 11) Validation Rules

Translation validation (`validateTranslationMap`) enforces:

1. All source keys exist in translated map.
2. No unexpected translated keys exist.
3. Every translated value is a non-empty string.
4. Placeholder token sets match source exactly.

Token regex supports both:
- `{token}`
- `{{token}}`

Token equality is set-like with sorting for deterministic comparison.

## 12) Chunking Strategy

`chunkEntries(entries, { minSize, maxSize })`:

- Defaults:
  - min `50`
  - max `150`
- If total entries <= max: one chunk.
- Else:
  1. compute needed chunk count from max
  2. derive target size respecting min
  3. slice entries in fixed-size windows

This reduces model payload size while keeping throughput reasonable.

## 13) Compare and Diff Logic

Normalization for equality checks:
- trim
- collapse repeated whitespace to a single space

Match matrix:
- exact match percentage over same key set.
- self match hardcoded as `100`.

Diff items:
- include key when normalized A/B/C are not identical.
- only these keys go to consultant, which limits cost and human review load.

## 14) UI Breakdown

### Upload card
- Paste or upload JSON file.
- Shows parse errors inline.

### Language selection
- Fixed common locale list from `lib/client/locales.ts`.

### Translation run section
- Starts SSE translation run.
- Shows cancel button during active run.
- Displays 3 progress cards with:
  - percentage
  - translated key count
  - provider label/status

### Compare section
- Button to compute match matrix + diffs.

### Match matrix
- Tabular pairwise percentages across A/B/C.

### Diff viewer
- Shows up to first 50 differing keys with English + A/B/C values.

### Consultant + final selection
- Select consultant model.
- Run consultant stream.
- For each diff key:
  - see recommended option and explanation
  - select from A/B/C radios
  - request second opinion (Choice D) from selected model
  - opinion chain keeps prior recommendations disabled and latest active
- Final download enabled only when recommendations exist and final preview map is built.

## 15) Error Handling Behavior

- Parse/compare/assemble use JSON 400 responses for validation errors.
- Streaming routes emit `error` SSE events and continue/close safely.
- `humanizeModelError` maps common provider failures:
  - rate limit/429 -> retry guidance
  - auth/401/api key -> configuration guidance
- Client has global error surface in main page.
- Abort actions return user-friendly cancellation messages.

## 16) Security Posture

Current safeguards:
- API keys never exposed to client.
- In-memory processing, no persistence layer.
- Suspicious key-name warnings for potential credentials.
- Token preservation checks reduce placeholder corruption.

Current limitations:
- No auth/session model.
- No request throttling/rate limiting.
- No persistent audit logs.
- No server-side storage for review history.

## 17) Testing Coverage

Current tests verify:

- Flatten/unflatten roundtrip (`tests/flatten.test.ts`)
- Chunk sizing constraints (`tests/chunking.test.ts`)
- Match matrix and diff extraction (`tests/compare.test.ts`)
- Token mismatch detection and pass case (`tests/tokens-validate.test.ts`)

Gaps worth adding:

- API route integration tests (parse/translate/consult/assemble)
- SSE event-order and partial-failure behavior tests
- Provider adapter mock tests for malformed model outputs
- UI interaction tests for opinion chaining and second-opinion flow

## 18) Rebuild From Scratch Plan

If rebuilding fresh, use this order:

1. **Bootstrap project**
   - Create Next.js + TypeScript app (App Router).
   - Add Tailwind, Zod, Vitest, provider SDKs.

2. **Define domain contracts**
   - Implement `lib/types.ts`.
   - Implement translation lane mapping in `lib/translations.ts`.

3. **Build i18n utilities**
   - flatten/unflatten
   - token extraction helpers
   - translation map validator
   - chunking utility
   - compare utility

4. **Implement provider abstraction**
   - shared interface
   - OpenAI/Gemini/Anthropic adapters
   - provider registry filtered by configured API keys
   - JSON extraction helper for model responses

5. **Create prompts**
   - translator prompt with strict preservation rules
   - consultant prompt with deterministic output schema requirements

6. **Build API routes**
   - `/api/parse`
   - `/api/translate/stream`
   - `/api/compare`
   - `/api/consult/stream`
   - `/api/assemble`

7. **Build client streaming helper**
   - POST request + incremental SSE parser + callback dispatch

8. **Build UI components**
   - upload/paste + parse
   - locale selection
   - translation progress columns
   - compare and diff views
   - consultant review and second-opinion controls
   - download action

9. **Implement page orchestrator**
   - state machine
   - API calls and stream handling
   - opinion chain and final selection logic
   - derived final preview map

10. **Add tests and polish**
   - utility unit tests first
   - route integration tests
   - error/abort UX checks
   - lint, typecheck, and deploy

## 19) Notes on Unused/Extra Components

`components/ConsultantPanel.tsx` and `components/FinalJsonViewer.tsx` exist but are not currently rendered in `app/page.tsx`. They appear to be earlier/alternative UI pieces that can be removed or reintroduced depending on the desired final UX.

## 20) Quick Mental Model

Think of the app as a pipeline:

- **Normalize input** -> **Generate 3 independent translations** -> **Quantify agreement** -> **Escalate disagreements to a consultant** -> **Human-in-the-loop final choice** -> **Export production-ready nested locale JSON**.

