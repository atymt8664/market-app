# P12 — AI (Descriptions & Pricing)

| Field | Value |
|-------|-------|
| **Code** | P12 |
| **Status** | Active |

---

## الهدف / Goal

**Seller assistance** via AI: improve ad description and suggest price — safe, optional, rate-limited.

---

## المسؤوليات / Responsibilities

- AI API routes (`/api/ai/*`)
- Prompt construction and output sanitization (`ai-text.ts`)
- Create-ad UI: FAB, improve dialog
- Rate limiting (nginx zone `souq_api_ai` + app-level checks)

---

## الملفات التابعة / Owned paths

| Layer | Paths |
|-------|-------|
| API | `routes/ai.ts`, `lib/ai-text.ts` |
| Frontend | `components/create-ad-draggable-ai-fab.tsx`, `create-ad-improve-dialog.tsx` |
| i18n (target) | `p12.ai.*` |

---

## ما المسموح تعديله / Allowed changes

- Prompts, model selection (env-driven keys)
- UI for AI suggestions
- Abuse limits with **P7**

---

## ما الممنوع تعديله / Forbidden changes

- Storing PII in logs
- Auto-publishing AI content without user confirm
- Search index changes (**P14**)

---

## Boundaries

- Optional enhancement — form works without AI

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P4** | Create-ad context |
| **P1** | API keys per env |
| **P7** | Abuse prevention |

---

## Owner scope

- **Primary:** AI squad

---

## Scalability notes

- Queue long-running AI batch jobs → **P15**
- Cache repeated suggestions per category

---

## Future roadmap

- Image tagging for moderation assist (**P7**)
- Multilingual prompts aligned with i18n locale

---

## Testing requirements

- STAGING with test API key only
- Rate limit smoke (nginx selftest **P0/P7**)
- Fallback when AI unavailable

---

## Security notes

- API keys only in env — never committed
- Output length limits and content policy

---

## Related legacy phase paths

| Legacy | Note |
|--------|------|
| `souq_api_ai` nginx zone | `phase3-hardening` |

---

## i18n namespace

**Target:** `p12.ai.*`
