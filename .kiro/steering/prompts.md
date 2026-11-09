---
inclusion: fileMatch
fileMatchPattern: "packages/core/prompts/**"
---

# Prompt Rules

- Prompts are markdown files in `packages/core/prompts/` with a version header. Bump the version on any wording change; it is part of every cache key and report.
- Output is constrained by a JSON schema (`responseConstraint`): `aboutListing` enum (yes/no/unclear), `describes` string up to 60 chars, `evidenceQuote` string up to 300 chars.
- The prompt must say: quote one sentence exactly as written. The quote must be a verbatim substring of the review, or the result is discarded.
- The judge decides only whether the review is about the listed product. Never ask it to judge honesty.
- Same prompt and schema for on-device and cloud judges.
- Use `topK: 1` on-device for determinism.
- Follow evidence-not-accusations.md for all wording.
