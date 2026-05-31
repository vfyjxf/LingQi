# Phase 06: Dimension Scoring - Research

**Researched:** 2026-05-31
**Domain:** AI prompt engineering for calibrated scoring + Zod schema extension + Recharts radar chart visualization
**Confidence:** HIGH

## Summary

Phase 06 adds per-dimension 0-100 scoring to the LingQi AI PR review pipeline. Currently, the AI identifies risks across 7 dimensions (security, data, stability, performance, api, testing, maintainability) but does not produce calibrated per-dimension scores. The frontend computes a single client-side aggregate quality score from risk counts, which is architecturally misplaced and inconsistent with AI output.

The solution has two tiers: (1) backend schema/prompt changes that make the AI produce dimension scores via rubric-anchored scoring with mandatory evidence, and (2) frontend changes that replace the client-side `calcQualityScore()` with AI-generated dimension scores displayed in a recharts RadarChart plus individual score cards.

**Primary recommendation:** Split into two PRs -- PR1 backend (schema + prompt) verifiable via `pnpm smoke-ai`, PR2 frontend (StatsPanel rewired to consume AI scores). No new external packages are needed; all changes use existing `zod`, `recharts`, and `lucide-react` dependencies.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Dimension score generation (0-100 + severity) | API / Backend | -- | AI model (DeepSeek via Vercel AI SDK) produces scores; this is inference logic, not UI |
| Schema definition (DimensionScore type) | API / Backend | -- | Zod schema lives in `lib/report/schema.ts`; validated on server before response |
| Evidence anchoring (DIM-04) | API / Backend | -- | AI prompt enforces evidence-quoting requirement; post-processing validation happens server-side |
| Score display (radar chart + cards) | Browser / Client | -- | Recharts `<RadarChart>` renders client-side; dimension cards are pure React components |
| Score data transformation (AI report -> StatsData) | Browser / Client | -- | `buildStatsData()` in `app/page.tsx` extracts scores from API response into StatsPanel props |
| Aggregate quality grade (A-F) | Browser / Client | -- | Derived from AI dimension scores client-side; client is the display authority for UI grades |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIM-01 | AI 对每个 PR 按 security/data/stability/performance/api/testing/maintainability 7 个维度独立给出 0-100 分数 | Schema section (DimensionScoreSchema), Prompt section (rubric anchors), verified via Vercel AI SDK `generateObject` + zod integration |
| DIM-02 | AI 对每个维度给出整体严重程度（blocker/major/minor/nit） | Schema section (`severity` field on DimensionScore), Prompt section (severity-score mapping guidance) |
| DIM-03 | 前端 StatsPanel 展示各维度雷达图 + 分数卡片 | Frontend Changes section (RadarChart wiring, score cards), verified with Recharts v3.8 API |
| DIM-04 | 评分必须有依据（证据锚定），不可凭空给分 | Prompt section (evidence-required gate + verbatim-quote mandate), Evidence Anchoring pattern section |

## Standard Stack

### Core (unchanged -- no new packages introduced)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^3.25.42 (installed) / 4.4.3 (latest) | Schema definition for `DimensionScore` + array validation for exactly 7 entries | Already the project's schema layer -- consistent with `AiReviewReportSchema`; `.min(0).max(100)` on score field, `.length(7)` on array |
| recharts | ^3.8.1 | RadarChart for 7-axis dimension visualization, score card mini-charts | Already rendering the existing radar + radial donut; same library, different `dataKey` from risk `count` -> AI `score` |
| lucide-react | ^1.17.0 | Dimension-specific icons (Shield, AlertTriangle, Zap, Code2, CheckCircle) | Already used in `categoryDefs` array; icons map 1:1 to dimensions |
| @ai-sdk/deepseek | ^2.0.35 | DeepSeek v4 provider for structured output generation | Existing AI provider; `generateObject()` works identically for extended schemas |
| ai | ^6.0.193 | Vercel AI SDK `generateObject()` with `zodSchema()` for structured output | Existing pipeline; `schemaName` and `schemaDescription` options improve scoring adherence |

**Installation:** No new packages to install. All libraries are already in `package.json`.

**Version verification:**
```bash
npm view "@ai-sdk/deepseek" version  # 2.0.35 (matches package.json)
npm view "ai" version                # 6.0.193 (matches package.json)
npm view "zod" version               # 4.4.3 (project uses 3.25.42 -- compatible, no migration needed)
npm view "recharts" version          # 3.8.1 (matches package.json)
npm view "lucide-react" version      # 1.17.0 (matches package.json)
```

## Package Legitimacy Audit

