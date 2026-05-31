# INTEGRATIONS.md — External Services & APIs

**Mapped:** 2026-05-31

## GitHub REST API

- **Library:** Raw `fetch()` — no Octokit SDK
- **Auth:** `GITHUB_TOKEN` env var → `Authorization: Bearer <token>` header
- **Base URL:** `https://api.github.com` (configurable via `lingqi.config.json` → `github.apiBaseUrl`)
- **Endpoints used:**
  - `GET /repos/{owner}/{repo}/pulls/{number}` — PR metadata
  - `GET /repos/{owner}/{repo}/pulls/{number}/files` — Changed files with patches
  - `GET /repos/{owner}/{repo}/pulls/{number}/commits` — Commit list
- **Error handling:** HTTP status → custom error classes (`GitHubHttpError`, `GitHubNotFoundError`)
- **Rate limiting:** No explicit rate-limit handling (relies on GitHub's 403 response)
- **Client file:** `lib/github/github-client.ts`

## DeepSeek AI (via Vercel AI SDK)

- **Provider:** `@ai-sdk/deepseek` → `createDeepSeek()` or default `deepseek()`
- **Model:** `deepseek-v4-flash` (default, configurable)
- **API Key:** `DEEPSEEK_API_KEY` env var (required)
- **Method:** `generateObject()` with `strictSchema: true`
- **Temperature:** 0.2 (default, configurable)
- **Max output tokens:** 4000 (default, configurable)
- **Timeout:** Configurable via `lingqi.config.json` → `ai.timeout`
- **Provider file:** `lib/ai/vercel-ai-provider.ts`
- **Provider factory:** `lib/ai/provider-factory.ts`

## No Integrations (Absent)

| Service | Status |
|---------|--------|
| Database | None — stateless application |
| Cache (Redis) | None |
| Auth Provider | None |
| Webhooks | None |
| GitHub Review API (POST) | Dry-run only — never posts to GitHub |

## Abandoned / Prototype Code

- `backend/` — Contains only `.pyc` cache artifacts; Python backend abandoned
- `frontend/` — Vue.js prototype, not part of current Next.js app

---

*Last mapped: 2026-05-31*
