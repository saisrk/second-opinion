# Fakespot, Resurrected — Full Build Plan (Kiroween 2026)

Nov 9, 2026 · @Krishnan

## 1. Overview

Build a Chrome extension plus a small hosted service that brings Fakespot back with one twist: every flag comes with evidence a shopper can read. Enter it in **Resurrection**, target submission on **1 Dec 2026**, and treat the deadline of 4 Dec, 2:00 PM PT, as a hard wall.

**Working title (proposal):** *Second Opinion — Fakespot, Resurrected*. It avoids the banned opening words (Necro, Ghost, Haunted, Franken, Phantom, Specter, Grimoire, Chimera) and explains the product in five words. Alternatives: *Reviews From Beyond*, *The Review Exorcist*.

### The pitch in one breath

Mozilla shut down Fakespot on 1 Jul 2025 and left shoppers with a mystery grade from nobody. This extension reads only the page you are on and shows three things: reviews **possessed** by another product, clusters of reviews written by **one ghost**, and an **exorcised rating** rebuilt from the reviews that survive. Every flag quotes the exact sentence that gave it away.

### Why it can win

| Judging criterion (20% each) | How this project scores |
| --- | --- |
| Potential Impact | Millions of former Fakespot users; about 43% of best-selling Amazon products had unreliable reviews (Circuit); review hijacking is an FTC-enforced harm |
| Technological Implementation | Every required Kiro item is used for a real job: specs per module, property-based tests on the scoring math, hooks, steering, an MCP server, a Kiro Power, custom agents, CLI eval runs |
| Design | A finished extension with side panel, badge, evidence cards and a hosted demo store, not a proof of concept |
| Innovation | Evidence instead of a grade; hijack detection by product-mismatch; on-device AI so no review text leaves the browser |
| Presentation | A 3-minute demo with an instant before/after (4.6 stars becomes 3.1) on a page judges can open themselves |

### Bonus prizes to target

- **Best Ghost of Kiroween Past** ($2k): the story of Grimoire Engine (2025, no video, no Kiro write-up) and how this entry fixes both.
- **Best Demo** ($1k): top 10% overall with the highest Presentation score.
- **Best Startup** ($10k): only if a company page and LinkedIn are in place; Fakespot's affiliate model is the precedent.
- **Blog** (100 prizes) and **Social Blitz** (5 prizes): cheap and nearly guaranteed effort-to-reward.
- **Best Kiro Crew App** ($1k): optional stretch, a nightly evaluation crew (Section 8).

## 2. Product spec

The MVP is one extension, one demo store and one MCP server, all running the same detection core. Anything outside the golden path waits until 25 Nov.

### Users and jobs

| User | Job to be done | Where they meet the product |
| --- | --- | --- |
| Shopper (former Fakespot user) | "Should I trust this rating before I buy?" | Extension badge and side panel on a product page |
| Judge | "Does it work, and is it more than a wrapper?" | Hosted demo store (no install) and the installable extension |
| Shopping agent / developer | "Are these reviews real?" as a tool call | MCP server `check_reviews`, packaged as a Kiro Power |
| Researcher | "How accurate is it?" | CLI eval report on Amazon Reviews 2023 |

### Features (MVP)

1. **Possession check.** Each review is compared with the listing title, category and key attributes. Reviews about a different product are flagged with the giveaway sentence highlighted.
2. **One ghost, many reviews.** Reviews with near-identical wording or a suspicious posting burst are grouped into a cluster card.
3. **Exorcised rating.** The star rating is recalculated from surviving reviews and shown next to the original, with a confidence band.
4. **Evidence cards.** Every flag shows the quote, the reason in plain English, the signal that fired and a confidence level. No card ever says "fake".
5. **Verdict badge.** The toolbar icon shows the count of possessed reviews ("7") in one of three colours: clear, caution, possessed.
6. **Privacy mode switch.** On-device (default when Gemini Nano is available) or cloud fallback, shown openly in the panel footer.
7. **Demo store.** A hosted fake retailer, "Bazaar of the Damned", with eight sample listings built from the open dataset. Judges can run the full flow without installing anything, through an embedded copy of the panel.

### User flow (golden path)

1. Shopper opens a product page. The content script detects the listing and extracts title, category, rating and visible reviews.
2. The badge shows a spinner, then a count within 3 seconds for 50 reviews on a capable laptop.
3. Clicking the badge opens the side panel: rating comparison at the top, possessed reviews next, clusters last.
4. Clicking an evidence card scrolls the page to that review and outlines it.
5. "Load more reviews" on the page triggers an incremental re-check of new reviews only.

### UI states the panel must handle

| State | What the shopper sees |
| --- | --- |
| Not a product page | "Nothing to examine here" with a link to the demo store |
| Model downloading | Progress bar from the Prompt API download monitor, cloud fallback offered |
| Analysing | Skeleton cards, reviews processed / total |
| Clear | "No possessions found in N reviews" and both ratings equal |
| Possessed | Counts, rating delta, evidence cards |
| Insufficient evidence | Fewer than 5 surviving reviews: no number, only the message |
| Error | What failed and a retry button; never a silent blank panel |

### Non-goals for the hackathon

- Multiple real retailers, mobile browsers, accounts, payments, affiliate links.
- Scraping pages the user has not opened, or storing review text on a server.
- Calling any product, seller or reviewer "fake" or "fraudulent".

## 3. Detection engine