> **Audit result:** SKIPPED -- no new packages introduced. All changes use existing, already-installed dependencies (`zod`, `recharts`, `lucide-react`). The Phase 06 sprint installs zero new packages.

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        AI Prompt Layer                                │
│  buildReviewPrompt() in lib/ai/vercel-ai-provider.ts                  │
│                                                                       │
│  Input: PrAnalysisContext (PR metadata + file diffs + risk hints)     │
│                                                                       │
│  [New: Rubric-Anchored Scoring Section]                               │
│  For each of 7 dimensions:                                            │
│    - Behavioral score anchor (0-25/26-50/51-75/76-100)               │
│    - Evidence-gate: "Quote specific code"                             │
│    - Severity mapping guidance                                        │
│                                                                       │
│  Output: AiReviewReport (existing + dimensionScores[])                │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Schema Validation Layer                            │
│  lib/report/schema.ts                                                 │
│                                                                       │
│  DimensionScoreSchema = z.object({                                    │
│    dimension: RiskCategorySchema,   // enum of 7 values               │
│    score: z.number().min(0).max(100),                                 │
│    severity: SeveritySchema,        // blocker/major/minor/nit        │
│    reasoning: z.string().min(1),    // chain-of-thought               │
│    evidence: z.string().min(1)      // verbatim code/file reference   │
│  })                                                                    │
│                                                                       │
│  AiReviewReportSchema extended:                                       │
│    + dimensionScores: z.array(DimensionScoreSchema).length(7)         │
│                                                                       │
│  Validation: generateObject() + strictSchema enforces shape           │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     API Response Layer                                 │
│  lib/api/analyze-pr.ts -> AnalyzePullRequestResult                    │
│                                                                       │
│  report: AiReviewReport (now includes dimensionScores)                │
│  flows automatically to frontend via POST /api/analyze-pr             │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Frontend Data Layer                                │
│  app/page.tsx -> buildStatsData()                                     │
│                                                                       │
│  Extracts: dimensionScores from result.report                         │
│  Populates: StatsData.dimensionScores                                 │
│  Derives: aggregateScore = mean(dimensionScores.map(s => s.score))    │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     Frontend Display Layer                             │
│  components/StatsPanel.tsx                                             │
│                                                                       │
│  ┌─────────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │
│  │ Grade Badge          │  │ Dimension Radar   │  │ Score Cards     │ │
│  │ (A-F derived from    │  │ (7-axis Recharts  │  │ (per-dimension  │ │
│  │  aggregateScore)     │  │  RadarChart,      │  │  score +        │ │
│  │                      │  │  dataKey="score") │  │  severity badge)│ │
│  │ Replaces:            │  │                   │  │                 │ │
│  │ calcQualityScore()   │  │ Replaces: current │  │ New component   │ │
│  │ client-side calc     │  │ risk-count radar  │  │ (or inline)     │ │
│  └─────────────────────┘  └──────────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure (changes only)

```
lib/report/
├── schema.ts                    # [MODIFIED] +DimensionScoreSchema, extend AiReviewReportSchema
lib/ai/
├── vercel-ai-provider.ts        # [MODIFIED] buildReviewPrompt() adds scoring section
lib/config/
├── default-config.ts            # [MODIFIED] increase maxOutputTokens: 4000 -> 8000
tests/
├── lib/report/
│   └── (schema tests exist)     # [MODIFIED] add DimensionScoreSchema validation tests
├── lib/ai/
│   └── (provider tests exist)   # [MODIFIED] verify prompt includes scoring instructions
components/
├── StatsPanel.tsx               # [MODIFIED] consume AI scores, replace calcQualityScore()
app/
├── page.tsx                     # [MODIFIED] buildStatsData() extracts dimensionScores
```

### Pattern 1: Rubric-Anchored Scoring Prompt [CITED: labelstud.io, twine.net, arxiv.org]

**What:** The AI prompt defines behavioral anchors for each score band (e.g., 0-25 = critical unresolved issues, 76-100 = exemplary code) per dimension. The AI must cite specific evidence from PR diff/files before assigning a score. The `reasoning` field implements chain-of-thought (explain-then-score pattern recommended by Vercel AI SDK docs).

**When to use:** Whenever an LLM must produce calibrated numerical scores across multiple dimensions. Without anchors, LLMs default to inconsistent, uncalibrated scoring.

