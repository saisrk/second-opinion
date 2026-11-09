---
inclusion: always
---

# Evidence, Not Accusations

- Never use these words in UI copy, explanations, prompts output, docs or tests fixtures shown to users: fake, fraud, fraudulent, scam, liar.
- Never call a product, seller or reviewer dishonest. Describe what the text does ("Describes a plush toy, not headphones").
- Every flag must carry a verbatim `evidenceQuote` and a plain-English reason, plus the signal and confidence.
- A quote that is not a substring of the review is discarded; the review becomes `unclear`, never flagged.
- Judge prompts must never ask whether a review is honest, only whether it is about the listed product.
- Prefer "possessed", "mismatch", "similar wording", "insufficient evidence".