The engine is a pure TypeScript package, `@second-opinion/core`, with the LLM injected as an interface. That one decision makes every scoring rule testable with property-based tests, and lets the same code run in the extension, the cloud API, the MCP server and the CLI.

### 3.1 Inputs

- **Listing profile:** title, breadcrumb category, brand, 3–8 key attributes (from bullet points), listing star rating and review count.
- **Reviews:** id, text, title, stars, date, verified flag (if shown), helpful votes (if shown), reviewer display name (hashed immediately, never stored raw).

### 3.2 Possession check (three stages, cheapest first)

1. **Category lexicon screen (deterministic, about 1 ms per review).** A curated lexicon maps roughly 40 top-level categories to typical nouns ("toddler", "mug", "plush", "umbrella", "earcup", "bluetooth"). A review whose nouns match a different category far more than the listing's category gets a mismatch score from 0 to 1.
2. **Semantic similarity (on-device embeddings).** `all-MiniLM-L6-v2` via Transformers.js (WebGPU, WASM fallback) in an offscreen document embeds the listing profile and each review. Cosine similarity below a calibrated threshold marks the review as a candidate. Thresholds are tuned on the eval set in Section 12, not by hand.
3. **LLM judge (only for candidates).** Gemini Nano through the Prompt API, with a JSON-schema `responseConstraint`, answers: is this review about the listed product, which product does it seem to describe, and which exact sentence shows it. Cloud fallback uses the same prompt and schema.

A review is **possessed** only when the judge says "different product" *and* its evidence quote is a verbatim substring of the review *and* at least one of stages 1–2 agreed. A quote that fails the substring check is discarded and the review is marked "unclear", never flagged. This guard stops a hallucinated sentence from ever appearing as evidence.

### 3.3 One ghost, many reviews

- **Near-duplicate text:** word 3-gram shingles, MinHash with 128 permutations, Jaccard of 0.6 or more joins two reviews. Union-find builds clusters; a cluster needs 3 or more members.
- **Posting bursts:** daily review counts; a day is a burst when its count exceeds the median plus 3 × MAD and 80% or more of that day's reviews are 5 stars.
- **Style fingerprint (stretch):** sentence length, punctuation rate, emoji rate and opener phrases; used only to strengthen an existing cluster, never to create one.

### 3.4 Exorcised rating

Possessed reviews are removed. Each surviving cluster counts as one voice: its members share a weight of 1 divided by the cluster size. Unclustered reviews keep weight 1.

```latex
\hat{r} = \frac{\sum_i w_i s_i}{\sum_i w_i}, \qquad w_i = \begin{cases} 0 & \text{possessed} \\ 1/|C| & \text{in cluster } C \\ 1 & \text{otherwise} \end{cases}
```

The effective sample size is the sum of weights. Below 5, the panel shows "insufficient evidence" and no number. Otherwise the panel shows the rating rounded to one decimal with a bootstrap 80% interval (500 resamples, seeded from the listing hash so the interval is reproducible).

### 3.5 Verdict levels

| Level | Rule | Badge |
| --- | --- | --- |
| Clear | 0 possessed, no cluster of 5+, rating delta under 0.3 | Neutral, no count |
| Caution | 1–4 possessed, or a cluster of 3+, or delta 0.3–0.7 | Amber with count |
| Possessed | 5+ possessed, or 15% or more of reviews possessed, or delta over 0.7 | Red with count |

### 3.6 Determinism

The judge runs with `topK: 1` in the extension, and every verdict is cached under a hash of (review text, listing profile, prompt version, model id). Same input therefore gives the same output on the same machine. The core itself is deterministic given judge results; tests inject a stub judge.

## 4. System architecture

Analysis runs in the shopper's browser by default; the cloud API is used only when Gemini Nano is unavailable or when a judge uses the no-install embed. One TypeScript engine sits under every surface.

&#91;embedded content: system architecture · browser, cloud, tooling\]

The dashed arrow is the only path by which review text can leave the browser, and it is off unless the shopper's machine cannot run the on-device model or the shopper turns cloud mode on.

**Deployment:** the web app and API deploy to Vercel from `main`; Supabase holds only hashes, verdicts and counters; the extension ships through the Chrome Web Store with a zip on each GitHub release; the Power installs from the repo's `power/` folder.

## 5. Frontend

There are two frontends: the Chrome extension (the product) and a Next.js site (demo store, landing page, judge access). Both use the same React component library, so the side panel and the no-install embed look identical.

### 5.1 Chrome extension (Manifest V3)

| Piece | Tech | Responsibility |
| --- | --- | --- |
| Build | WXT (Vite-based extension framework), TypeScript, React 19, Tailwind | Hot reload, MV3 manifest generation, zip for the Web Store |
| Content script | Plain TS, one adapter per page layout | Detect a product page, extract listing + reviews, watch for "load more" with a MutationObserver, highlight reviews on request |
| Service worker | MV3 background | Message routing, badge text and colour, cache lookups (`chrome.storage.local`), cloud fallback calls |
| Offscreen document | Extension page | Runs Transformers.js embeddings (WebGPU, WASM fallback) and the Prompt API judge session; kept alive while analysis runs |
| Side panel | `chrome.sidePanel`, React | Rating comparison, evidence cards, clusters, settings |
| Options page | React | Mode (on-device / cloud / off), cloud consent, clear cache |

**Permissions:** `sidePanel`, `storage`, `offscreen`, `activeTab`, and host permissions only for the demo store domain plus the one retailer layout chosen. No `<all_urls>`, no history, no cookies. This keeps Web Store review fast and is a talking point in the video.