**Example (the prompt template that goes into `buildReviewPrompt()`):**
```typescript
// Added to buildReviewPrompt() in lib/ai/vercel-ai-provider.ts
const scoringSection = [
  "",
  "## 维度评分规则（0-100 分，7 个维度必须全部评分）",
  "",
  "对以下 7 个维度各给出 0-100 分，评分必须有具体证据支撑：",
  "security, data, stability, performance, api, testing, maintainability",
  "",
  "### 评分锚点（所有维度通用框架）",
  "- 90-100: 该维度无已知风险，代码达到最佳实践标准",
  "- 70-89:  存在少量轻微改进空间，不影响合并",
  "- 40-69:  存在多个中度问题，建议修复后合并",
  "- 10-39:  存在严重风险，需要在合并前解决",
  "- 0-9:    存在阻断性问题，代码不可合并",
  "",
  "### 证据要求（必须满足，否则评分无效）",
  "- 每个维度的 evidence 字段必须引用具体文件名和行号",
  "- 必须从 diff 中直接引用代码片段作为证据",
  "- 如果未发现该维度的风险，evidence 填写 '未发现相关风险'",
  "",
  "### 严重程度映射指引",
  "- score 0-25: severity 通常为 blocker",
  "- score 26-50: severity 通常为 major",
  "- score 51-75: severity 通常为 minor",
  "- score 76-100: severity 通常为 nit 或无明显问题",
  "",
  "### 维度特定要求",
  "- security: 检查认证、授权、注入、密钥泄露、输入验证",
  "- data: 检查数据一致性、隐私泄露、SQL/ORM 安全",
  "- stability: 检查空指针、异常处理、资源泄漏、竞态条件",
  "- performance: 检查 N+1 查询、不必要对象创建、锁竞争",
  "- api: 检查接口设计、错误码、向后兼容、限流",
  "- testing: 检查测试覆盖、边界条件、mock 质量",
  "- maintainability: 检查命名、复杂度、注释、模块耦合",
  "",
  "输出 JSON 中 dimensionScores 字段包含 7 个对象，每个对象包含：",
  "dimension, score, severity, reasoning, evidence",
].join("\n");
```

**Why this works:** [VERIFIED: Vercel AI SDK docs] The `reasoning`-before-`score` pattern (chain-of-thought in the schema itself) forces the model to articulate justification before committing to a number. The `.describe()` method on Zod fields is passed to the LLM as additional guidance. The behavioral anchors transform abstract "0-100" into concrete decision criteria.

### Pattern 2: Dimension Score Array Validation [VERIFIED: codebase `lib/report/schema.ts`]

**What:** Use `z.array(DimensionScoreSchema).length(7)` to guarantee exactly 7 dimension scores. The Zod `strictSchema: true` setting (already configured in `lingqi.config.json`) tells the Vercel AI SDK to enforce exact schema compliance.

**When to use:** When an AI must produce a fixed set of outputs -- missing or extra entries are fatal errors, not recoverable defaults.

**Example:**
```typescript
// lib/report/schema.ts
export const DimensionScoreSchema = z.object({
  dimension: RiskCategorySchema,
  score: z.number().int().min(0).max(100)
    .describe("0-100 质量评分，基于该维度的风险严重性和数量"),
  severity: SeveritySchema
    .describe("该维度最严重问题的级别: blocker/major/minor/nit"),
  reasoning: z.string().min(1)
    .describe("逐条分析该维度发现的每个问题及其严重程度，再给出综合评分"),
  evidence: z.string().min(1)
    .describe("引用具体文件名、行号和代码片段作为评分依据"),
});

// Extension to AiReviewReportSchema:
export const AiReviewReportSchema = z.object({
  // ... all existing fields unchanged ...
  dimensionScores: z.array(DimensionScoreSchema).length(7)
    .describe("7 个维度的评分数组，security/data/stability/performance/api/testing/maintainability 各一个"),
});
```

### Pattern 3: Frontend Score Wiring -- AI Scores Replace Client-Side Calculation

**What:** The `StatsData` type gains a `dimensionScores` field. The `buildStatsData()` function in `app/page.tsx` extracts scores from `result.report.dimensionScores` and passes them to `StatsPanel`. Inside `StatsPanel`, the RadarChart `dataKey` changes from `"count"` (risk count per category) to `"score"` (AI score per dimension). `calcQualityScore()` is removed; the aggregate grade derives from AI scores.

**Why this replaces, not augments:** The current `calcQualityScore()` is listed as technical debt (CONCERNS.md: "Calculator Logic in UI Component"). This is the natural opportunity to remove it entirely.

### Anti-Patterns to Avoid

- **Score without evidence (violates DIM-04):** The prompt must explicitly gate on evidence. "If you cannot cite specific code, cap the score at 40." Without this, the AI produces plausible-sounding but unfounded scores.
- **Integer-only scoring trap:** While the schema uses `z.number().int()`, the prompt should guide the AI to use the full 0-100 range, not cluster around 50 or 75. Behavioral anchors mitigate this.
- **Mixing old and new scoring:** Do not keep `calcQualityScore()` as a fallback. It should be deleted, not conditionally used. The AI scores are the single source of truth. If the AI doesn't return dimension scores, that's a validation error -- fail loudly, don't silently degrade.
- **Overcomplicating the radar chart:** The current radar chart already has 7 axes. The change is purely in `dataKey` from risk `count` to AI `score`. Do not add new chart libraries or create a second radar.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Score calibration algorithm | A client-side weighted formula | AI-generated scores with rubric-anchored prompt | The AI has full context of the PR diff; a client-side formula only sees risk counts. Hand-rolled weights (e.g., blocker*20) are arbitrary and unvalidated. |
| Chart for 7-dimensional scoring | A custom SVG/canvas radar | Recharts `<RadarChart>` (already in project) | Recharts handles axis labeling, tooltips, responsive sizing, animations, dot rendering -- all edge cases a custom chart would need to reimplement |
| Dimension score array validation | Manual length-check after parse | `z.array(DimensionScoreSchema).length(7)` | Zod's `.length(7)` fails at parse time with a clear error message; manual checks are error-prone and miss edge cases |
| Evidence verification (DIM-04) | Regex post-processing of AI output | Prompt-level enforcement + `evidence: z.string().min(1)` | The Zod schema catches empty/missing evidence. Prompt-level enforcement (explicit instructions in system/user messages) produces better evidence quality than post-hoc substring matching. |

