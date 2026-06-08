# P17-8 Package 2 — Future Carrier Readiness (Architecture)

| Field | Value |
|-------|-------|
| **Domain** | P17 — Commerce, Orders & Fulfillment |
| **Sub-phase** | **P17-8 Package 2** |
| **Status** | Architecture + frontend readiness — **no carrier APIs** |
| **Runtime** | `order-tracking-carrier-readiness.ts` · static URL templates only |

---

## 1. Official carrier catalog (v1)

Aligned with create-ad shipping options and seller mark-shipped labels:

| Code | Display label |
|------|---------------|
| `dhl_paket` | DHL Paket |
| `dhl_packchen` | DHL Päckchen |
| `hermes_packchen` | Hermes Päckchen |
| `hermes_s_paket` | Hermes S-Paket |
| `dpd_paket` | DPD Paket |
| `ups_paket` | UPS Paket |
| `gls_paket` | GLS Paket |
| `other` | أخرى |
| `pickup_only` | بدون شحن — استلام فقط |

---

## 2. v1 vs v2 boundary

| Capability | P17-8 Package 2 (now) | P17-17 (future) |
|------------|----------------------|-----------------|
| Label normalization | ✅ `resolveCarrierProfile` | — |
| Static consumer tracking URL | ✅ `buildCarrierTrackingUrl` | May replace with API deep links |
| Webhooks / live events | ❌ `webhookReady: false` | Carrier webhook ingestion |
| ETA from carrier | ❌ — only optional `shipment.etaAt` from API when present | Auto ETA refresh |
| Logo assets | Deferred | Optional per carrier |

**Rule:** No HTTP calls to carrier APIs in Package 2. External links open carrier **consumer** pages only.

---

## 3. Integration points (frozen for P17-17)

- Input: `order.shipment.carrierLabel` + `trackingNumber`
- Output: `CarrierProfile` + optional external URL
- UI: `data-carrier-code` · `data-carrier-ready="static-url"` on tracking details link

---

*Package 2 — carrier readiness architecture. Webhooks deferred to P17-17.*