**Retailer adapters.** Each adapter implements `matches(url)`, `extractListing(doc)` and `extractReviews(doc)`. The MVP ships two: `demo-store` (always works) and one real layout. Adapters are fixture-tested against saved HTML snapshots, so layout changes are caught by a test, not by a judge.

### 5.2 Side panel design

- **Header:** the two ratings side by side, "4.6 → 3.1", with the interval as a thin band and the verdict level as a word.
- **Possessed reviews:** cards with the review's stars, the highlighted giveaway sentence, a one-line reason ("Describes a plush toy, not headphones") and a "show on page" link.
- **Clusters:** stacked cards showing members, shared phrases highlighted, and the burst date if any.
- **Footer:** mode indicator ("On-device · nothing left your browser") and reviews examined.
- **Theme:** restrained Halloween. A candlelit palette, an ectoplasm-green highlight for evidence and a subtle flicker on the badge only. Text stays high-contrast and the panel passes keyboard and screen-reader checks; spooky never beats readable.

### 5.3 Demo store and judge site (Next.js on Vercel)

- **`/` landing:** pitch, 3-minute video, install button, link to the repo and Kiro write-up.
- **`/store`:** "Bazaar of the Damned", eight listings: four with injected hijacked reviews, two with a planted cluster, two clean controls. Built statically from dataset JSON.
- **`/store/[slug]`:** a product page in the markup the `demo-store` adapter reads. With the extension installed, the real extension runs here.
- **No-install mode:** a "Get a second opinion" button on each listing opens the same panel component as an embed, backed by the cloud API. Judges without Gemini Nano hardware still see everything.
- **`/eval`:** the latest CLI evaluation report (precision, recall, confusion matrix), regenerated on each release.
- **`/how-it-was-built`:** the Kiro write-up, mirrored from the repo.

### 5.4 Shared UI package

`packages/ui` holds `RatingCompare`, `EvidenceCard`, `ClusterCard`, `VerdictBadge` and `ModeFooter`, with Storybook stories. Visual states from Section 2 each get a story, so Costume-level polish can be reviewed without a live page.

## 6. Backend

Use **Node/TypeScript (Hono)** for the backend rather than FastAPI, even though FastAPI is the usual choice. The core engine is TypeScript because it must run in the browser; a Python backend would mean writing the scoring rules twice and testing them twice. One codebase, one property-test suite.

### 6.1 Services

| Service | Tech | Hosting | Purpose |
| --- | --- | --- | --- |
| Analysis API | Hono on Node 22, `@second-opinion/core` | Vercel Functions (Node runtime) | Cloud fallback and the no-install embed |
| MCP server | `@modelcontextprotocol/sdk` (TypeScript) | stdio (local, via the Power) and Streamable HTTP at `/mcp` on the API | `check_reviews` for any agent |
| Eval CLI | Node CLI (`commander`), DuckDB for dataset slicing | Local and GitHub Actions | Precision/recall on Amazon Reviews 2023 |
| Dataset builder | Node script + DuckDB over Parquet from Hugging Face | Local, once | Builds demo listings and labelled eval sets |
| Store | Supabase Postgres | Supabase free tier | Verdict cache (hashes and verdicts, 24 h TTL), rate-limit counters, eval run history |

### 6.2 Analysis API

- `POST /v1/analyze`: body is a listing profile plus up to 100 reviews; returns the full report (Section 7). Runs the three-stage check with server-side embeddings (the same MiniLM model via Transformers.js in Node) and a small hosted LLM as judge.
- `GET /v1/demo/:slug`: returns a pre-computed report for a demo listing, so the judge embed is instant and costs nothing.
- `GET /v1/health`: model ids, prompt version, cache hit rate.
- **LLM provider:** one adapter interface with two implementations (for example a Gemini Flash-class model and a Claude Haiku-class model). Pick the cheaper after the eval run; switching is a config change.
- **Cost and abuse controls:** 20 analyses per IP per hour, a daily global cap, request size limits, and a kill switch that serves only `/v1/demo` if the monthly spend cap is reached. Judge access must survive until 29 Jan 2027, so the cap is set for three months of light traffic.
- **Privacy:** the API never stores review text. The cache key is a SHA-256 of the inputs; the cached value is the verdict with evidence quotes, expiring after 24 hours.

### 6.3 MCP server

| Tool | Input | Output |
| --- | --- | --- |
| `check_reviews` | listing profile, reviews\[\] | report: possessed ids with evidence, clusters, ratings, verdict |
| `explain_flag` | report id, review id | plain-English explanation in "evidence, not accusations" wording |
| `list_demo_listings` | none | slugs and titles of demo listings, for agents to try |

The local stdio server runs embeddings plus the hosted judge through the user's own API key, and falls back to the demo endpoint if no key is set. The HTTP endpoint is rate-limited like the API.

### 6.4 Eval CLI and dataset pipeline

1. Pull 6 categories from Amazon Reviews 2023 (Electronics, Toys, Home & Kitchen, Beauty, Pet Supplies, Sports) as Parquet; slice with DuckDB.
2. For each sampled product, keep its real reviews as "clean" and inject 5–30% reviews taken from a different category as "hijacked", recording ground truth.
3. Plant near-duplicate clusters by lightly paraphrasing one review 3–8 times with dated bursts, also recorded.
4. `so-eval run --set dev|test --judge nano|cloud|stub` writes `report.json` and `report.md` (precision, recall, F1 per signal, threshold curve).
5. CI runs the stub-judge eval on every push; the full cloud eval runs nightly and before each release.