**Key insight:** The value of this phase is in the prompt engineering, not in the code. The most critical deliverable is a well-designed prompt that produces consistent, evidence-backed scores. The schema and frontend changes are mechanical.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/runtime | YES | v24.12.0 | -- |
| pnpm | Package management | YES | (detected via npm registry) | -- |
| DeepSeek API key | AI scoring (smoke test) | Unknown (env-dependent) | -- | Use mock generateObject in unit tests; real API required for smoke test only |
| GitHub token | PR fetching (smoke test) | Unknown (env-dependent) | -- | Use mock context in smoke-ai.ts (already implemented) |

**Missing dependencies with no fallback:** none detected -- all tools are available on this machine.

**Missing dependencies with fallback:**
- DeepSeek API key: If absent, `pnpm smoke-ai` will fail at runtime. Unit tests use mocked `generateObject` and work without it. Fallback: use the existing mock mode in `scripts/smoke-ai.ts`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.4 |
| Config file | `vitest.config.ts` (jsdom environment, `@/` path alias) |
| Quick run command | `npx vitest run --reporter=verbose tests/lib/report/schema.test.ts tests/lib/ai/vercel-ai-provider.test.ts` |
| Full suite command | `pnpm test` (vitest run --passWithNoTests) |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIM-01 | AI output includes exactly 7 dimension scores, each 0-100 | unit | `npx vitest run tests/lib/report/schema.test.ts -t "dimension"` | Wave 0 required |
| DIM-01 | buildReviewPrompt() includes scoring instructions in generated prompt | unit | `npx vitest run tests/lib/ai/vercel-ai-provider.test.ts -t "维度评分"` | Wave 0 required |
| DIM-02 | Each dimension score has valid severity (blocker/major/minor/nit) | unit | `npx vitest run tests/lib/report/schema.test.ts -t "severity"` | Wave 0 required |
| DIM-03 | StatsPanel renders radar chart with dimension scores | unit (component) | `npx vitest run tests/components/StatsPanel.test.tsx -t "radar"` | Wave 0 required (new test file) |
| DIM-03 | buildStatsData() extracts dimensionScores from AI report | unit | `npx vitest run tests/app/page.test.tsx -t "dimension"` or inline in existing test | Wave 0 required |
| DIM-04 | AI output has non-empty evidence per dimension | unit | `npx vitest run tests/lib/report/schema.test.ts -t "evidence"` | Wave 0 required |
| DIM-01-DIM-04 | Full pipeline smoke test produces dimension scores | smoke | `pnpm smoke-ai` (manual, verify output includes dimensionScores) | Manual verification |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/lib/report/schema.test.ts` (schema validation is the tightest feedback loop)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green + manual smoke test output verified

### Wave 0 Gaps

- [ ] `tests/lib/report/schema.test.ts` -- add tests for `DimensionScoreSchema` validation (valid score range, missing dimension, length=7 enforcement, non-empty evidence, valid severity)
- [ ] `tests/lib/ai/vercel-ai-provider.test.ts` -- add test verifying `buildReviewPrompt()` includes scoring instructions and rubric anchors
- [ ] `tests/components/StatsPanel.test.tsx` -- new file: verify radar chart renders with score data, grade badge uses AI aggregate, score cards display per dimension
- [ ] Update test fixtures in existing tests to include `dimensionScores` field (required for backward compatibility of `AiReviewReport`)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | -- |
| V3 Session Management | No | -- |
| V4 Access Control | No | -- |
| V5 Input Validation | Yes | Zod schema validation at API boundary (`AiReviewReportSchema.parse()`), `.min(0).max(100)` on score, `.length(7)` on array |
| V6 Cryptography | No | -- |

### Known Threat Patterns for AI Scoring Pipeline

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| AI hallucinates evidence (fabricated file names or line numbers) | Spoofing | Prompt enforcement of verbatim quoting + post-processing validation of file existence against PR context |
| AI returns fewer than 7 dimensions | Denial of Service | `z.array(...).length(7)` fails Zod validation, producing a clear parse error that surfaces to the user |
| Score injection via prompt manipulation (PR title/body) | Tampering | The PR metadata is user-controlled input passed to the AI prompt -- scores could be biased by adversarial PR titles. Mitigation: structural separation in prompt (scoring section operates on diff, not title) |
| maxOutputTokens too low causing truncated JSON | Denial of Service | Increase `maxOutputTokens` from 4000 to 8000 in `default-config.ts` to accommodate 7 additional dimension score objects |

## Common Pitfalls

### Pitfall 1: Token Budget Exhaustion

**What goes wrong:** Adding 7 dimension scores (each with `reasoning`, `evidence`, `score`, `severity`, `dimension` fields) to the AI output pushes token consumption past the current 4000-token limit. The AI's JSON output gets truncated mid-stream, causing `JSONParseError`.

**Why it happens:** The current `maxOutputTokens: 4000` was sized for the existing schema (risk items + suggestions + group analyses). Each dimension score with evidence adds approximately 100-200 tokens. With 7 dimensions, that is 700-1400 additional tokens. Combined with the existing output, 4000 is very tight.

**How to avoid:** Increase `maxOutputTokens` from 4000 to at least 8000 in both `lib/config/default-config.ts` and `lingqi.config.json`. The config schema allows up to 16000, so 8000 is well within bounds.

**Warning signs:** Smoke test outputs truncated JSON. Vercel AI SDK throws `JSONParseError` (not `TypeValidationError` -- that would mean valid JSON but wrong shape).

### Pitfall 2: Model Produces Agentic Reasoning Instead of Structured JSON

**What goes wrong:** DeepSeek models (particularly v3.2 and newer) sometimes output reasoning traces like "Let me analyze the security dimension..." instead of the structured JSON object, even when `response_format` is set.

**Why it happens:** DeepSeek's native JSON mode (`response_format: { type: "json_object" }`) is different from OpenAI's `json_schema` mode. The Vercel AI SDK abstracts this, but the underlying model behavior can still leak reasoning text. This is a documented issue with DeepSeek structured output. [CITED: github.com/misty-step/cerberus/issues/141]

**How to avoid:** (1) The existing system prompt already says "只返回符合 schema 的结构化 Review 报告，不要输出 Markdown 解释" -- extend this to also say "不要输出推理过程，只输出 JSON 对象". (2) The `strictSchema: true` in config + `zodSchema()` should handle this at the SDK level. (3) Add `TypeValidationError` catch in the provider to retry on parse failures.

**Warning signs:** Smoke test output includes natural language before the JSON. `JSONParseError` rather than `TypeValidationError`.

### Pitfall 3: Score Centering (All Dimensions Clustered at 50-75)

**What goes wrong:** Without explicit behavioral anchors, LLMs tend to produce scores clustered in the "middle" range (50-75). This makes dimensions indistinguishable and defeats the purpose of per-dimension scoring.

**Why it happens:** LLMs are trained to be "helpful and harmless," which biases them toward moderate, non-controversial outputs. A score of 50 is "safe" -- it does not make strong claims.

**How to avoid:** (1) Behavioral anchors must describe what each score band means in concrete terms (see Pattern 1). (2) The prompt should explicitly instruct: "使用完整的 0-100 范围，不要所有分数都集中在 50-80 之间". (3) The `reasoning` field (chain-of-thought) forces the model to justify why a dimension deserves 85 vs 45, which pushes scores toward the extremes.

**Warning signs:** Smoke test output shows all 7 dimensions within a 20-point range. Manual review of evidence reveals weak justifications.

### Pitfall 4: Backward-Incompatible Schema Change Breaks Existing Tests

**What goes wrong:** Adding `dimensionScores: z.array(...).length(7)` to `AiReviewReportSchema` makes all existing test fixtures invalid because they lack the `dimensionScores` field.

**Why it happens:** `AiReviewReportSchema` is used in `tests/report-schema.test.ts`, `tests/vercel-ai-provider.test.ts`, `tests/analyzer.test.ts`, `tests/smoke-output.test.ts`, and `tests/group-analysis-contract.test.ts`. Every test fixture that constructs an `AiReviewReport` object will fail Zod validation.

**How to avoid:** Create a helper function `makeValidReport(overrides?)` that includes default `dimensionScores` and use it in all test fixtures. Update test fixtures in the same PR as the schema change.

**Warning signs:** After adding `.length(7)` to the schema, running `pnpm test` shows mass test failures with `"dimensionScores: Required"` errors.

## Code Examples

Verified patterns from the codebase and official sources:

### Schema: DimensionScoreSchema with Chain-of-Thought

```typescript
// Source: lib/report/schema.ts (extension, not yet implemented)
// Pattern: Vercel AI SDK docs -- reason-before-score for chain-of-thought
// [VERIFIED: codebase lib/report/schema.ts existing patterns]
import { z } from "zod";
import { RiskCategorySchema, SeveritySchema } from "./schema";

