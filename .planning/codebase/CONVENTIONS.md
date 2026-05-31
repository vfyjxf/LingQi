# Coding Conventions

**Analysis Date:** 2026-05-31

## Configuration

**TypeScript:** `strict: true`, target `ES2017`, module resolution `bundler`, JSX `preserve`. Config at `tsconfig.json`.

**Formatting:** No dedicated formatter config (no `.prettierrc` or `eslint.config.*` found). Linting via `next lint` (Next.js built-in ESLint). Run with `npm run lint`.

**Type checking:** `npm run typecheck` runs `tsc --noEmit`.

## Naming Patterns

**Files:**
- kebab-case for library modules: `parse-pr-url.ts`, `load-config.ts`, `provider-factory.ts`
- kebab-case for test files: `parse-pr-url.test.ts`, `pr-input.test.tsx`
- PascalCase for React components: `PrInput.tsx`, `RiskCard.tsx`, `DiffViewer.tsx`

**Functions:**
- camelCase: `parsePrUrl`, `loadLingQiConfig`, `buildReviewDraft`, `createAiProviderFromConfig`
- Arrow functions for simple handlers and single-expression returns; `function` declarations for multi-line logic with early returns

**Variables:**
- camelCase: `loadedConfig`, `prUrlText`, `isLoading`, `changedFiles`
- Constants: UPPER_SNAKE_CASE (`CONFIG_FILES`, `INVALID_PR_URL_MESSAGE`)

**Types:**
- PascalCase with descriptive suffixes:
  - Props: `PrInputProps`, `RiskCardProps`, `StatsPanelProps`
  - Options: `GitHubClientOptions`, `LoadLingQiConfigOptions`, `AnalyzePullRequestOptions`
  - Result: `AnalyzePullRequestResult`
  - Params: `FetchGitHubPrDataParams`
- Type aliases declared with `export type Foo = ...` (NEVER `export interface`)
- Zod schemas: PascalCase with `Schema` suffix (`LingQiConfigSchema`, `AiReviewReportSchema`, `SeveritySchema`)
- Zod-inferred types: `export type LingQiConfig = z.infer<typeof LingQiConfigSchema>;`

**Custom Error Classes:**
- PascalCase, extend `Error`, explicitly set `.name` to match class name:
```typescript
export class AnalyzePrInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyzePrInputError";
  }
}
```
Examples: `AnalyzePrInputError`, `AnalyzePrUpstreamError`, `AnalyzePrConfigError` in `lib/api/analyze-pr.ts`.

## Code Style

**React Components:**
- Always start with `"use client"` directive
- Default exports: `export default function PrInput(...) { ... }`
- Two exceptions use `export default class`: `ErrorBoundary` (class component) at `components/ErrorBoundary.tsx`
- Props types declared inline as separate type aliases above the component
- Functional components only (except `ErrorBoundary`)

**State Management:**
- React hooks only (`useState`, `useCallback`, `useEffect`, `useMemo`)
- No external state management library
- State colocated with the component that owns it (no global store)

**Styling:**
- Tailwind CSS v4 via `@tailwindcss/postcss` PostCSS plugin. Config at `postcss.config.mjs`.
- CSS custom properties defined in `app/globals.css` for theme tokens (`--color-bg`, `--color-surface`, `--color-border`, `--color-accent`, etc.)
- GitHub dark theme throughout (`#0d1117`, `#161b22`, `#30363d`, `#58a6ff`, `#f85149`)
- Inline `style` objects for truly dynamic styles (animation percentages, max heights)
- Dynamic class arrays joined with `" "`: `className={["base", condition && "conditional"].join(" ")}`

**Null Handling:**
- Use `??` for nullish coalescing: `options.cwd ?? process.cwd()`
- Use `?.` for optional chaining: `error instanceof Error ? error.message : String(error)`
- Guard clauses with early returns and explicit null checks: `if (!diffText.trim()) return <EmptyState />`

## Import Organization

**Order (top to bottom):**
1. Node.js built-in modules: `"node:fs"`, `"node:path"`, `"node:os"`
2. External packages: `"react"`, `"next/server"`, `"zod"`, `"vitest"`, `"lucide-react"`
3. Internal path alias `@/*` imports (grouped by domain):
   - `@/lib/...` (logic)
   - `@/components/...` (UI)
   - `@/app/...` (routes)
4. Type-only imports use `import type { ... }` syntax

**Path Aliases:**
- `tsconfig.json` maps `@/*` to `./*` (project root)
- Used consistently: `@/lib/api/analyze-pr`, `@/components/PrInput`, `@/app/page`
- `vitest.config.ts` mirrors the same alias mapping

**Import style patterns:**
```typescript
// Multi-line type-only imports
import type {
  AiReviewReport,
  Confidence,
  Severity
} from "@/lib/report/schema";

// Inline type imports
import { z } from "zod";
import { parsePrUrl } from "@/lib/github/parse-pr-url";

// Combined
import { NextResponse } from "next/server";
import {
  analyzePullRequest,
  AnalyzePrConfigError,
  AnalyzePrInputError,
  AnalyzePrUpstreamError
} from "@/lib/api/analyze-pr";
```

## Error Handling

