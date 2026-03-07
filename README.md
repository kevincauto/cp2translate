# LLM i18next Translation Web App

Hack Week app for translating nested i18next JSON via 3 independent LLM agents, comparing outputs, consulting reviewers on differences, and exporting final merged JSON.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- SSE route handlers for live progress
- OpenAI, Gemini, Anthropic adapters

## Run Locally

1. Install deps:
   - `npm install`
2. Configure env:
   - `cp .env.example .env.local`
   - fill in one or more provider keys
3. Start dev server:
   - `npm run dev`
4. Open:
   - `http://localhost:3000`

## API Endpoints

- `POST /api/parse` - validate and flatten i18next JSON
- `POST /api/translate/stream` - run 3 translators with SSE progress
- `POST /api/compare` - compute match matrix and diff items
- `POST /api/consult/stream` - consultant review over diffs (SSE)
- `POST /api/assemble` - reconstruct final nested JSON for download

## Notes

- Uploaded JSON is processed in-memory and not persisted.
- API keys remain server-side.
- The parser warns when key names resemble credentials (secret/token/password patterns).
- If a provider hits rate limits, retry after a short wait.

## Tests

- `npm run test`

## Deploy to Vercel

1. Push repository to Git provider.
2. Import project in Vercel.
3. Add env vars:
   - `OPENAI_API_KEY`
   - `GEMINI_API_KEY`
   - `ANTHROPIC_API_KEY`
4. Deploy and verify `/api/translate/stream` and `/api/consult/stream` work with configured providers.