export const DimensionScoreSchema = z.object({
  dimension: RiskCategorySchema
    .describe("评分的维度: security/data/stability/performance/api/testing/maintainability"),
  score: z.number().int().min(0).max(100)
    .describe("0-100 质量评分: 0=阻断性问题, 100=无风险"),
  severity: SeveritySchema
    .describe("该维度最严重问题的级别"),
  reasoning: z.string().min(1)
    .describe("先分析该维度发现的具体问题，再给出综合评分。这是推理过程。"),
  evidence: z.string().min(1)
    .describe("引用具体文件名、行号和代码片段作为评分依据。不能是笼统描述。"),
});
```

### Prompt: Scoring Section Addition

```typescript
// Source: lib/ai/vercel-ai-provider.ts (extension of existing buildReviewPrompt)
// [VERIFIED: codebase buildReviewPrompt() existing structure]
export function buildReviewPrompt(context: PrAnalysisContext): string {
  const promptContext = context.contextBundle ?? context;
  const contextLabel = context.contextBundle
    ? "PR 分组上下文 JSON："
    : "PR 上下文 JSON：";

  const basePrompt = [
    "请基于下面的 GitHub Pull Request 上下文生成 AI Review 报告。",
    "只返回符合 schema 的结构化 Review 报告，不要输出 Markdown 解释。",
    "不要输出推理过程或自然语言说明，只输出 JSON 对象。",
    "",
    // ... existing analysis requirements ...
  ];

  const scoringPrompt = [
    "",
    "## 维度评分规则（0-100 分）",
    "",
    "对 security/data/stability/performance/api/testing/maintainability 各给出 0-100 评分。",
    "使用完整的 0-100 范围，不要所有分数集中在 50-80 之间。",
    "",
    "评分锚点:",
    "- 90-100: 该维度无已知风险，代码达到最佳实践标准",
    "- 70-89:  少量轻微改进空间，不影响合并决策",
    "- 40-69:  多个中度问题，建议修复后合并",
    "- 10-39:  严重风险，需在合并前解决",
    "- 0-9:    阻断性问题，代码不可合并",
    "",
    "证据要求:",
    "- evidence 字段必须引用具体文件名和行号",
    "- 必须从 PR diff 中引用代码片段",
    "- 如果该维度未发现风险，evidence 填写 '未在变更中发现该维度相关风险'",
    "- reasoning 字段先逐条分析问题，再给出综合评分",
    "",
    "严重程度指引: score 0-25 => blocker, 26-50 => major, 51-75 => minor, 76-100 => nit",
    "",
    "维度检查重点:",
    "- security: 认证/授权绕过、注入攻击、密钥泄露、不安全的依赖",
    "- data: 数据一致性、SQL 注入、隐私数据泄露、Schema 迁移风险",
    "- stability: 未处理异常、空指针、资源泄漏、死锁、竞态条件",
    "- performance: N+1 查询、不必要对象创建、同步阻塞、内存泄漏",
    "- api: 接口契约变更、向后兼容、错误响应格式、限流缺失",
    "- testing: 新增代码的测试覆盖、边界条件、mock 合理性",
    "- maintainability: 命名规范、函数复杂度、重复代码、模块耦合",
  ];

  const closing = [
    "",
    contextLabel,
    JSON.stringify(promptContext, null, 2)
  ];

  return [...basePrompt, ...scoringPrompt, ...closing].join("\n");
}
```

### Frontend: StatsData Type Extension

```typescript
// Source: components/StatsPanel.tsx (extension of existing StatsData type)
// [VERIFIED: codebase StatsPanel.tsx current type]
export type DimensionScoreData = {
  dimension: string;        // "security" | "data" | ...
  label: string;            // "安全漏洞" | "数据风险" | ...
  score: number;            // 0-100 from AI
  severity: string;         // "blocker" | "major" | "minor" | "nit"
  evidence: string;         // verbatim evidence from AI
  color: string;            // severity-based color for the card
  icon: React.ComponentType<{ className?: string }>;
};