## 7. Data model and API contracts

These types live in `packages/core/src/types.ts` and are the single contract shared by the extension, API, MCP server and CLI. Zod schemas mirror them for runtime validation at every boundary.

```typescript
export interface ListingProfile {
  url: string;            // page the user is viewing
  title: string;
  category: string[];     // breadcrumb, most general first
  brand?: string;
  attributes: string[];   // 3-8 key bullet points
  listedRating: number;   // 1-5 as shown on the page
  listedCount: number;
}

export interface Review {
  id: string;             // stable hash of text + date + stars
  text: string;
  title?: string;
  stars: 1 | 2 | 3 | 4 | 5;
  date: string;           // ISO 8601
  verified?: boolean;
  reviewerHash?: string;  // SHA-256, raw name never kept
}

export type Possession = 'about-listing' | 'possessed' | 'unclear';

export interface ReviewVerdict {
  reviewId: string;
  possession: Possession;
  describes?: string;         // "a plush toy"
  evidenceQuote?: string;     // MUST be a substring of review.text
  signals: Array<'lexicon' | 'semantic' | 'judge'>;
  confidence: 'low' | 'medium' | 'high';
}

export interface Cluster {
  id: string;
  reviewIds: string[];        // length >= 3
  kind: 'near-duplicate' | 'burst' | 'both';
  sharedPhrases: string[];
  burstDate?: string;
}

export interface Report {
  listingUrl: string;
  verdicts: ReviewVerdict[];
  clusters: Cluster[];
  originalRating: number;
  exorcised:
    | { kind: 'rating'; value: number; low: number; high: number; effectiveN: number }
    | { kind: 'insufficient-evidence'; effectiveN: number };
  level: 'clear' | 'caution' | 'possessed';
  mode: 'on-device' | 'cloud' | 'demo';
  engineVersion: string;      // core semver + prompt version + model id
}

export interface Judge {   // injected; stubbed in tests
  check(listing: ListingProfile, review: Review): Promise<{
    aboutListing: 'yes' | 'no' | 'unclear';
    describes?: string;
    evidenceQuote?: string;
  }>;
}
```

### Judge prompt contract

- **System:** "You check whether a product review is about the listed product. Reply only in the JSON schema. Quote one sentence from the review exactly as written. Never judge whether the review is honest."
- **Response schema** (passed as `responseConstraint`): `aboutListing` enum, `describes` string up to 60 characters, `evidenceQuote` string up to 300 characters.
- **Versioning:** prompts live in `packages/core/prompts/*.md` with a version header; the version is part of every cache key and report.

### Supabase tables

| Table | Columns | Notes |
| --- | --- | --- |
| `verdict_cache` | `key` (sha256, PK), `verdict` (jsonb), `expires_at` | No raw review text beyond the evidence quote; purged hourly |
| `rate_limits` | `bucket`, `window_start`, `count` | IP is hashed with a daily salt |
| `eval_runs` | `id`, `git_sha`, `judge`, `set`, `metrics` (jsonb), `created_at` | Feeds `/eval` page |

## 8. Kiro maximum-usage playbook

Every Kiro feature below does a real job in this build, and every one leaves a file in `.kiro/` or a log the write-up can point to. "Insufficient use of Kiro" is a disqualifier and Technological Implementation is 20%, so the rule is: no feature used only for show, no feature left unused.

### 8.1 Coverage map (what the write-up will cite)

| Required write-up item | What it does in this project | Evidence left behind |
| --- | --- | --- |
| Kiro IDE | Main build surface: specs, tasks, hooks, checkpoints and rewind | Spec task history, screenshots |
| Kiro CLI (V3) | Headless eval runs and release checks in GitHub Actions | `.github/workflows/nightly-eval.yml`, JSON Lines logs |
| Kiro Web | Spec review away from the desk; one autonomous PR (new demo listings) | Linked PR, screenshot |
| Kiro Crew (stretch) | "Night Watch" crew runs the eval nightly and posts a digest | `crew/` app folder, digest screenshots |
| Custom agents | Review Coroner, Adapter Smith, Eval Analyst, Copy Warden, Release Captain | `.kiro/agents/*.json` |
| Hooks | Property tests on save, fixture guard, permission guard, copy check, post-task eval | `.kiro/hooks/*.json`, hook output in the journal |
| Specs vs vibe coding | Specs for engine, API, MCP, CLI; vibe for landing page, store styling, Storybook | `.kiro/specs/*`, a table in the write-up |
| Steering | Product, tech, structure, evidence wording, privacy, MV3 rules | `.kiro/steering/*.md` |
| MCP | Product ships an MCP server; development uses Playwright, GitHub, Supabase and Vercel MCP | `.kiro/settings/mcp.json`, `packages/mcp` |
| Property-based testing | Kiro-extracted properties on every scoring rule (Section 10) | `packages/core/test/properties/*`, requirement links |
| Kiro Powers | "Second Opinion" Power packages MCP server + steering; Power Builder used to create it | `power/` folder, install video clip |
| Kiro workflows (bonus variety) | Release workflow: eval, copy review and tests in parallel, then package | Workflow file, run screenshot |

### 8.2 Phase 0: set-up (day 1)

