# Testing Patterns

**Analysis Date:** 2026-05-31

## Test Framework

**Runner:** Vitest v3.1.4
- Config: `vitest.config.ts`
- Environment: `jsdom` (browser-like for React component tests)
- JSX transform: `automatic` (via esbuild)
- Path alias: `@` maps to project root (mirrors `tsconfig.json`)

**Assertion Library:** Vitest built-in `expect` (compatible with Jest API), extended by `@testing-library/jest-dom` v6.9.1 (adds matchers like `toBeInTheDocument()`, `toBeDisabled()`).

**Run Commands:**
```bash
npm test                    # vitest run --passWithNoTests (single run)
npx vitest                  # Watch mode
npx vitest --coverage       # Coverage report
```

## Test File Organization

**Location:** All tests in `tests/` directory at project root. No co-located tests.

**Naming:** `[module-name].test.ts` for logic, `[component-name].test.tsx` for React components. Test file names mirror the source file being tested:
- `lib/github/parse-pr-url.ts` -> `tests/parse-pr-url.test.ts`
- `components/PrInput.tsx` -> `tests/pr-input.test.tsx`

**Structure:**
```
tests/
  setup.ts                  # Global setup (jest-dom matchers, cleanup)
  parse-pr-url.test.ts      # Unit: URL parsing
  config-schema.test.ts     # Unit: config schema validation
  load-config.test.ts       # Unit: config loading with file system
  github-client.test.ts     # Unit: GitHub API client with fetch mocking
  analyzer.test.ts          # Unit: AI analyzer orchestration
  context-builder.test.ts   # Unit: PR context building
  pr-input.test.tsx         # Component: PrInput
  diff-viewer.test.tsx      # Component: DiffViewer
  stats-panel.test.tsx      # Component: StatsPanel
  home-page.test.tsx        # Component: HomePage integration
  analyze-pr-api.test.ts    # Unit: analyze-pr API orchestration
  analyze-pr-route.test.ts  # Integration: API route with vi.mock
  vercel-ai-provider.test.ts # Unit: AI provider with generateObject mock
```

**Setup File:** `tests/setup.ts`
```typescript
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, test, vi } from "vitest";

describe("moduleOrComponentName", () => {
  test("中文测试名称描述行为", () => {
    // Arrange
    const input = "...";

    // Act
    const result = functionUnderTest(input);

    // Assert
    expect(result).toEqual({ ... });
  });
});
```

**Patterns:**
- One `describe` block per module/component with the name of the thing under test
- `test()` for individual test cases (never `it()`)
- Chinese-language test names that describe the expected behavior
- Arrange-Act-Assert structure used consistently

## Mocking

**Framework:** Vitest `vi` object.

**Module-level mocking:**
```typescript
// Hoisting the mock so it's available before imports evaluate
const analyzePullRequestMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/analyze-pr", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/analyze-pr")>(
    "@/lib/api/analyze-pr"
  );
  return {
    ...actual,              // Keep real exports (types, error classes)
    analyzePullRequest: analyzePullRequestMock  // Override only this
  };
});
```

**Function mocking with `vi.fn()`:**
```typescript
// Mock with resolved value
const onAnalyze = vi.fn().mockResolvedValue(undefined);

// Mock with implementation
const onAnalyze = vi.fn().mockImplementation(
  () => new Promise((resolve) => setTimeout(resolve, 100))
);

// Mock with typed fetch
const fetchImpl = vi.fn<typeof fetch>()
  .mockResolvedValueOnce(jsonResponse({ ... }))
  .mockResolvedValueOnce(jsonResponse([...]));
```

**Global stubbing:**
```typescript
import { afterEach } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("...", () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(...));
});
```

**What to Mock:**
- External API calls (fetch, GitHub API) -- mock `fetchImpl` or `vi.stubGlobal("fetch", ...)`
- AI provider (`provider.analyze`) -- mock with `vi.fn().mockResolvedValue(report)`
- Callback props (`onAnalyze`, `onFileSelect`) -- mock with `vi.fn()`
- File system for config tests -- use real `tmpdir()` with `mkdtempSync()`/`writeFileSync()`

**What NOT to Mock:**
- Domain logic (`parsePrUrl`, `buildReviewDraft`, `classifyLine`) -- tested with real inputs
- Zod schemas -- validated with real `.safeParse()` calls
- React rendering -- use real `render()` from Testing Library

**Mock reset pattern:**
```typescript
beforeEach(() => {
  analyzePullRequestMock.mockReset();
});
```

## Fixtures and Factories

**Inline Test Data:**
Test data is defined directly within test functions using typed objects:
```typescript
const githubData: GitHubPrData = {
  pullRequest: {
    url: "https://github.com/octocat/hello-world/pull/42",
    number: 42,
    title: "Improve auth flow",
    body: "This PR updates session refresh.",
    author: "octocat",
    avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
    baseRef: "main",
    headRef: "feature/auth-refresh",
    state: "open"
  },
  files: [{ filename: "src/auth/session.ts", status: "modified", additions: 12, deletions: 4, changes: 16, patch: "@@ -1,3 +1,5 @@" }],
  commits: [{ sha: "abc123", message: "fix auth refresh" }]
};
```