export type StatsData = {
  filesChanged: number;
  linesAdded: number;
  linesDeleted: number;
  riskCount: number;
  blockerCount: number;
  majorCount: number;
  minorCount: number;
  nitCount: number;
  categoryCounts?: Record<string, number>;
  // NEW:
  dimensionScores?: DimensionScoreData[];
};
```

### Frontend: buildStatsData() Extraction

```typescript
// Source: app/page.tsx (modification of existing buildStatsData())
// [VERIFIED: codebase app/page.tsx buildStatsData() + categoryDefs]
function buildStatsData(result: AnalyzeResponse | null): StatsData | null {
  if (!result) return null;

  const blockerCount = /* ... existing ... */;
  // ... existing severity/category counts ...

  // NEW: extract dimension scores from AI report
  const dimensionLabelMap: Record<string, { label: string; icon: any }> = {
    security:       { label: "安全漏洞",  icon: ShieldCheck },
    data:           { label: "数据风险",  icon: AlertTriangle },
    stability:      { label: "稳定性",   icon: AlertTriangle },
    performance:    { label: "性能瓶颈",  icon: Zap },
    api:            { label: "API 设计",  icon: Code2 },
    testing:        { label: "测试覆盖",  icon: ShieldCheck },
    maintainability:{ label: "可维护性", icon: Code2 },
  };

  const severityColorMap: Record<string, string> = {
    blocker: "#dc2626",
    major:   "#ea580c",
    minor:   "#2563eb",
    nit:     "#6b7280",
  };

  const dimensionScores = result.report.dimensionScores?.map(ds => {
    const def = dimensionLabelMap[ds.dimension] ?? { label: ds.dimension, icon: Code2 };
    return {
      dimension: ds.dimension,
      label: def.label,
      score: ds.score,
      severity: ds.severity,
      evidence: ds.evidence,
      color: severityColorMap[ds.severity] ?? "#6b7280",
      icon: def.icon,
    };
  });

  return {
    // ... existing fields ...
    dimensionScores,
  };
}
```

### Frontend: RadarChart Score Display

```typescript
// Source: components/StatsPanel.tsx (modification of existing radar chart)
// [VERIFIED: Recharts RadarChart API https://recharts.org/en-US/api/RadarChart]
const radarData = (stats.dimensionScores ?? []).map(ds => ({
  dimension: ds.label,
  score: ds.score,
  fullMark: 100,
}));