1. Request the free 4,000 Kiro credits today (deadline 1 Dec, 12:00 PM PT; they expire 31 Dec).
2. Create the public repo with an MIT license visible in the About panel. Commit `.kiro/` on the first commit and add a CI check that fails if `.kiro` ever appears in `.gitignore`.
3. Open the repo in Kiro IDE and run **Generate steering docs** to create `product.md`, `tech.md` and `structure.md`. Edit them by hand: these three files steer every later spec.
4. Start `docs/kiro-journal.md`: one line per meaningful Kiro moment (date, feature, what happened, file). The write-up and blog post are compiled from it, so they never get written from memory on 3 Dec.
5. Connect the repo to Kiro Web and turn on Configuration Sync so steering and Powers follow you between IDE, CLI and Web.

### 8.3 Phase 1: steering (day 1)

| File | Inclusion | Content |
| --- | --- | --- |
| `product.md` | always | Users, golden path, verdict levels, non-goals |
| `tech.md` | always | pnpm monorepo, TypeScript strict, WXT, Hono, Zod, fast-check, Vitest |
| `structure.md` | always | Folder rules from Section 9; core must not import browser APIs |
| `evidence-not-accusations.md` | always | Banned words in UI copy (fake, fraud, scam, liar); every flag must carry a quote and a reason |
| `privacy.md` | always | No review text persisted server-side; hashed reviewer names; no new host permissions without a spec change |
| `extension-mv3.md` | fileMatch `apps/extension/**` | MV3 lifecycle, offscreen document rules, Prompt API availability checks |
| `testing.md` | fileMatch `**/*.test.ts` | Property tests use fast-check, at least 200 runs, seeded; stub judge only |
| `prompts.md` | fileMatch `packages/core/prompts/**` | Prompt versioning, JSON schema, quote-must-match rule |

Steering files start with a front-matter block, for example `inclusion: fileMatch` and `fileMatchPattern: "apps/extension/**"`.

### 8.4 Phase 2: specs (days 2–4)

Write one spec per module, in this order, each with requirements in EARS format, a design with correctness properties, and a task list:

1. `core-possession` — listing profile, lexicon screen, similarity, judge interface, quote guard.
2. `core-clusters-rating` — MinHash clusters, bursts, weights, exorcised rating, verdict levels.
3. `extension` — adapters, offscreen document, side panel, badge, states.
4. `cloud-api` — endpoints, rate limits, cache, kill switch.
5. `mcp-server` — tools, transports, error shapes.
6. `eval-cli` — dataset builder, injection, metrics, reports.

In each design phase, let Kiro extract correctness properties from the requirements, then review them against Section 10 and add any that are missing. Hovering a property shows its requirement and task; screenshot two of these for the write-up. When a real bug appears (one will), file it as a **Bugfix spec** rather than a vibe fix, so the write-up has a before/after story.

**Vibe coding, on purpose:** the landing page, store styling, Storybook stories and blog post images. The write-up states the rule: logic that decides what a shopper sees goes through a spec; presentation that can be judged by eye is vibe-coded.

### 8.5 Phase 3: hooks (day 2, then grow)

Hook files live in `.kiro/hooks/` as JSON. Pre Tool Use and Pre Task Execution can block (a command that exits with code 2 blocks and returns its stderr to the agent). Pre/Post Task Execution hooks run in the IDE only; the others also run in CLI V3.

| Hook file | Trigger | Matcher | Action |
| --- | --- | --- | --- |
| `property-tests-on-save.json` | File Save | `packages/core/src/.*\.ts$` | Command: run related property tests |
| `adapter-fixtures.json` | File Save | `apps/extension/src/adapters/.*` | Command: run adapter snapshot tests |
| `guard-golden-fixtures.json` | Pre Tool Use | write tools | Command: exit 2 if the target path is under `fixtures/golden/` — the agent may never edit ground truth to make a test pass |
| `guard-permissions.json` | Pre Tool Use | write tools | Command: exit 2 if `wxt.config.ts` gains a permission not on the allowlist |
| `copy-warden.json` | File Save | `packages/ui/.*\.tsx$` | Agent prompt: check strings against `evidence-not-accusations.md` |
| `ready-to-start.json` | Pre Task Execution | — | Command: block if the property suite is red |
| `eval-after-task.json` | Post Task Execution | — | Command: stub-judge eval; append metrics to the journal |
| `journal-on-stop.json` | Agent Stop | — | Agent prompt: add one journal line if something notable happened |
| `release-check.json` | Manual | — | Command: full checklist from Section 13 |

Example, in the documented v1 shape:

```json
{
  "version": "v1",
  "hooks": [{
    "name": "property-tests-on-save",
    "trigger": "PostFileSave",
    "matcher": "packages/core/src/.*\\.ts$",
    "action": { "type": "command", "command": "pnpm --filter core test:props --related" },
    "timeout": 60,
    "enabled": true
  }]
}
```

Check the agent-prompt action field names against the Hook Actions page before writing those two hooks; the schema has changed between IDE 0.x and 1.0.

### 8.6 Phase 4: custom agents (days 3–10)

Agents live in `.kiro/agents/` (JSON or Markdown; the file name is the agent name) and are also invoked as sub-agents from spec tasks.

| Agent | Job | Tools allowed | Resources |
| --- | --- | --- | --- |
| Review Coroner | Writes and tests flag explanations; reviews judge outputs on the dev set | read, core test runner | `evidence-not-accusations.md`, prompts |
| Adapter Smith | Builds a retailer adapter from a saved HTML snapshot | read/write in `adapters/` and `fixtures/snapshots/` only | `extension-mv3.md` |
| Eval Analyst | Runs the CLI, reads the report, proposes threshold changes as a PR description | shell (`so-eval` only), read | `eval-cli` spec |
| Copy Warden | Reviews UI copy and the store listing text | read | product and evidence steering |
| Release Captain | Builds the extension zip, runs checks, drafts release notes | shell (allowlisted scripts) | Section 13 checklist |

