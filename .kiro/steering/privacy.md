---
inclusion: always
---

# Privacy

- Never persist review text server-side. Cache only SHA-256 keys and verdicts (with evidence quotes), 24 h TTL.
- Hash reviewer display names immediately (`reviewerHash`); never store or log raw names.
- Analysis runs on-device by default. Cloud is used only when Gemini Nano is unavailable or the user opts in; always show the active mode in the panel footer.
- Rate-limit IPs are stored only hashed with a daily salt.
- No new host permissions, and no `<all_urls>`, history or cookies permission, without a spec change. Allowed: `sidePanel`, `storage`, `offscreen`, `activeTab`, demo store domain, one chosen retailer.
- Do not send project code, secrets or review text to third-party endpoints beyond the documented LLM provider adapter.
- Never log review text.