**Custom Error Hierarchy:**
- Domain-specific error classes extending `Error` with `.name` set in constructor
- Defined in the module that throws them (e.g., `AnalyzePrInputError` in `lib/api/analyze-pr.ts`)
- Error classification via `instanceof` checks in `catch` blocks

**API Route Error Pattern:**
In `app/api/analyze-pr/route.ts`, errors are caught and mapped to HTTP status codes:
```typescript
function getStatusCode(error: unknown): number {
  if (error instanceof AnalyzePrInputError) return 400;
  if (error instanceof AnalyzePrUpstreamError) return 502;
  if (error instanceof AnalyzePrConfigError) return 500;
  return 500;
}
```
Response bodies always return `{ error: string }` JSON.

**Validation:**
- Zod for all runtime validation and parsing
- `.safeParse()` for graceful validation with custom error formatting
- `.parse()` when invalid data should throw immediately
- Preprocessing with `z.preprocess()` for null-to-undefined coercion (see `OptionalLineSchema` in `lib/report/schema.ts`)

**Error Messages:**
- Chinese-language messages throughout: `"请输入有效的 GitHub Pull Request 链接"`, `"LingQi 配置无效：..."`
- Error messages include context: `formatConfigError()` in `lib/config/load-config.ts` formats Zod issues with dot-path prefixes

**Try/Catch Pattern:**
```typescript
try {
  return JSON.parse(readFileSync(filepath, "utf8"));
} catch (error) {
  throw new Error(`读取配置文件 ${filename} 失败：${
    error instanceof Error ? error.message : String(error)
  }`);
}
```

## Logging

**Framework:** Direct `console.log`/`console.error` only. No logging library.

**Patterns:**
- `console.error` in `main().catch()` (smoke script at `scripts/smoke-ai.ts`)
- No logging in library code or components
- UI error states displayed directly to user via state (`errorMessage`, `setError`)

## Comments

**When to Comment:**
- Section separators in large files: `/* ---- Quality score ---- */`, `/* ========================== Hero ========================== */`
- Purpose: structural navigation, not explanation

**JSDoc/TSDoc:**
- Not used. Types and function signatures are self-documenting.

**Inline Comments:**
- Rare. Code is expected to be self-explanatory through naming and types.

## Function Design

**Size:** Functions are small and focused. Most are under 30 lines. The largest file is `app/page.tsx` at 648 lines (contains demo data, builders, and the page component).

**Parameters:** Objects used for multiple parameters rather than positional args:
```typescript
export function buildReviewDraft(
  report: AiReviewReport,
  context: PrAnalysisContext
): ReviewDraft { ... }
```

**Return Values:** Always typed explicitly. Return types declared on exported functions.

**Dependency Injection:** The `analyzePullRequest` function in `lib/api/analyze-pr.ts` uses an options pattern with a `dependencies` field, enabling test substitution:
```typescript
type AnalyzePullRequestDependencies = {
  loadConfig: () => LingQiConfig;
  fetchGitHubPrData: (...) => Promise<GitHubPrData>;
  // ...
};
```

## Module Design

**Exports:**
- One primary function or component per file as the default export
- Secondary named exports for associated types and utilities
- Types always exported with `export type`

**Barrel Files:**
- Not used. Imports target specific files directly (e.g., `@/lib/github/parse-pr-url` not `@/lib/github`).

**File Organization:**
- `lib/` subdirectories group by domain: `ai/`, `analysis/`, `api/`, `config/`, `github/`, `report/`, `review-draft/`, `smoke/`
- Each domain directory contains its types, schema, and implementation files

## React Component Patterns

**Component Structure:**
```typescript
"use client";

import { useState } from "react";
import { SomeIcon } from "lucide-react";

type ComponentProps = {
  prop1: string;
  prop2?: number;
  onAction: (value: string) => void;
};

export default function Component({ prop1, prop2, onAction }: ComponentProps) {
  const [state, setState] = useState<Type>(initialValue);

  function handleEvent() { ... }

  return (
    <div className="...">...</div>
  );
}
```

**Event Handlers:**
- Named functions (`handleSubmit`, `handleInput`, `handleReset`, `handleFilterChange`)
- Accept `e: FormEvent` or raw values
- Async handlers use try/catch/finally pattern

**Conditional Rendering:**
- Step-based rendering (`step === "hero"`, `step === "done"`) in `app/page.tsx`
- Ternary with fallback for empty/null states
- `{error && <ErrorDisplay />}` pattern

**Accessibility:**
- `aria-label`, `aria-expanded`, `role` attributes on interactive elements
- Keyboard support via `onKeyDown` handlers for Enter/Space
- `role="alert"` on error messages

## Configuration Patterns

**Config Layering:**
- `defaultLingQiConfig` in `lib/config/default-config.ts` provides hardcoded defaults
- `lingqi.config.json` overrides defaults
- `lingqi.config.local.json` has highest priority (gitignored, contains per-developer overrides)
- `loadLingQiConfig()` in `lib/config/load-config.ts` merges them via `deepMerge()`

**Runtime Secrets:**
- API keys referenced by environment variable name, not value (e.g., `"apiKeyEnv": "DEEPSEEK_API_KEY"`)
- Resolution via `resolveRequiredSecret(env, apiKeyEnv)` in `lib/ai/secret-resolver.ts`
- `.env` files are gitignored

---

*Convention analysis: 2026-05-31*