**Factory Functions:**
Small helper functions for creating test infrastructure:
```typescript
// Returns a Response with JSON body for fetch mocking
function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
}

// Returns a Request for API route testing
function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/analyze-pr", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
}

// Creates a temporary directory for file-system based config tests
function tempProject() {
  return mkdtempSync(join(tmpdir(), "lingqi-config-"));
}

// Renders component with common setup
function renderPrInput(onAnalyze = vi.fn()) {
  return {
    user: userEvent.setup(),
    onAnalyze,
    ...render(<PrInput onAnalyze={onAnalyze} />)
  };
}
```

## Coverage

**Requirements:** No coverage thresholds enforced. No `coverage` config in `vitest.config.ts`.

**View Coverage:** `npx vitest --coverage`

## Test Types

**Unit Tests (Logic):**
- Focus: pure functions and typed transformations
- Pattern: Import function, pass typed input, assert return value or thrown error
- Files: `tests/parse-pr-url.test.ts`, `tests/config-schema.test.ts`, `tests/context-builder.test.ts`, `tests/context-audit.test.ts`, etc.
- Mock dependencies only at the boundary (fetch, provider)

**Unit Tests (Components):**
- Focus: render output, user interactions, conditional states
- Pattern: `render()`, `screen.getBy*()`, `userEvent.*()`, assert DOM state
- Files: `tests/pr-input.test.tsx`, `tests/diff-viewer.test.tsx`, `tests/stats-panel.test.tsx`, `tests/risk-card.test.tsx`, etc.

**Integration Tests:**
- Focus: API route integration with mocked dependencies
- Pattern: `vi.mock()` the entire API layer, test route handler directly, assert response status and JSON body
- File: `tests/analyze-pr-route.test.ts` -- loads the route module dynamically via `import()` to capture mocks
- File: `tests/home-page.test.tsx` -- renders the full page, stubs `fetch`, simulates full user flow

**E2E Tests:**
- Not used. No Playwright or Cypress configured.

## Common Patterns

**Async Testing:**
```typescript
// Assert promise rejection
await expect(fetchGitHubPrData(...)).rejects.toThrow("GitHub API 请求失败：404");

// Assert resolved JSON response
await expect(response.json()).resolves.toEqual({ error: "请求体不是有效 JSON" });

// Wait for async UI update
await waitFor(() => {
  expect(screen.getByRole("button", { name: /核心隐患审计/ })).toBeEnabled();
});
```

**Error Testing:**
```typescript
// Assert thrown error with specific message
expect(() => loadLingQiConfig({ cwd })).toThrow("lingqi.config.json");

// Assert thrown error contains expected path
expect(() => loadLingQiConfig({ cwd })).toThrow("ai.temperature");
```

**DOM Query Patterns:**
```typescript
// By role (preferred)
screen.getByRole("button", { name: "分析" })
screen.getByPlaceholderText("https://github.com/owner/repo/pull/123")

// By text
screen.getByText("请输入有效的 GitHub Pull Request 链接")
screen.queryByText("请输入有效的 GitHub Pull Request 链接")  // assert absence

// Container queries for CSS class assertions
const { container } = render(<DiffViewer diffText={mockDiff} />);
container.querySelectorAll(".recharts-responsive-container")
```

**User Interaction Pattern:**
```typescript
const user = userEvent.setup();
await user.type(input, "https://github.com/vercel/next.js/pull/123");
await user.click(screen.getByRole("button", { name: "分析" }));
```

**Test Isolation:**
- `afterEach(cleanup)` in `tests/setup.ts` unmounts React components between tests
- `afterEach(() => { vi.unstubAllGlobals(); })` resets globals when `vi.stubGlobal` is used
- `beforeEach(() => { mock.mockReset(); })` resets mock call history when using `vi.hoisted()`

**Explicit Mock Call Assertions:**
```typescript
// Assert call count and arguments
expect(onAnalyze).toHaveBeenCalledWith("https://github.com/vercel/next.js/pull/123");
expect(generateObject).toHaveBeenCalledTimes(1);

// Assert mock was NOT called
expect(analyzePullRequestMock).not.toHaveBeenCalled();

// Assert sequential calls with specific arguments
expect(fetchImpl).toHaveBeenNthCalledWith(1, "https://api.github.com/...", expect.objectContaining({ ... }));
```

**Provider Mocking (AI Layer):**
```typescript
const provider: AiProvider = {
  analyze: vi.fn().mockResolvedValue(validReport)
};
// Pass to function under test, then assert:
expect(provider.analyze).toHaveBeenCalledWith(context);
```

---

*Testing analysis: 2026-05-31*
