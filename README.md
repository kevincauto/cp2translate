# CP2Translate

LLM-assisted i18next translation workbench built with Next.js. The app accepts an English nested JSON file, fans translation out to three model-backed lanes, compares the outputs, runs consultant review on only the disagreements, and rebuilds a downloadable locale JSON.

This README reflects the current implementation in the repository, not just the original Hack Week spec.

## What The App Does

- Uploads or pastes nested English i18next JSON.
- Flattens nested keys into dotted key paths.
- Runs up to three translation lanes in parallel:
  - `A` -> OpenAI
  - `B` -> Gemini
  - `C` -> Anthropic
- Streams chunk-level translation progress over Server-Sent Events.
- Validates returned translations for key coverage, non-empty values, and placeholder preservation.
- Compares A/B/C outputs and isolates only keys where translations differ.
- Runs a consultant model against those differing keys.
- Supports per-key second opinions from another provider.
- Reassembles the final flat map into nested locale JSON for download.

## Current Workflow

The main user flow is:

1. Choose a persona.
2. Choose a target locale.
3. Upload or paste an English JSON file.
4. Parse and validate the file.
5. Run the translation lanes.
6. Compute match percentages and diffs.
7. Run consultant review on the differing keys.
8. Optionally request second opinions per key.
9. Download the final nested JSON.

For the non-translator persona, this flow is implemented end to end.

For the translator persona, the diff viewer shows manual choice controls, but the selection workflow is not fully wired yet. The current download path lives inside the consultant-driven review flow.

## Architecture

### Frontend

- Next.js App Router with a single client entry point in `app/page.tsx`
- React 19 + TypeScript
- Tailwind CSS v4
- In-repo UI primitives under `components/ui`
- SSE client helper in `lib/client/sse.ts`

### Backend

- Route handlers under `app/api`
- Zod request validation
- Provider adapters for OpenAI, Gemini, and Anthropic under `lib/llm/providers`
- Shared translation, diffing, flattening, validation, and SSE utilities under `lib`

### Data Flow

1. `POST /api/parse` validates and flattens the uploaded JSON.
2. `POST /api/translate/stream` chunks the flat entries and translates them in parallel.
3. `POST /api/compare` computes pairwise match percentages and diff items.
4. `POST /api/consult/stream` asks a consultant provider to recommend the best candidate per diff.
5. `POST /api/assemble` rebuilds the final flat map into nested JSON.

## Project Structure

```text
app/
   api/
      assemble/route.ts
      compare/route.ts
      consult/stream/route.ts
      parse/route.ts
      translate/stream/route.ts
   page.tsx
   shortened-en.json
components/
   AgentColumns.tsx
   DiffViewer.tsx
   LanguageSelectCard.tsx
   PersonaCard.tsx
   UploadCard.tsx
lib/
   chunking/
   client/
   compare/
   i18n/
   llm/
   security/
   errors.ts
   sse.ts
   translations.ts
   types.ts
tests/
```

Two components exist in the repository but are not currently mounted in the main page: `components/ConsultantPanel.tsx` and `components/FinalJsonViewer.tsx`. Their behavior is effectively implemented inline in `app/page.tsx` instead.

## API Reference

### `POST /api/parse`

Validates the request, parses JSON, flattens nested i18next keys, and returns key-level warnings.

Request body:

```json
{
  "jsonText": "{\"common\":{\"welcome\":\"Hello {name}\"}}"
}
```

Success response:

```json
{
  "ok": true,
  "flatEntries": [
    {
      "keyPath": "common.welcome",
      "value": "Hello {name}",
      "meta": {
        "tokens": ["{name}"],
        "hasHtmlLikeTags": false,
        "hasNewlines": false
      }
    }
  ],
  "warnings": [],
  "totalKeys": 1
}
```

### `POST /api/translate/stream`

Runs the configured translation lanes in parallel and streams progress events.

Request body:

```json
{
  "locale": "es",
  "flatEntries": [],
  "chunkMin": 50,
  "chunkMax": 150,
  "retryLimit": 1
}
```

SSE events:

