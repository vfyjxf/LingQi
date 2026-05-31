# STRUCTURE.md — Directory Layout & Organization

**Mapped:** 2026-05-31

## Top-Level Layout

```
LingQi/
├── app/                    # Next.js App Router pages & API routes
│   ├── page.tsx            # Main page (648 lines — large, monolithic)
│   ├── layout.tsx          # Root layout with metadata
│   ├── globals.css         # Tailwind v4 import + custom CSS vars
│   └── api/
│       └── analyze-pr/
│           └── route.ts    # POST /api/analyze-pr
├── components/             # React components
│   ├── StatsPanel.tsx      # Quality score + radar/donut/bar charts
│   ├── RiskCard.tsx        # Risk item display (severity, file, evidence)
│   ├── ReviewSummary.tsx   # PR summary header
│   ├── PrInput.tsx         # URL input form with loading states
│   ├── DiffViewer.tsx      # Code diff display
│   ├── FileTree.tsx        # File browser sidebar
│   └── ReviewProgress.tsx  # Review generation progress indicator
├── lib/                    # Business logic (no React)
│   ├── ai/                 # AI provider layer
│   │   ├── provider.ts             # AiProvider interface
│   │   ├── provider-factory.ts     # Provider instantiation
│   │   ├── provider-registry.ts    # Provider name → factory map
│   │   ├── vercel-ai-provider.ts   # DeepSeek implementation + prompt builder
│   │   └── secret-resolver.ts      # API key resolution from env
│   ├── analysis/           # Context building & analysis
│   │   ├── analyzer.ts             # Run AI analysis, validate output
│   │   ├── context-builder.ts      # Build PR context from GitHub data
│   │   ├── context-bundle.ts       # Context budget limits & truncation
│   │   ├── change-grouper.ts       # Group files by ReviewProfile rules
│   │   ├── review-profile.ts       # Group file matching logic
│   │   ├── risk-hints.ts           # Pre-AI file risk tagging
│   │   ├── context-audit.ts        # Audit what context was used/omitted
│   │   └── group-analysis-contract.ts # Validate AI group output
│   ├── api/                # API orchestration
│   │   └── analyze-pr.ts           # Full pipeline: validate → analyze → draft
│   ├── config/             # Configuration layer
│   │   ├── schema.ts               # LingQiConfig Zod schema
│   │   ├── default-config.ts       # Hardcoded defaults + review profiles
│   │   ├── load-config.ts          # Deep-merge loader
│   │   └── health-check.ts         # Config validation on startup
│   ├── github/             # GitHub API client
│   │   ├── github-client.ts        # fetch() wrapper for GitHub REST API
│   │   ├── github-types.ts         # Response type definitions
│   │   └── parse-pr-url.ts         # URL validation & parsing
│   ├── report/             # AI output schema
│   │   └── schema.ts               # Zod schemas: AiReviewReport, RiskItem, etc.
│   └── review-draft/       # Review draft → GitHub comment conversion
│       ├── schema.ts               # ReviewDraft Zod schema
│       ├── build-review-draft.ts   # AI report → draft comments
│       └── build-submit-payload.ts # Draft → GitHub Review API payload
├── tests/                  # Test files (co-located per module)
│   ├── lib/
│   │   ├── ai/
│   │   ├── analysis/
│   │   ├── config/
│   │   └── ...
│   └── components/
├── scripts/
│   └── smoke-ai.ts         # CLI smoke test for AI pipeline
├── lingqi.config.json      # Project config overrides
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript strict config
└── next.config.ts          # Next.js configuration
```

## Naming Conventions

| Entity | Convention | Example |
|--------|-----------|---------|
| Files | kebab-case | `vercel-ai-provider.ts`, `review-profile.ts` |
| React components | PascalCase | `StatsPanel.tsx`, `RiskCard.tsx` |
| Types/interfaces | PascalCase | `AiReviewReport`, `RiskItem` |
| Functions | camelCase | `buildReviewPrompt()`, `analyzePullRequest()` |
| Constants | UPPER_SNAKE_CASE | `PRIORITY_RANK` |
| Test files | Mirror source under `tests/` | `tests/lib/ai/vercel-ai-provider.test.ts` |

## Key File Locations

| What | Where |
|------|-------|
| AI prompt | `lib/ai/vercel-ai-provider.ts` → `buildReviewPrompt()` |
| Report schema | `lib/report/schema.ts` → `AiReviewReportSchema` |
| Quality score calc | `components/StatsPanel.tsx` → `calcQualityScore()` |
| Severity levels | `lib/report/schema.ts` → `SeveritySchema` |
| Risk categories (7 dims) | `lib/report/schema.ts` → `RiskCategorySchema` |
| Default config | `lib/config/default-config.ts` |
| GitHub API client | `lib/github/github-client.ts` |

---

*Last mapped: 2026-05-31*
