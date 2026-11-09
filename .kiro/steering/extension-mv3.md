---
inclusion: fileMatch
fileMatchPattern: "apps/extension/**"
---

# Extension (Manifest V3) Rules

- The service worker is ephemeral: keep no state in memory; use `chrome.storage.local`. Register listeners at top level.
- Service worker only routes messages, sets badge text/colour, reads cache, and makes cloud fallback calls.
- Heavy work (Transformers.js embeddings, Prompt API judge) runs in the offscreen document. Create it on demand, keep it alive only while analysis runs, and close it after.
- Check Prompt API availability before use; handle `downloadable`/`downloading` with the download monitor and offer cloud fallback. Never assume Gemini Nano exists.
- Content scripts are plain TS, one adapter per page layout, and use a MutationObserver for "load more". Re-check only new reviews.
- Permissions stay minimal (see privacy.md). Do not edit `wxt.config.ts` permissions without a spec change.
- The panel must handle all states: not a product page, model downloading, analysing, clear, possessed, insufficient evidence, error with retry. Never show a silent blank panel.
- Keep keyboard and screen-reader support; high contrast beats theme.
