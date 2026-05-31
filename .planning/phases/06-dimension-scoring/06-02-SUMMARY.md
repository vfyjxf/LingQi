---
phase: 06-dimension-scoring
plan: 02
subsystem: ai-prompt
tags: [prompt-engineering, dimension-scoring, test-fixture, vitest, tdd]

# Dependency graph
requires:
  - phase: 06-dimension-scoring
    plan: 01
    provides: "DimensionScoreSchema, extended AiReviewReportSchema, makeValidReport() fixture"
provides:
  - "buildReviewPrompt() with rubric-anchored dimension scoring section (DIM-01, DIM-02)"
  - "5 behavioral score anchors: 90-100 / 70-89 / 40-69 / 10-39 / 0-9"
  - "Evidence gate requiring verbatim file/line references"
  - "Severity mapping: score ranges to blocker/major/minor/nit"
  - "Per-dimension checkpoints for all 7 dimensions"
  - "Anti-reasoning instruction in system prompt"
  - "6 test files migrated to shared makeValidReport() fixture with dimensionScores"
  - "3 new prompt content assertions in vercel-ai-provider.test.ts"
affects: [06-03, "AI model scoring behavior"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prompt engineering with behavioral anchors for calibrated 0-100 AI scoring"
    - "Evidence gate pattern: prompt requires specific file/line references for score validity"
    - "makeValidReport() with overrides for test-specific data while retaining shared schema compliance"

key-files:
  modified:
    - "lib/ai/vercel-ai-provider.ts — Added scoringPrompt array with 9 sections between basePrompt and closing"
    - "tests/vercel-ai-provider.test.ts — Added import for buildReviewPrompt/makeValidReport; replaced inline fixture; added 3 prompt content tests"
    - "tests/smoke-output.test.ts — Migrated fixture to makeValidReport(); updated assertions"
    - "tests/group-analysis-contract.test.ts — Migrated fixture to makeValidReport() with groupAnalyses overrides"
    - "tests/review-draft.test.ts — Migrated fixture to makeValidReport() with empty array overrides"
    - "tests/analyzer.test.ts — Migrated fixture to makeValidReport()"
    - "tests/analyze-pr-api.test.ts — Migrated fixture to makeValidReport() with data-matching overrides"

key-decisions:
  - "Scoring prompt inserted as scoredPrompt array between basePrompt and closing arrays in buildReviewPrompt()"
  - "Score anchors use behavioral descriptions (90-100: 无已知风险) rather than just numeric ranges for AI calibration"
  - "Evidence gate requires verbatim file/line references — vague descriptions are explicitly disallowed"
  - "Severity mapping is score-driven: 0-25=>blocker, 26-50=>major, 51-75=>minor, 76-100=>nit"
  - "Used makeValidReport() overrides for 3 test files where default fixture data didn't match test contracts"

patterns-established:
  - "Prompt section injection pattern: scoringPrompt array between basePrompt and closing arrays"
  - "Fixture override pattern: makeValidReport({ risks: [], suggestions: [] }) for tests needing empty base"

requirements-completed: [DIM-01, DIM-02]

# Metrics
duration: 7min
completed: 2026-05-31
---

# Phase 06 Plan 02: AI Prompt Scoring Section + Test Fixture Migration Summary

**buildReviewPrompt() updated with rubric-anchored 0-100 dimension scoring instructions (5 behavioral anchors, evidence gate, severity mapping, 7 per-dimension checkpoints). All 6 test files migrated to shared makeValidReport() fixture. 24 tests pass, zero regressions.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-31T13:16:06Z
- **Completed:** 2026-05-31T13:23:16Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

### Prompt Engineering
- Inserted `scoringPrompt` array (9 sections) into `buildReviewPrompt()` between base instructions and context data
- Behavioral anchors: 5 score ranges with qualitative descriptions (90-100: "无已知风险", through 0-9: "代码不可合并")
- Evidence gate: requires verbatim file/line references; vague descriptions invalidate scores
- Severity mapping: score-driven severity guidance (0-25=>blocker, 26-50=>major, 51-75=>minor, 76-100=>nit)
- Per-dimension checkpoints: specific risk types for each dimension (e.g., security: 认证/授权绕过、注入攻击)
- Anti-reasoning instruction added to system prompt: "不要输出推理过程或自然语言说明，只输出 JSON 对象"
- 0-100 range usage instruction: "使用完整的 0-100 范围，不要所有分数集中在 50-80 之间"

### Test Fixture Migration
- All 6 test files now use `makeValidReport()` for report fixtures with `dimensionScores` field
- 3 test files used overrides for test-specific data: group-analysis-contract (custom groupAnalyses), review-draft (empty base arrays), analyze-pr-api (exact fixture data match)
- smoke-output assertions updated to match makeValidReport fixture data
- 3 new prompt content tests verify scoring section presence in buildReviewPrompt() output

## Task Commits

1. **Task 1: Add rubric-anchored dimension scoring section to buildReviewPrompt()** - `be6ea5b` (test + feat combined)
   - Scoring section with anchors, evidence gate, severity mapping, per-dimension checkpoints
   - System prompt anti-reasoning instruction
   - Test fixture fix (makeValidReport) and 3 new prompt content tests

2. **Task 2: Migrate all 6 remaining test fixtures + add prompt content assertions** - `3644d69` (feat)
   - 5 test files migrated to makeValidReport() with appropriate overrides
   - Smoke-output assertions updated for new fixture data

## Files Modified
- `lib/ai/vercel-ai-provider.ts` — Added scoringPrompt array (9 sections: header, dimension list, anchors, evidence gate, severity mapping, checkpoints, output format). Updated system prompt.
- `tests/vercel-ai-provider.test.ts` — Imported buildReviewPrompt and makeValidReport. Replaced inline fixture. Added 3 prompt content tests.
- `tests/smoke-output.test.ts` — Migrated to makeValidReport(). Updated risk/limitation assertions.
- `tests/group-analysis-contract.test.ts` — Migrated to makeValidReport() with groupAnalyses overrides matching test context (auth + billing).
- `tests/review-draft.test.ts` — Migrated to makeValidReport({risks:[], suggestions:[], groupAnalyses:[], reviewFocus:[]}) for empty base state.
- `tests/analyzer.test.ts` — Migrated to makeValidReport().
- `tests/analyze-pr-api.test.ts` — Migrated to makeValidReport() with data-matching overrides to preserve detailed pipeline assertion.

## Test Results
- 6 test files: 24 tests, 24 passed, 0 failed
- Full test suite: 31 files, 135 passed, 1 pre-existing failure (home-page.test.tsx, unrelated)

## Decisions Made
- Scoring section inserted as a separate `scoringPrompt` array rather than inline in the base prompt — clean separation and easier future modification
- Used behavioral descriptions in score anchors (e.g., "存在阻断性问题，代码不可合并") rather than numeric-only anchors — better AI calibration
- Used makeValidReport() with overrides for 3 test files where default fixture data would break test assertions — preserves test behavior while gaining dimensionScores compliance

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed import path from `@/../tests/fixtures` to `@/tests/fixtures`**
- **Found during:** Task 1
- **Issue:** Plan specified `@/../tests/fixtures/report-fixtures` but vitest/vite resolves `@` to project root, making `@/../` incorrect
- **Fix:** Changed to `@/tests/fixtures/report-fixtures`
- **Files modified:** tests/vercel-ai-provider.test.ts (line 9)

**2. [Rule 3 - Blocking] Used makeValidReport() with overrides for test-specific fixture data**
- **Found during:** Task 2
- **Issue:** plan expected `makeValidReport()` to work as-is for all tests, but 3 test files have assertions on specific fixture values (group structure, empty base arrays, detailed pipeline output)
- **Fix:** Used overrides: group-analysis-contract gets custom groupAnalyses, review-draft gets empty arrays, analyze-pr-api gets data-matching overrides
- **Files modified:** tests/group-analysis-contract.test.ts, tests/review-draft.test.ts, tests/analyze-pr-api.test.ts

**3. [Rule 1 - Bug] Updated smoke-output test assertions for new fixture data**
- **Found during:** Task 2
- **Issue:** smoke-output assertions referenced old fixture values (risk title, file path, limitations)
- **Fix:** Updated assertions to match makeValidReport() values: risk "src/auth/session.ts:42 - 刷新 token 前需要确认用户状态", limitation "未读取完整调用链"
- **Files modified:** tests/smoke-output.test.ts

---

**Total deviations:** 3 auto-fixed (2 Rule 3 — Blocking, 1 Rule 1 — Bug)
**Impact on plan:** Minor — overrides are the intended pattern (makeValidReport was designed with overrides support). Import path and assertion updates were necessary correctness fixes.

## Issues Encountered
- tests/analyze-pr-route.test.ts still has TypeScript error (missing dimensionScores) — this file was outside the plan's 6-file scope. Logged to deferred-items.md.

## Threat Flags
None — all changes are within the plan's documented threat model boundaries. The new prompt content is instruction-only (no new network endpoints, auth paths, or file access patterns). Anti-reasoning instruction (T-06-07 mitigation) was updated per plan.

## Known Stubs
None — all prompt content, test assertions, and fixture data are fully implemented with real values.

## Next Phase Readiness
- Prompt contract complete for dimension scoring — ready for Plan 03 to integrate into the review pipeline
- All 6 test fixtures now compliant with updated AiReviewReportSchema (dimensionScores field present)

---
*Phase: 06-dimension-scoring*
*Plan: 02*
*Completed: 2026-05-31*
