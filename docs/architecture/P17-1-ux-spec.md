# P17-1 — UX Spec & Wireframes (Mock Only)

| Field | Value |
|-------|-------|
| **Domain** | P17 — Commerce, Orders & Fulfillment |
| **Phase** | P17-1 (+ P17-1A Emotion Map) |
| **Status** | UX Architecture — **no API, no DB, no payment** |
| **Stack** | Local mock / wireframes only |

---

## Scope

- Buyer & seller emotion maps (P17-1A)
- Checkout mock wireframes including **Order Summary Preview**
- Screen inventory for `/dev/*` mock routes (future P17-1 implementation)
- i18n key targets: `p17.commerce.*`

**Out of scope:** P17-2+, migrations, API, payment UI, Production Buy Now CTA.

---

## P17-1A — Buyer Emotion Map (summary)

Each stage answers: *Where am I? · What’s happening? · What do I do? · Am I safe? · What confuses me? · How do we reassure?*

| Stage | Reassurance anchors |
|-------|---------------------|
| Ad detail | Seller presence, shipping clarity, message seller |
| Buy Now tap | Progress bar, “review before confirm” |
| Checkout address | Saved addresses, privacy note |
| Checkout shipping | Prices visible, pickup vs ship |
| **Order Summary Preview** | Full breakdown, delivery snapshot, “what happens next” |
| Order created | Order number, ETA, timeline, chat, “issue?” |
| Awaiting seller | Countdown, cancel, push |
| Preparing / shipped | Timeline + tracking link |
| Delivered | Confirm receipt, issue window |
| Completed | Order history |

Full seller map: confirm → prepare → ship → complete; SLA countdown; 3 actions max.

---

## Order Summary Preview

### Purpose

Before the user confirms the order, they must see a **final review layer** (Amazon / eBay style) — not a payment step. This prevents the “mystery step” feeling and answers:

- ماذا سأطلب؟
- كم التكلفة؟
- أين سيصل؟
- ماذا سيحدث بعد التأكيد؟

### Rules

| Rule | Detail |
|------|--------|
| Not payment | No card fields, no PayPal, no “Pay now” copy |
| Primary CTA | `تأكيد الطلب` (v1 manual flow) — not “ادفع الآن” |
| Editable | Each block links back to checkout step (address / shipping) |
| Immutable snapshot | Product title, price, image from ad at preview time |
| After confirm | Transition to order confirmation screen — not payment success |

### Preview content blocks

1. **Product** — image thumbnail, title, condition/specs one line  
2. **Price** — item price (currency formatted)  
3. **Shipping** — selected method + cost (or “استلام شخصي — مجانًا”)  
4. **Total** — bold, visually dominant  
5. **Delivery method** — carrier name or “استلام من البائع”  
6. **Delivery address** — city + country minimum; full address on expand (mock)  
7. **What happens next** — short bullet: seller confirms → prepare → ship → delivered  
8. **Reassurance line** — `✓ يمكنك مراجعة الطلب قبل التأكيد`

### Example (mock data)

```
المنتج:     iPhone 15 Pro
السعر:      €750.00
الشحن:      €5.00
─────────────────
الإجمالي:   €755.00

طريقة الاستلام:  DHL Paket
عنوان التسليم:   Leipzig, Germany

✓ يمكنك مراجعة الطلب قبل التأكيد

بعد التأكيد:
• سيصل إشعار للبائع
• سيراجع البائع الطلب (عادةً خلال 24 ساعة)
• يمكنك متابعة الحالة من «طلباتي»

[ تعديل العنوان ]  [ تعديل الشحن ]

┌─────────────────────────────┐
│      تأكيد الطلب             │
└─────────────────────────────┘
```

### Emotion map — Order Summary Preview (Buyer)

| Question | Answer |
|----------|--------|
| **أين أنا؟** | المراجعة النهائية قبل الالتزام |
| **ماذا يحدث الآن؟** | أتحقق من كل التفاصيل |
| **ماذا أفعل؟** | أؤكد أو أعدّل عنوان/شحن |
| **هل أنا بأمان؟** | نعم — أرى المجموع الكامل، لا خصم hidden |
| **ما الذي يربكني؟** | هل سأُدفع الآن؟ (v1: لا) |
| **كيف نطمئن؟** | Breakdown واضح + “بعد التأكيد” + edit links + no payment fields |

### i18n keys (draft)

