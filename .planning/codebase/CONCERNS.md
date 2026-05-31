# CONCERNS.md — Technical Debt, Issues & Risks

**Mapped:** 2026-05-31

## Tech Debt

### `app/page.tsx` — Monolithic Page Component (648 lines)
- All state management, API calls, conditional rendering in one file
- Risk: Hard to test individual states; every UI change risks regressions
- Recommendation: Extract state machine, break into smaller container components

### No Database Persistence
- Every request is independent; no history of past reviews
- Risk: Users re-analyze same PR multiple times; no caching
- Recommendation: Add SQLite/Postgres for review history + caching

### Calculator Logic in UI Component
- `calcQualityScore()` in `components/StatsPanel.tsx` computes scores client-side
- Risk: Score formula not reusable server-side; diverges from AI output
- Recommendation: Move scoring logic to shared `lib/` module; consider AI-generated scores

### Abandoned Code Artifacts
- `backend/` contains `.pyc` files — Python backend abandoned mid-transition
- `frontend/` contains Vue.js prototype — not the current Next.js app
- Risk: Confuses new contributors; wasted CI
- Recommendation: Delete or archive in `_archive/` with README

## Bugs & Fragile Areas

### No GitHub Token → Silent Degradation
- `GITHUB_TOKEN` is optional, but without it, GitHub API rate limits hit quickly (60 req/hr)
- Current behavior: 403 error → generic error message
- Risk: Users see "Failed to analyze" without knowing the root cause

### Line Number Handling
- `OptionalLineSchema` in `lib/report/schema.ts` uses `z.preprocess()` to handle null/0
- Lines from AI can be null, 0, or missing — inconsistent across risk/suggestion items
- Risk: Review comments with wrong line numbers

### Large PR Truncation — Silent Data Loss
- `ContextBudget` limits files (default 30) and patch chars (default 12000)
- Truncation is logged but not surfaced prominently to users
- Risk: Users unaware their PR was partially analyzed

### No Concurrency / Rate Limiting
- API endpoint has no rate limiting
- Multiple rapid requests could exhaust DeepSeek API quota
- Risk: Cost overrun; API key exhaustion

## Security

### API Key Exposure Surface
- `DEEPSEEK_API_KEY` read from `process.env` in `lib/ai/secret-resolver.ts`
- `GITHUB_TOKEN` in `lib/github/github-client.ts`
- No key scrubbing in error messages — stack traces could leak keys
- No `.env.local` in `.gitignore` validation

### No Input Sanitization on PR URL
- `parsePrUrl()` validates URL format but doesn't guard against SSRF
- `fetchGitHubPrData()` uses the parsed owner/repo directly in GitHub API URL
- Risk: Low (only github.com URLs accepted) but no defense-in-depth

### No CORS Configuration
- API route uses default Next.js CORS — no explicit `Access-Control-Allow-Origin`

## Performance

### No Response Caching
- Every PR analysis runs full GitHub fetch + AI call
- Identical PR re-analysis costs full API round-trip
- Recommendation: ETag-based cache on PR `head.sha`

### Sequential Context Building
- `buildPrAnalysisContext()` processes files sequentially
- Large PRs with many files could have noticeable latency
- Mitigated by file count limit (30 files default)

## Scaling Limits

### Monolithic API Route
- Single `POST /api/analyze-pr` handles everything
- No queue, no background jobs
- Risk: Long-running AI calls block the HTTP connection

### Provider Lock-in
- Only DeepSeek provider implemented in `provider-registry.ts`
- Adding another provider requires code change, not config

## Missing Features

### No Per-Dimension Scoring
- AI outputs risks per category but doesn't produce 0-100 dimension scores
- Frontend `calcQualityScore()` is a single aggregate score
- Gap: Users can't see which dimension (security/performance/etc.) is weakest

### No Review History
- No storage of past review results
- No comparison between PR revisions

### No Test Coverage Thresholds
- Vitest configured but no coverage thresholds enforced
- No CI coverage reporting

## Test Gaps

- `app/page.tsx` (648 lines) has no component tests
- No integration test for full pipeline (GitHub API → AI → response)
- `scripts/smoke-ai.ts` is manual CLI only — not in CI
- No error path tests for GitHub API failures

---

*Last mapped: 2026-05-31*