// In JSX:
<RadarChart cx="50%" cy="50%" data={radarData}>
  <PolarGrid stroke="#30363d" />
  <PolarAngleAxis dataKey="dimension" /* ... same tick renderer ... */ />
  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#8b949e", fontSize: 10 }} />
  <Radar
    dataKey="score"           // CHANGED from "count" to "score"
    stroke="#3fb950"          // Green for quality score
    fill="#3fb950"
    fillOpacity={0.15}
    strokeWidth={2}
    dot={{ r: 4, fill: "#3fb950", stroke: "#0d1117", strokeWidth: 1 }}
    activeDot={{ r: 6, fill: "#3fb950", stroke: "#0d1117", strokeWidth: 2 }}
  />
  <Tooltip
    contentStyle={{ /* ... existing dark theme ... */ }}
    formatter={(value: number) => [`${value} / 100`, "质量评分"]}
  />
</RadarChart>
```

### Grade Derivation from AI Scores

```typescript
// Source: components/StatsPanel.tsx (replaces calcQualityScore())
// [VERIFIED: codebase gradeInfo() existing function -- keep it, change input source]
function deriveAggregateScore(dimensionScores?: DimensionScoreData[]): number {
  if (!dimensionScores || dimensionScores.length === 0) return 0;
  const sum = dimensionScores.reduce((acc, ds) => acc + ds.score, 0);
  return Math.round(sum / dimensionScores.length);
}

// In StatsPanel:
const score = deriveAggregateScore(stats.dimensionScores);
const grade = gradeInfo(score); // existing gradeInfo() works unchanged
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side `calcQualityScore()` (arbitrary weights: blocker*20 + major*12 + minor*5 + nit*2) | AI-generated per-dimension scores with rubric anchors and evidence | Phase 06 | Single aggregate score becomes 7-dimensional calibrated scoring; score source moves from client to AI |
| Risk-count radar chart (showing count per category, max=highest-count category) | Score radar chart (showing 0-100 quality per dimension, max=100) | Phase 06 | Radar changes from "problem density" view to "quality level" view; domain fixed at [0,100] |

**Deprecated/outdated:**
- `calcQualityScore()`: Arbitrary weight formula with no validation. The blocker*20 weight was chosen ad-hoc without calibration. Replaced by AI-generated scores that have context of actual code issues.
- Risk-count radar: Counting risk occurrences per dimension was a proxy for quality -- a dimension with 3 minor risks appeared worse than one with 1 blocker. AI scores correctly weight severity.
- `categoryCounts` on `StatsData`: Still useful for backward compatibility and filtering, but the radar chart no longer depends on it for the primary visualization.

## Assumptions Log

> All claims tagged `[ASSUMED]` in this research. The planner and discuss-phase use this section to identify decisions that need user confirmation before execution.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DeepSeek v4-flash reliably produces 7 dimension scores with evidence when given rubric-anchored prompt | Standard Stack | AI produces inconsistent scores or fabricates evidence; requires prompt iteration post-implementation |
| A2 | `maxOutputTokens: 8000` is sufficient for the extended schema | Common Pitfalls | Token budget still insufficient for large PRs; may need 12000 or 16000 |
| A3 | The 5-level behavioral anchor rubric (0-9, 10-39, 40-69, 70-89, 90-100) produces adequate score distribution | Architecture Patterns | Scores may still cluster; anchors might need adjustment after smoke testing |
| A4 | Severity-score mapping (0-25=>blocker, 26-50=>major, 51-75=>minor, 76-100=>nit) is the correct relationship for DIM-02 | Architecture Patterns | User may want independent severity (not score-derived); prompt would need revision |
| A5 | The `reasoning` chain-of-thought field meaningfully improves score quality for DeepSeek models | Architecture Patterns | DeepSeek may handle reasoning differently than OpenAI; field might add cost without benefit |
| A6 | No new npm packages are needed -- all functionality is achievable with existing `zod`, `recharts`, `lucide-react` | Package Legitimacy Audit | Frontend may need a different chart library for score visualization; recharts radar chart may have limitations for this use case |
| A7 | Existing `categoryDefs` icon mapping in StatsPanel is sufficient for dimension score cards | Code Examples | May need new icons per dimension; lucide-react may not have appropriate icons for all 7 dimensions |

