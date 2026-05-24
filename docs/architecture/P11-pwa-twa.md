# P11 — PWA / TWA / Google Play

| Field | Value |
|-------|-------|
| **Code** | P11 |
| **Status** | Active |

---

## الهدف / Goal

**Installable app** experience: web manifest, service worker, Trusted Web Activity (Android), and Play Store asset links.

---

## المسؤوليات / Responsibilities

- `manifest.webmanifest` (name, icons, display mode)
- Service worker caching policy (`sw.js`)
- Digital Asset Links (`.well-known/assetlinks.json`)
- PWA meta tags in `index.html`
- Coordination with CSP (**P0** `vercel.json`, **P7**)

---

## الملفات التابعة / Owned paths

| Path | Purpose |
|------|---------|
| `artifacts/souq/public/manifest.webmanifest` | PWA manifest |
| `artifacts/souq/public/sw.js` | Service worker |
| `artifacts/souq/public/.well-known/assetlinks.json` | TWA verification |
| `artifacts/souq/index.html` | Meta / theme |
| Future | `play-distribution/` (workspace placeholder) |

---

## ما المسموح تعديله / Allowed changes

- Cache bust strategy for SW
- Icons, splash, manifest fields
- TWA package fingerprints (Play Console)

---

## ما الممنوع تعديله / Forbidden changes

- Breaking CSP without **P7** review
- Storing secrets in SW
- Vercel rewrites (**P0**) without Mohamed approval

---

## Boundaries

- Delivery layer only — no new business APIs

---

## Dependencies

| Depends on | Reason |
|------------|--------|
| **P0** | HTTPS |
| **P9** | Cache invalidation on deploy |
| **P2** | Auth in WebView |

---

## Owner scope

- **Primary:** Mobile / PWA squad

---

## Scalability notes

- Push notifications → **P15** + native bridge (future)

---

## Future roadmap

- Play Store listing pipeline
- iOS PWA limitations documented
- Optional offline shell for browse-only

---

## Testing requirements

- Lighthouse PWA audits
- Install flow on Android Chrome / TWA
- `assetlinks.json` validation against package name

---

## Security notes

- SW scope limited to same origin
- No auth tokens in SW cache

---

## Related legacy phase paths

None.

---

## i18n namespace

**Target:** `p11.pwa.*` for install prompts (minimal strings today).