| Key | ar (default) |
|-----|----------------|
| `p17.commerce.summary.title` | مراجعة الطلب |
| `p17.commerce.summary.product` | المنتج |
| `p17.commerce.summary.price` | السعر |
| `p17.commerce.summary.shipping` | الشحن |
| `p17.commerce.summary.total` | الإجمالي |
| `p17.commerce.summary.delivery_method` | طريقة الاستلام |
| `p17.commerce.summary.delivery_address` | عنوان التسليم |
| `p17.commerce.summary.reassurance` | يمكنك مراجعة الطلب قبل التأكيد |
| `p17.commerce.summary.what_next_title` | بعد التأكيد |
| `p17.commerce.summary.confirm_cta` | تأكيد الطلب |
| `p17.commerce.summary.edit_address` | تعديل العنوان |
| `p17.commerce.summary.edit_shipping` | تعديل الشحن |

---

## checkout-mock Wireframe

**Route (dev only):** `/dev/checkout-mock/:adId`  
**State:** localStorage / React state — no API.

### Flow

```
Step 1: Address
    ↓
Step 2: Shipping method
    ↓
Step 3: Order Summary Preview   ← mandatory review layer
    ↓
[ تأكيد الطلب ]
    ↓
Order Confirmation (mock /orders-mock/:id)
```

### Step 1 — Address

```
═══════════════════════════════════════════════════════
 [◀]  إتمام الطلب                         الخطوة 1/3
═══════════════════════════════════════════════════════
 ●──────○──────○
 عنوان    شحن    مراجعة

 ── عنوان التسليم ──
 (•) المنزل — Leipzig, Germany          [تعديل]
 (+) إضافة عنوان جديد

 ┌─────────────────────────────────────┐
 │           متابعة                     │
 └─────────────────────────────────────┘
```

### Step 2 — Shipping

```
═══════════════════════════════════════════════════════
 [◀]  إتمام الطلب                         الخطوة 2/3
═══════════════════════════════════════════════════════
 ✓──────●──────○
 عنوان    شحن    مراجعة

 ── طريقة الاستلام ──
 (•) DHL Paket — €5.00
 ( ) الاستلام الشخصي — مجانًا

 ── ملخص سريع ──
 iPhone 15 Pro ................ €750.00

 ┌─────────────────────────────────────┐
 │     متابعة للمراجعة                  │
 └─────────────────────────────────────┘
```

### Step 3 — Order Summary Preview (required)

```
═══════════════════════════════════════════════════════
 [◀]  مراجعة الطلب                        الخطوة 3/3
═══════════════════════════════════════════════════════
 ✓──────✓──────●
 عنوان    شحن    مراجعة

 ┌─ product card ─────────────────────────────────────┐
 │ [img]  iPhone 15 Pro                               │
 │        €750.00                                     │
 └────────────────────────────────────────────────────┘

 ── التفاصيل ──
 السعر ............................ €750.00
 الشحن (DHL Paket) .................. €5.00
 ─────────────────────────────────────────
 الإجمالي .......................... €755.00

 طريقة الاستلام .................... DHL Paket
 عنوان التسليم ..................... Leipzig, Germany

 ✓ يمكنك مراجعة الطلب قبل التأكيد

 ── بعد التأكيد ──
 • سيصل إشعار للبائع
 • سيراجع البائع الطلب (عادةً خلال 24 ساعة)
 • تابع الحالة من «طلباتي» والـ Timeline

 [ تعديل العنوان ]    [ تعديل الشحن ]

 ┌─────────────────────────────────────┐
 │         تأكيد الطلب                  │  ← NOT payment
 └─────────────────────────────────────┘

 ليس الدفع — تأكيد الطلب فقط (v1)
```

### Post-confirm — Order Confirmation (mock)

```
═══════════════════════════════════════════════════════
 ✓  تم إنشاء طلبك

 SOUQ-2026-001042
 iPhone 15 Pro — €755.00

 [ عرض تفاصيل الطلب ]

 Timeline (first step filled) …
 [ 💬 التحدث مع البائع ]  [ ⚠ يوجد مشكلة؟ ]
```

---

## checkout-mock implementation notes (P17-1 code)

When implementing `artifacts/souq/src/pages/checkout-mock.tsx`:

- Wizard steps: `address` | `shipping` | `summary` | `done`
- Step `summary` is **required** — never skip straight from shipping to confirm
- CTA on summary: `p17.commerce.summary.confirm_cta` only
- No payment components, no Stripe/PayPal placeholders
- Register under `/dev/checkout-mock` only until P17-5 + approval

---

## Closure checklist (P17-1)

- [ ] Order Summary Preview documented (this file)
- [ ] checkout-mock wireframe includes Step 3 summary
- [ ] Emotion map covers summary step
- [ ] i18n draft keys listed
- [ ] Mohamed sign-off on wireframes
- [ ] Mock UI implements 3-step wizard with summary (local state)

---

*P17-1 UX Spec — mock/wireframe only — no backend.*