- `translationStarted`
- `chunkStarted`
- `chunkCompleted`
- `translationCompleted`
- `error`
- `done`

Notes:

- Only configured providers are used.
- If no providers are configured, the route returns a `400` error.
- Translation validation rejects missing keys, extra keys, empty strings, and placeholder mismatches.

### `POST /api/compare`

Builds pairwise A/B/C match percentages and a list of keys where the normalized outputs differ.

Request body:

```json
{
  "english": {
    "common.welcome": "Hello"
  },
  "translations": {
    "A": {
      "common.welcome": "Hola"
    },
    "B": {
      "common.welcome": "Hola"
    },
    "C": {
      "common.welcome": "Saludos"
    }
  }
}
```

Success response includes:

- `matchMatrix`
- `matchCounts`
- `diffItems`
- `diffCount`

### `POST /api/consult/stream`

Runs consultant review on diff items only.

Request body:

```json
{
  "locale": "es",
  "consultantProviderId": "openai",
  "diffItems": []
}
```

SSE events:

- `consultantStarted`
- `consultantCompleted`
- `error`
- `done`

If the consultant response is incomplete, the server normalizes it and fills missing recommendations with fallback values so the UI can still render a decision set.

### `POST /api/assemble`

Validates the final flat translation map and reconstructs nested JSON for download.

Request body:

```json
{
  "locale": "es",
  "english": {
    "common.welcome": "Hello"
  },
  "finalTranslations": {
    "common.welcome": "Hola"
  }
}
```

## Environment Variables

There is currently no `.env.example` file in the repository. Create `.env.local` manually.

Example:

```bash
OPENAI_API_KEY=
GEMINI_API_KEY=
ANTHROPIC_API_KEY=

OPENAI_MODEL=gpt-4.1-mini
GEMINI_MODEL=gemini-2.5-flash
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

Notes:

- At least one provider key is required to translate.
- All three provider keys are recommended if you want meaningful A/B/C comparison.
- Set model names explicitly for your account and region instead of relying on defaults forever.

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

Quality and verification commands:

```bash
npm run test
npm run lint
npm run build
```

## Supported Input Rules

- The top-level payload must be a JSON object.
- Nested branch nodes must be plain objects.
- Leaf values must be strings.
- Placeholder preservation is enforced for tokens matching `{name}` and `{{value}}` patterns.
- The parser records metadata about HTML-like tags and newlines for each source string.
- Key names matching `secret`, `token`, `password`, `passwd`, `apikey`, or `api_key` generate warnings.

## Matching And Validation Rules

- Pairwise match percentages are based on normalized string equality.
- Normalization trims leading and trailing whitespace and collapses repeated internal whitespace.
- Diff items are produced only when the normalized A/B/C strings are not all equal.
- Translation chunks are retried per provider up to the configured retry limit.
- Provider errors are normalized for rate-limit and authentication failures when possible.

## Known Implementation Notes

- The app processes uploads and translations in memory only. Nothing is persisted by the server.
- Translation lanes are hardwired to provider families: `A` is OpenAI, `B` is Gemini, and `C` is Anthropic.
- If one or more providers are not configured, translation still runs for the configured lanes, but downstream comparison quality is naturally reduced.
- The translator persona path is incomplete. Manual diff selection UI exists, but the actual selection handler is still marked TODO.
- Consultant review and final selection are implemented inline in the main page rather than through the unused `ConsultantPanel` and `FinalJsonViewer` components.
- The test suite currently covers chunking, flatten/unflatten behavior, token validation, and diff computation. It does not cover route handlers, SSE flows, or live provider integrations.

## Deployment Notes

This app builds cleanly as a standard Next.js application and is suitable for Vercel-style deployment, but it relies on streaming route handlers and external model latency.

Before deploying:

1. Add the provider API keys and model environment variables in the target environment.
2. Verify that your deployment platform supports long-lived SSE responses for translation and consultant routes.
3. Test with realistic file sizes because large translation sets increase memory use and provider latency.

## Repository Status

At the time this README was updated, the repository successfully passed:

- `npm run test`
- `npm run lint`
- `npm run build`