Each agent's `allowedTools` is narrow by design. The write-up can show that Adapter Smith literally cannot touch the scoring core.

### 8.7 Phase 5: MCP during development (from day 2)

- **Playwright MCP:** drives a Chromium with the unpacked extension against the demo store for end-to-end checks.
- **GitHub MCP:** issues for each spec task, PRs from Kiro Web.
- **Supabase MCP:** creates tables and checks cache expiry.
- **Vercel MCP:** deploys previews and reads runtime logs.
- **Own server:** once `packages/mcp` exists, add it to `.kiro/settings/mcp.json` and let Kiro call `check_reviews` on the demo listings during development. Dogfooding the product's own tool is a strong write-up line.

### 8.8 Phase 6: the Power (days 18–20)

1. Install Kiro's **Power Builder** Power and use it to scaffold `power/second-opinion/`.
2. `POWER.md`: front-matter with activation keywords (reviews, fake reviews, review hijacking, product rating, shopping agent), onboarding steps, tool docs with parameter tables, do/don't list.
3. `mcp.json`: runs `npx @second-opinion/mcp`.
4. `steering/evidence-wording.md` and `steering/integrate-check-reviews.md`.
5. Test it from a fresh folder: Powers panel → Add Custom Power → Import power from a folder. Record this for the video: a clean Kiro window, the Power installed, then "are the reviews on this listing real?" answered with evidence.
6. Sync it to Kiro Web through Configuration Sync, and publish the folder in the repo so judges can install from the GitHub URL.

### 8.9 Phase 7: CLI, Web, workflows and Crew (days 12–24)

- **CLI V3 headless:** a nightly GitHub Action runs `kiro-cli` headless with the Eval Analyst agent and `--output-format stream-json`; the summary is committed to `docs/eval-history.md`.
- **Kiro Web:** give one autonomous task ("add two demo listings from the Pet Supplies slice following the existing pattern") and merge the resulting PR after review. Review specs from the phone at least once and screenshot it.
- **Kiro workflows:** a `release` workflow runs Eval Analyst, Copy Warden and the test suite in parallel, then Release Captain. It shows multi-agent orchestration without inventing a use for it.
- **Kiro Crew (stretch, only if days 1–20 are on schedule):** "Night Watch", a small Crew app that re-runs the eval against the latest build each night and posts a digest to Telegram. It qualifies for Best Kiro Crew App; drop it without regret if time is short.

### 8.10 Habits that make the write-up easy

- Use **checkpoints and rewind** whenever a vibe session goes sideways, and note it in the journal.
- Keep spec task status honest; the task list is evidence.
- Screenshot as you go: property extraction, a blocked Pre Tool Use, a Kiro Web PR, the Power install.
- Write the write-up as one Markdown file, `KIRO.md`, with one heading per required item, each linking to files.

## 9. Repository layout

One pnpm + Turborepo monorepo, MIT licensed, with `.kiro/` at the root as the rules require. `packages/core` imports nothing from the browser or Node, which is what lets one test suite cover every surface.

```text
second-opinion/
├── .kiro/
│   ├── steering/      product.md tech.md structure.md evidence-not-accusations.md
│   │                  privacy.md extension-mv3.md testing.md prompts.md
│   ├── specs/
│   │   ├── core-possession/        requirements.md design.md tasks.md
│   │   ├── core-clusters-rating/   ...
│   │   ├── extension/              ...
│   │   ├── cloud-api/              ...
│   │   ├── mcp-server/             ...
│   │   ├── eval-cli/               ...
│   │   └── bugfix-<name>/          (at least one real bugfix spec)
│   ├── hooks/         property-tests-on-save.json guard-golden-fixtures.json ...
│   ├── agents/        review-coroner.json adapter-smith.json eval-analyst.json
│   │                  copy-warden.json release-captain.json
│   └── settings/      mcp.json
├── apps/
│   ├── extension/     WXT project: entrypoints/ (background, content, offscreen,
│   │                  sidepanel, options), src/adapters/, fixtures/snapshots/
│   └── web/           Next.js: landing, /store, /eval, /how-it-was-built, embed
├── services/
│   └── api/           Hono app: /v1/analyze, /v1/demo, /mcp, /v1/health
├── packages/
│   ├── core/          types, lexicon, similarity, judge interface, clusters,
│   │                  rating, verdict; prompts/; test/properties/
│   ├── ui/            shared React components + Storybook
│   ├── mcp/           MCP server (stdio bin + HTTP handler)
│   └── eval/          so-eval CLI, dataset builder, fixtures/golden/
├── power/second-opinion/   POWER.md mcp.json steering/
├── crew/              (stretch) Night Watch Crew app
├── docs/              kiro-journal.md eval-history.md blog/ screenshots/
├── KIRO.md            the Kiro write-up, one heading per required item
├── LICENSE            MIT
└── README.md          install, run, judge instructions, eval numbers
```

Resurrection is a single-app category, so the two-app-folder rule for Skeleton Crew does not apply; the extension and the web app are one product with two faces.

## 10. Property-based test catalogue

