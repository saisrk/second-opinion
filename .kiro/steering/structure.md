# Repository Structure

```text
.kiro/        steering/ specs/ hooks/ agents/ settings/mcp.json  (always committed)
apps/
  extension/  WXT: entrypoints/ (background, content, offscreen, sidepanel, options),
              src/adapters/, fixtures/snapshots/
  web/        Next.js: landing, /store, /eval, /how-it-was-built, embed
services/
  api/        Hono app
packages/
  core/       types, lexicon, similarity, judge interface, clusters, rating, verdict,
              prompts/, test/properties/
  ui/         shared React components + Storybook
  mcp/        MCP server (stdio bin + HTTP handler)
  eval/       so-eval CLI, dataset builder, fixtures/golden/
power/second-opinion/   POWER.md, mcp.json, steering/
crew/         (stretch) Night Watch crew
docs/         BUILD_PLAN.md, kiro-journal.md, eval-history.md, blog/, screenshots/
KIRO.md       Kiro write-up, one heading per required item
```

## Rules
- `packages/core` must never import browser APIs (`window`, `document`, `chrome.*`, `fetch` wrappers tied to a runtime) or Node-only APIs (`fs`, `path`, `crypto` from Node, `Buffer`). Platform needs are passed in as interfaces.
- Dependency direction: `apps/*`, `services/*`, `packages/mcp`, `packages/eval` may depend on `core`. `core` depends on nothing in the repo.
- Shared types live only in `packages/core/src/types.ts`. Do not redeclare them elsewhere.
- Retailer adapters live in `apps/extension/src/adapters/` and implement `matches(url)`, `extractListing(doc)`, `extractReviews(doc)`. Each has fixture tests against saved HTML.
- Prompts live in `packages/core/prompts/*.md` with a version header.
- Never edit `packages/eval/fixtures/golden/` (ground truth) to make a test pass.
- Never add `.kiro` to `.gitignore`.
- Specs in `.kiro/specs/<module>/` hold requirements.md, design.md, tasks.md. Logic that decides what a shopper sees goes through a spec; pure presentation may be vibe-coded.
