# ARCHITECTURE.md — System Design & Patterns

**Mapped:** 2026-05-31

## Architecture Pattern

**Pipeline Architecture** — The system is a linear processing pipeline: URL → Validate → Fetch → Build Context → AI Analyze → Build Draft → Return.

No state machine, no event bus, no message queue.

## Layer Diagram

```
┌─────────────────────────────────────────────┐
│                app/page.tsx                  │
│  (Main page — PR input, results, charts)     │
│  Components: StatsPanel, RiskCard,            │
│  ReviewSummary, DiffViewer, PrInput,          │
│  FileTree, ReviewProgress                     │
├─────────────────────────────────────────────┤
│          app/api/analyze-pr/route.ts          │
│  (HTTP POST handler — JSON in, JSON out)      │
├─────────────────────────────────────────────┤
│          lib/api/analyze-pr.ts               │
│  (Orchestrator — full pipeline coordinator)   │
├──────────┬──────────┬──────────┬────────────┤
│ lib/     │ lib/     │ lib/     │ lib/       │
│ github/  │ analysis/│ ai/      │ report/    │
│          │          │          │            │
│ GitHub   │ Context  │ AI       │ Schema     │
│ client   │ builder  │ provider │ (Zod)      │
│ URL      │ Risk     │ Prompt   │ Types      │
│ parser   │ hints    │ builder  │            │
│ Types    │ Grouping │ Factory  │            │
├──────────┴──────────┴──────────┴────────────┤
│          lib/review-draft/                   │
│  (Build draft comments, submit payload)       │
├─────────────────────────────────────────────┤
│          lib/config/                         │
│  (Schema, defaults, loader, health-check)     │
└─────────────────────────────────────────────┘
```

## Data Flow

1. **User** pastes PR URL → `PrInput` component → `POST /api/analyze-pr`
2. **Route** `route.ts` parses JSON body → calls `analyzePullRequest(prUrl)`
3. **Orchestrator** `analyze-pr.ts`:
   a. Validates URL → `parsePrUrl()`
   b. Loads config → `loadLingQiConfig()`
   c. Fetches GitHub data → `fetchGitHubPrData()`
   d. Builds analysis context → `buildPrAnalysisContext()`
   e. Creates AI provider → `createProvider()`
   f. Runs AI analysis → `analyzePrContext()`
   g. Builds review draft → `buildReviewDraft()`
   h. Builds submit plan → `buildSubmitPayload()`
4. **Response** returns `{ report, reviewDraft, reviewSubmitPlan, context }`

## Abstractions

| Abstraction | File | Purpose |
|-------------|------|---------|
| `AiProvider` interface | `lib/ai/provider.ts` | Pluggable AI backend (only DeepSeek implemented) |
| `ProviderRegistry` | `lib/ai/provider-registry.ts` | Maps provider name → factory |
| `ContextBudget` | `lib/analysis/context-bundle.ts` | Truncation limits for large PRs |
| `ReviewProfile` | `lib/analysis/review-profile.ts` | File grouping rules by path/keyword match |

## Entry Points

- **Web:** `app/page.tsx` — Main React page
- **API:** `app/api/analyze-pr/route.ts` — POST endpoint
- **CLI:** `scripts/smoke-ai.ts` — Smoke test runner

## Key Design Decisions

- **No database** — Fully stateless; every request is independent
- **Dry-run only** — Review submit plan is computed but never POSTed to GitHub
- **Strict schema** — AI output validated via Zod `strictSchema: true` before use
- **Config deep-merge** — `default-config` → `lingqi.config.json` → `lingqi.config.local.json`
- **Per-group analysis** — Files grouped by `ReviewProfile` rules; AI analyzes each group independently

---

*Last mapped: 2026-05-31*
