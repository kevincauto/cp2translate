# LLM-Powered i18next Translation Web App

## Hack Week Specification (Next.js + TypeScript + Vercel)

**Generated:** 2026-02-28 20:50 UTC

------------------------------------------------------------------------

# 1. Product Overview

## Goal

Build a single-page React web app that: 1. Accepts an English nested
i18next JSON file 2. Translates it in parallel using 3 independent LLM
agents 3. Compares translation outputs 4. Runs 3 consultant review
agents on differences 5. Outputs final downloadable JSON files

Target audience: Internal engineering/product teams during Hack Week.

------------------------------------------------------------------------

# 2. Tech Stack

## Frontend

-   Next.js (App Router)
-   TypeScript
-   React
-   Tailwind CSS
-   shadcn/ui components
-   RTK for state management if necessary

## Backend (Same Next.js App)

-   Next.js Route Handlers (`/app/api/...`)
-   OpenAI SDK
-   Google Gemini SDK
-   Anthropic SDK

## Realtime Progress

-   Server-Sent Events (SSE)

## Deployment

-   Vercel

------------------------------------------------------------------------

# 3. High-Level Flow

1.  Upload/Paste JSON
2.  Validate & Parse
3.  Select Language
4.  Send to 3 AI Translators
5.  View Progress Columns
6.  Compare Results
7.  Consultant Review
8.  Download Final JSON

------------------------------------------------------------------------

# 4. JSON Handling

## Input Requirements

-   Valid nested JSON
-   Leaf values must be strings
-   English source only

## Flattened Representation

Each leaf becomes:

    type FlatEntry = {
      keyPath: string;
      value: string;
      meta: {
        tokens: string[];
        hasHtmlLikeTags: boolean;
        hasNewlines: boolean;
      };
    };

------------------------------------------------------------------------

# 5. Translation Pipeline

## Chunking

-   50--150 keys per chunk
-   Preserve tokens like {name}, {count}

## Validation Checks

-   Key coverage
-   Token integrity
-   Non-empty strings
-   Valid JSON reconstruction

------------------------------------------------------------------------

# 6. Match Algorithm

Match % = identical normalized strings / total keys \* 100

Normalization: - Trim whitespace - Collapse repeated spaces

Diff structure:

    type DiffItem = {
      keyPath: string;
      english: string;
      amy: string;
      barnaby: string;
      claude: string;
    };

------------------------------------------------------------------------

# 7. Consultant Review

Consultants only review differing keys.

Output format:

    type Recommendation = {
      keyPath: string;
      chosen: "amy" | "barnaby" | "claude";
      translation: string;
      explanation: string;
    };

Final JSON is reconstructed from chosen translations.

------------------------------------------------------------------------

# 8. API Endpoints

POST /api/parse\
POST /api/translate\
POST /api/compare\
POST /api/consult

------------------------------------------------------------------------

# 9. UI Components

-   UploadCard
-   LanguageSelectCard
-   AgentColumns (3x AgentColumn)
-   MatchMatrix
-   DiffViewer
-   ConsultantPanel (3x)
-   FinalJsonViewer

------------------------------------------------------------------------

# 10. State Machine

idle → parsed → languageSelected → translating → translated → compared →
consulting → done

------------------------------------------------------------------------

# 11. Error Handling

-   Invalid JSON parsing
-   Token mismatches
-   Provider rate limits
-   Retry per agent

------------------------------------------------------------------------

# 12. Security Notes

-   Do not persist JSON
-   Server-side API keys only
-   Warn if keys contain secret/token/password patterns

------------------------------------------------------------------------

# 13. Acceptance Criteria

-   End-to-end translation works
-   Tokens preserved
-   Match % computed
-   Consultant outputs downloadable JSON
-   Clean vertical flow UI

------------------------------------------------------------------------

# 14. Deployment Steps

1.  Create Next.js app
2.  Install Tailwind + shadcn
3.  Add API routes
4.  Add provider adapters
5.  Deploy to Vercel
6.  Add environment variables for API keys

------------------------------------------------------------------------

# End of Specification
