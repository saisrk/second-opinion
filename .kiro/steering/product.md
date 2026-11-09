# Product: Second Opinion (Fakespot, Resurrected)

Chrome extension plus small hosted service for Kiroween 2026 (Resurrection category). Fakespot shut down 1 Jul 2025. This product brings it back with evidence a shopper can read instead of a mystery grade. Submission target: 1 Dec 2026. Hard deadline: 4 Dec, 2:00 PM PT.

## Users
- Shopper (former Fakespot user): "Should I trust this rating?" Uses the badge and side panel.
- Judge: opens the hosted demo store (no install) or the installable extension.
- Shopping agent / developer: calls MCP tool `check_reviews`, shipped as a Kiro Power.
- Researcher: reads the CLI eval report on Amazon Reviews 2023.

## What it does (MVP)
1. Possession check: flags reviews about a different product than the listing, with the giveaway sentence quoted.
2. One ghost, many reviews: clusters near-duplicate or burst-posted reviews.
3. Exorcised rating: rating recomputed from surviving reviews, with a confidence band.
4. Evidence cards: quote, plain-English reason, signal that fired, confidence.
5. Verdict badge: count of possessed reviews, coloured by level.
6. Privacy mode: on-device (default when Gemini Nano is available) or cloud fallback, shown in the panel footer.
7. Demo store "Bazaar of the Damned": eight listings (4 hijacked, 2 clustered, 2 clean).

## Golden path
1. Shopper opens a product page; content script extracts listing and visible reviews.
2. Badge spins, then shows a count within 3 s for 50 reviews.
3. Badge click opens side panel: rating comparison, possessed reviews, clusters.
4. Clicking an evidence card scrolls to and outlines that review on the page.
5. "Load more reviews" triggers an incremental re-check of new reviews only.

## Verdict levels
- Clear: 0 possessed, no cluster of 5+, rating delta under 0.3. Neutral badge, no count.
- Caution: 1-4 possessed, or a cluster of 3+, or delta 0.3-0.7. Amber with count.
- Possessed: 5+ possessed, or 15%+ of reviews possessed, or delta over 0.7. Red with count.
- Fewer than 5 effective reviews: show "insufficient evidence", no number.

## Non-goals
- Multiple real retailers, mobile browsers, accounts, payments, affiliate links.
- Scraping pages the user has not opened, or storing review text on a server.
- Calling any product, seller or reviewer "fake" or "fraudulent".
- Anything outside the golden path before 25 Nov.

Source of truth: `docs/BUILD_PLAN.md`. If this file and the plan disagree, the plan wins.
