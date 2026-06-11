# Annex — Notification Contract

| Field | Value |
|-------|-------|
| **Type** | Architecture Annex (not a builder P-domain) |
| **Status** | Adopted — organizational reference |
| **Horizon** | 10–50 years |

**Charter:** [CONSTITUTION.md §1 A11](../CONSTITUTION.md#a11--p-domain-admission) · [P17-4-navigation-contract.md §6](../P17-4-navigation-contract.md)

---

## Purpose

Single contract for **in-app notifications**, **push delivery**, and **deep links** so work does not split across imaginary P18–P25 domains.

---

## Ownership (by layer)

| Layer | Builder P | Responsibility |
|-------|-----------|----------------|
| In-app list UI, prefs, badge shell | **P6** | `/notifications`, preference gates |
| Event creation (chat, ad, social) | **P5**, **P4**, … | Product P emits notification rows |
| Order notification types + copy | **P17** (Sub-Phase **P17-9**) | `entityType=order`, order deep links |
| Fan-out, batch insert, retries | **P15** | Queue / outbox — not sync API at scale |
| Web Push, TWA, platform bridge | **P11** | Channel delivery |
| Deep-link resolver contract | **This annex** | Implemented in **P6**; producers follow § below |

---

## Contract (summary)

1. Every notification has stable `entityType` + `entityId` (or `orderNumber` for orders).
2. Order notifications **must** deep-link to buyer or seller order detail — never dead routes (see P17-4-NAV §6).
3. Producers **do not** implement fan-out loops in HTTP handlers at high volume — enqueue via **P15**.
4. New notification types: add under **owning product P** + update this annex if cross-P.

---

## Forbidden

- Opening a builder domain “P19 Notifications.”
- Changing resolver in a P17 PR without **P6** owner review.
- PROD push keys or secrets in this file.

---

## Platform broadcasts (P17-9-17)

- Admin compose: `/admin/broadcasts` (founder-only).
- Types: `announcement.platform.*` — gated by user pref `notifyAnnouncements`.
- Fan-out: `broadcast.fanout` pg-boss job → `createNotification()` per user.
- Dedup: `broadcast:{broadcastId}:{userId}`.
- Safety: `BROADCAST_ENABLED=1`; production requires `BROADCAST_PRODUCTION_ALLOWED=1`; all-users prod requires `BROADCAST_ALL_USERS_PRODUCTION=1`.

---

## Related Sub-Phases

| Sub-Phase | Owner P |
|-----------|---------|
| P17-9 | P17 — order notification integration |
| P17-9-17 | P17 — platform broadcast fan-out |
| P11 push env | P11 — delivery channel |