## Open Questions

1. **Should dimension scores be per-file-group or global?**
   - What we know: The current architecture analyzes files grouped by `ReviewProfile` (e.g., "backend-analysis", "github-integration"), with each group getting its own AI analysis. Dimension scores could be global (one score per dimension across the entire PR) or per-group (each group gets dimension scores).
   - What's unclear: Whether per-group dimension scores add value or noise. Global scores are simpler and match DIM-01's language ("对每个 PR"). Per-group scores would require frontend changes to display group-level radars.
   - Recommendation: Start with global dimension scores (one set of 7 scores for the entire PR). This matches the requirement language and avoids complexity. Per-group scores can be a v2 feature if needed.

2. **What happens when the AI produces fewer than 7 dimensions?**
   - What we know: `z.array(DimensionScoreSchema).length(7)` will throw a `TypeValidationError` at parse time. The current error handling in `route.ts` returns a generic "PR 分析失败" message.
   - What's unclear: Whether we should retry the AI call on schema mismatch, or fail immediately. A retry with a stronger prompt might fix it, but adds latency and cost.
   - Recommendation: On `TypeValidationError` for `dimensionScores`, retry once with a fallback prompt that explicitly lists the 7 required dimensions. If the retry also fails, surface a specific error: "AI 模型未能返回完整的 7 维度评分，请重试".

3. **Should the old `categoryCounts` radar remain as a secondary view?**
   - What we know: The current radar shows risk counts per category. Users might want both "what problems exist" (counts) and "how good is the code" (scores).
   - What's unclear: Whether showing both views adds confusion or value.
   - Recommendation: Replace the radar view with scores as the primary visualization. Keep `categoryCounts` for the existing filter/interaction mechanism (clicking a dimension filters risks). The score card grid can show per-dimension counts as secondary information.

## Sources

### Primary (HIGH confidence)
- [Codebase] `lib/report/schema.ts` -- Existing `AiReviewReportSchema`, `RiskCategorySchema` (7 values), `SeveritySchema`, Zod patterns
- [Codebase] `lib/ai/vercel-ai-provider.ts` -- `buildReviewPrompt()` current structure, `createVercelAiProvider()` pattern
- [Codebase] `components/StatsPanel.tsx` -- `calcQualityScore()`, `gradeInfo()`, `categoryDefs`, radar chart current implementation
- [Codebase] `app/page.tsx` -- `buildStatsData()` data extraction, `StatsData` type, demo data patterns
- [Codebase] `lib/config/default-config.ts` -- `maxOutputTokens: 4000`, `temperature: 0.2`, `strictSchema: true`
- [Codebase] `lib/api/analyze-pr.ts` -- `AnalyzePullRequestResult` type, pipeline flow
- [npm registry] Package versions verified via `npm view`: @ai-sdk/deepseek@2.0.35, ai@6.0.193, zod@4.4.3 (project on 3.25.42), recharts@3.8.1, lucide-react@1.17.0
- [Recharts docs] `https://recharts.org/en-US/api/RadarChart` -- RadarChart, Radar, PolarAngleAxis, PolarRadiusAxis API

### Secondary (MEDIUM confidence)
- [WebSearch] Vercel AI SDK `generateObject` best practices -- reason-before-score chain-of-thought pattern, `.describe()` field guidance, `schemaName`/`schemaDescription` options
- [WebSearch] DeepSeek JSON mode limitations -- no native `json_schema` support, requirement for "json" keyword in prompt, token budget considerations
- [WebSearch] RULERS framework (arxiv.org/abs/2601.08654) -- evidence-anchored scoring, locked rubrics for LLM evaluation

### Tertiary (LOW confidence)
- [WebSearch] DeepSeek v3.2 agentic reasoning trace issue (github.com/misty-step/cerberus/issues/141) -- acknowledged issue, may not affect v4-flash model used in this project
- [WebSearch] DeepSeek code review scoring dimension weight suggestions (php.cn/faq/2495760.html) -- useful framework but unverified against this project's specific use case

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in project, versions verified via npm registry, no new packages needed
- Architecture: HIGH -- schema extension follows existing Zod patterns, prompt extension follows existing `buildReviewPrompt()` structure, frontend wiring is a data-key change on existing components
- Pitfalls: MEDIUM -- prompt engineering pitfalls (score centering, evidence hallucination) are well-documented in literature but must be empirically validated with the specific DeepSeek v4-flash model through smoke testing

**Research date:** 2026-05-31
**Valid until:** 2026-06-30 (prompt engineering patterns are stable; if DeepSeek releases a major model update, rubric anchors may need recalibration)
