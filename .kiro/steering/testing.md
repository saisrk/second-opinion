---
inclusion: fileMatch
fileMatchPattern: "**/*.test.ts"
---

# Testing Rules

- Runner: Vitest. Property tests: fast-check, at least 200 runs, fixed seed in CI.
- Use the stub judge only; never call a real LLM in unit or property tests.
- Generators produce random listings, review sets, dates and judge answers.
- Keep the 12 properties from Plan section 10 (P1-P12) green. P3, P4 and P12 encode the honesty promise; never weaken them.
- Adapter tests use saved HTML snapshots in `apps/extension/fixtures/snapshots/`.
- Never edit `packages/eval/fixtures/golden/` to make a test pass. Fix the code.
- Do not run watch mode; use single-run commands.