Twelve properties cover the rules a shopper actually relies on. All run with fast-check, at least 200 runs each, a fixed seed in CI, and the stub judge; generators produce random listings, review sets, dates and judge answers.

| # | Property | Kind | Requirement it guards |
| --- | --- | --- | --- |
| P1 | Exorcised rating, when shown, is always between 1 and 5, and between the minimum and maximum surviving star | Invariant | Rating is a real rating |
| P2 | Effective N below 5 always yields "insufficient evidence", never a number | Invariant | No false precision |
| P3 | Every `evidenceQuote` in a report is a verbatim substring of its review's text | Invariant | No invented evidence |
| P4 | A judge answer whose quote is not in the review never produces "possessed" | Metamorphic | Hallucination guard |
| P5 | Removing one review never changes the possession verdict of any other review | Independence | Flags are per review |
| P6 | Same listing, reviews and judge answers in any order give the same report | Order invariance | Determinism |
| P7 | Running analysis twice on the same input gives byte-identical reports | Idempotence | Determinism |
| P8 | Adding a review identical to an existing one never makes a cluster smaller | Monotonicity | Clusters behave sensibly |
| P9 | If no review is possessed or clustered, the exorcised rating equals the plain mean | Model-based | Rating math matches the spec |
| P10 | Possessing more reviews never moves the verdict level towards "clear" | Monotonicity | Levels make sense |
| P11 | Report JSON round-trips through the Zod schema unchanged | Round-trip | Contract between surfaces |
| P12 | No user-facing string generated for a report contains a banned word | Invariant | Evidence, not accusations |

Kiro extracts most of these from the EARS requirements during the design phase. P3, P4 and P12 are the ones to add by hand if Kiro misses them, because they encode the product's honesty promise.

**Example-based tests sit beside them:** adapter snapshot tests per saved HTML page, a golden-file test per demo listing, and Playwright end-to-end runs of the golden path.

## 11. Build schedule

The plan reaches a working golden path by 21 Nov and leaves 25 Nov–1 Dec for polish, video and write-up. If the other two projects run in parallel, cut in this order: Crew, style fingerprint, second retailer adapter.

&#91;embedded content: build schedule · 9 Nov to 4 Dec 2026\]

### Weekly gates

1. **16 Nov:** all six specs written; core engine passes P1–P12 with the stub judge; `.kiro/` has steering, five hooks and two agents.
2. **21 Nov:** extension runs the golden path on the demo store on-device; first dev-set eval published; Web Store submission sent.
3. **25 Nov:** cloud API, MCP server, no-install embed and Power all work from a clean machine; Crew decision made.
4. **1 Dec:** test-set numbers on `/eval`, video public, `KIRO.md` complete, blog and social posts live, Devpost submitted.

## 12. Evaluation and metrics

Publish real numbers in the README and on `/eval`; a judge who sees precision and recall stops wondering whether the demo is staged. Targets below are goals to aim for, not results; report whatever the test set actually gives.

### Data

- **Dev set:** 300 products across 6 categories, about 15,000 reviews, 5–30% injected hijacks per product, 1 planted cluster in every third product. Used for threshold tuning.
- **Test set:** 200 different products built the same way, touched only for the final report.
- **Hard negatives:** reviews that mention another product in passing ("better than my old Sony") but are about the listing. They catch an over-eager judge.

### Metrics and targets

| Metric | Definition | Target |
| --- | --- | --- |
| Possession precision | Flagged and truly injected ÷ flagged | 0.90 or higher |
| Possession recall | Flagged and injected ÷ injected | 0.70 or higher |
| Hard-negative false-flag rate | Hard negatives flagged ÷ hard negatives | 5% or lower |
| Cluster recall | Planted clusters found ÷ planted | 0.80 or higher |
| Rating error | Mean absolute gap between exorcised rating and the true clean rating | Within 0.2 stars |
| Latency (on-device, 50 reviews) | Page load to badge | Under 3 s on a 16 GB laptop |
| Cost (cloud, 50 reviews) | LLM spend per analysis | Under $0.002 |

Precision matters more than recall: a false flag on an honest review is the failure that ends trust, so thresholds are tuned for precision first.

### Report per run

`report.md` holds a confusion matrix, per-category precision/recall, the threshold curve, and ten sampled errors with their evidence quotes. The Eval Analyst agent reads it and proposes changes; a human merges them.

## 13. Demo video and submission package

The video is 2:50, recorded on a real laptop in Chrome (the intended device), with royalty-free or self-made audio only. Presentation is 20% of the score and decides Best Demo, so script it, rehearse it, and record it by 28 Nov.

### Video script

| Time | Scene | Line (spoken) |
| --- | --- | --- |
| 0:00–0:15 | News headline of Fakespot's shutdown, cut to a product page | "In July 2025 Mozilla killed Fakespot. Shoppers lost the one tool that checked reviews." |
| 0:15–0:35 | Headphones listing, 4.6 stars; scroll to "my toddler loves this plush bunny" | "This is review hijacking: a listing inherits another product's reviews." |
| 0:35–1:20 | Badge shows 7; side panel opens; evidence cards; click scrolls to the review; cluster card | "Second Opinion reads only this page, on your device, and shows its evidence." |
| 1:20–1:35 | Rating flips 4.6 → 3.1 with the interval | "The exorcised rating, from the reviews that survive." |
| 1:35–1:50 | Footer "On-device"; network tab empty | "Nothing left the browser." |
| 1:50–2:30 | Kiro: a spec with extracted properties, the golden-fixture hook blocking an edit, Power installed in a clean window answering via MCP | "Built spec-first in Kiro, with property tests on every rule." |
| 2:30–2:50 | `/eval` numbers, store URL, repo | "Try it yourself — no install needed." |

