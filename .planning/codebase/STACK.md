# STACK.md — LingQi Technology Stack

**Mapped:** 2026-05-31

## Languages & Runtime

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.8 |
| Runtime | Node.js | — |
| Framework | Next.js (App Router) | 15.3.3 |
| UI Library | React | 19 |
| CSS | Tailwind CSS | 4 |
| Package Manager | pnpm | — |

## Key Dependencies

### AI / LLM
- `@ai-sdk/deepseek` — DeepSeek provider adapter for Vercel AI SDK
- `ai` — Vercel AI SDK (`generateObject`, `zodSchema`)

### Validation & Schema
- `zod` — Runtime schema validation for AI output parsing

### Charts & UI
- `recharts` — Radar charts, donut charts, bar charts in StatsPanel
- `lucide-react` — Icon library (Sparkles, Shield, AlertTriangle, etc.)

### Build & Dev
- `next` — dev server, build, lint
- `typescript` — Strict mode enabled
- `@types/react`, `@types/node` — Type definitions

## Configuration Hierarchy

1. `lib/config/default-config.ts` — Hardcoded defaults (model: deepseek-v4-flash, temperature: 0.2, maxFiles: 30)
2. `lingqi.config.json` — Project-wide overrides (merged via deep merge)
3. `lingqi.config.local.json` — Local dev overrides (gitignored)
4. `.env.local` — Secrets (`DEEPSEEK_API_KEY`, `GITHUB_TOKEN`)

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Start Next.js dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Next.js built-in lint |
| `pnpm test` | Run Vitest test suite |
| `pnpm smoke-ai` | Run AI pipeline smoke test with sample data |

---

*Last mapped: 2026-05-31*
