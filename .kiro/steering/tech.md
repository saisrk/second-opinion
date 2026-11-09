# Tech Stack

## Core rules
- pnpm workspaces + Turborepo monorepo. TypeScript `strict` everywhere. MIT licensed.
- One TypeScript engine (`@second-opinion/core`) runs in the extension, API, MCP server and CLI. Never reimplement scoring in another language.
- `packages/core` is pure: no browser APIs, no Node-only APIs. The LLM is injected through the `Judge` interface.
- Zod schemas mirror types in `packages/core/src/types.ts` and validate every boundary.

## Stack
- Extension: WXT (Vite), Manifest V3, React 19, Tailwind, `chrome.sidePanel`, offscreen document.
- On-device AI: Gemini Nano via Prompt API (`responseConstraint` JSON schema, `topK: 1`); embeddings `all-MiniLM-L6-v2` via Transformers.js (WebGPU, WASM fallback).
- Web: Next.js on Vercel (landing, demo store, `/eval`, embed). Shared components in `packages/ui` with Storybook.
- API: Hono on Node 22 (Vercel Functions). Routes: `/v1/analyze`, `/v1/demo/:slug`, `/v1/health`, `/mcp`.
- MCP: `@modelcontextprotocol/sdk`; tools `check_reviews`, `explain_flag`, `list_demo_listings`.
- Eval CLI: `so-eval` (commander), DuckDB over Amazon Reviews 2023 Parquet.
- Storage: Supabase Postgres (`verdict_cache`, `rate_limits`, `eval_runs`). Hashes and verdicts only.
- Testing: Vitest + fast-check (property tests), Playwright (e2e).

## Commands
Check `package.json` and `turbo.json` for exact scripts before running. Typical:
- `pnpm install`
- `pnpm turbo build | test | typecheck`
- `pnpm --filter core test:props` (property tests)
- `pnpm --filter extension dev` / `build` (WXT)

Do not start dev servers or watchers from the agent; ask the user to run them.