### Submission checklist (target 1 Dec)

- [ ] Public GitHub repo; MIT license shown in the About section; `/.kiro` at the root with specs, hooks, steering and agents; not gitignored
- [ ] Live URL (store + landing) with free, unrestricted access until 29 Jan 2027; spend cap and kill switch tested
- [ ] Extension installable: Chrome Web Store listing (submit by 20 Nov to absorb review time) and an unpacked zip on the GitHub release as backup
- [ ] YouTube video, public, under 3:00, no trademarks or music without a licence; avoid showing a real retailer's logo
- [ ] `KIRO.md` covers IDE, CLI, Web and Crew (and how they differ), custom agents, hooks, specs vs vibe coding, steering, MCP, property-based testing, Powers
- [ ] Category: Resurrection; disclose any pre-existing code (none planned)
- [ ] Ghost of Kiroween Past story in the description (Grimoire Engine → this entry)
- [ ] Blog post stating it was written for Kiroween 2026; social post starting with #KiroweenHackathon26
- [ ] Startup bonus only if company page and LinkedIn exist
- [ ] Confirm the rules on multiple submissions per entrant before submitting the other two projects

## 14. Risks and open decisions

The biggest risk is not the model; it is a judge opening the extension on hardware without Gemini Nano and seeing nothing. The no-install embed and the cloud fallback exist for that reason and must work before anything else ships.

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Judge's machine can't run Gemini Nano (needs 16 GB RAM and 4 cores, or a GPU over 4 GB VRAM, plus 22 GB free disk; no Android/iOS) | High | Cloud fallback by default when `availability()` isn't "available"; demo reports pre-computed |
| Prompt API supports only en, ja, es, de, fr | Medium | Scope the MVP to English reviews; route other languages to the cloud judge |
| On-device judge too slow for 100+ reviews | Medium | Lexicon and similarity screens first; judge only candidates; batch prompts |
| False flags on honest reviews | Medium | Three-signal agreement rule, quote guard, precision-first thresholds, hard negatives in eval |
| Retailer terms of service | Medium | Analyse only the open page; the demo and video use the hosted store, not a live retailer |
| Web Store review delay | Medium | Submit by 20 Nov; unpacked zip on GitHub as backup |
| Judge access costs until 29 Jan 2027 | Low | Pre-computed demo reports, rate limits, spend cap, kill switch |
| Building three projects at once | High | This is project 1 of 3: hold the Section 11 dates; cut Crew and style fingerprints first |

### Open decisions (decide by 12 Nov)

- **Final title:** *Second Opinion — Fakespot, Resurrected* is the proposal. Check that using the name "Fakespot" in a subtitle is fine; if in doubt, say "the review checker Mozilla shut down" instead.
- **Real retailer layout:** pick one for the second adapter, or ship demo-store only and say so plainly.
- **Cloud judge model:** decide after the first dev-set eval on cost and precision.
- **Clustering scope:** near-duplicate and burst are in the MVP; style fingerprint is a stretch.
- **Crew stretch:** go or no-go on 24 Nov based on schedule.

## 15. Sources

Kiro and Chrome facts were checked on 9 Nov 2026; product evidence comes from the original project brief.

- [Kiro hooks overview (triggers, blocking, JSON schema)](https://kiro.dev/docs/hooks/index)
- [Kiro hook trigger types](https://kiro.dev/docs/hooks/types/index)
- [Kiro CLI V3 hooks (exit code 2 blocks)](https://kiro.dev/docs/cli/v3/hooks)
- [Kiro custom agents](https://kiro.dev/docs/custom-agents/creating/)
- [Kiro Powers: create](https://kiro.dev/docs/powers/create/)
- [Kiro Powers overview and Configuration Sync](https://kiro.dev/docs/powers/)
- [Kiro property-based tests and specs](https://kiro.dev/docs/specs/correctness/)
- [Kiro GA announcement (PBT, checkpoints, CLI)](https://kiro.dev/blog/general-availability/)
- [Kiro Web](https://kiro.dev/docs/web)
- [Kiro Crew features](https://kiro.dev/docs/crew/features/)
- [Kiro CLI V3 new features (headless, stream-json)](https://kiro.dev/docs/cli/v3/new-features/)
- [Kiro timeline: Crew, workflows, CLI V3](https://www.everydev.ai/developers/kiro)
- [Chrome Prompt API (hardware, languages, extensions)](https://developer.chrome.com/docs/ai/prompt-api?hl=en)
- [Fakespot shutdown](https://mjtsai.com/blog/2025/07/02/fakespot-shuts-down)
- [Which? review hijacking](https://www.which.co.uk/news/article/top-rated-amazon-headphones-boosted-by-fake-reviews-for-toys-mugs-and-umbrellas-av09V7i6LgGY)
- [FTC hijacked reviews case](https://yro.slashdot.org/story/23/04/11/0042251/ftc-orders-supplement-maker-to-pay-600k-in-first-case-involving-hijacked-amazon-reviews)
- [Post-Fakespot gap (TrueStar)](https://hn.jakechampion.name/reader/https://blog.truestar.pro/fakespot-shuts-down)
- [Amazon Reviews 2023 dataset](https://huggingface.co/datasets/McAuley-Lab/Amazon-Reviews-2023)
