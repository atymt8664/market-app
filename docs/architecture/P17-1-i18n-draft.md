# P17-1 — i18n Draft Keys

**Status:** Draft only — **not merged** into `artifacts/souq/src/i18n/locales/*.json` in P17-1.

P17-1 mock UI uses inline copy via `features/p17-commerce-mock/mock-strings.ts` (`P17_MOCK`). This document is the canonical key map for future locale integration (P17-4+).

**Namespace target:** `p17.commerce.*`

---

## Checkout

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.checkout.title` | إتمام الطلب | Complete order | Bestellung abschließen |
| `p17.commerce.checkout.summary_title` | مراجعة الطلب | Review order | Bestellung prüfen |
| `p17.commerce.checkout.step_address` | عنوان | Address | Adresse |
| `p17.commerce.checkout.step_shipping` | شحن | Shipping | Versand |
| `p17.commerce.checkout.step_review` | مراجعة | Review | Prüfung |
| `p17.commerce.checkout.delivery_address` | عنوان التسليم | Delivery address | Lieferadresse |
| `p17.commerce.checkout.continue` | متابعة | Continue | Weiter |
| `p17.commerce.checkout.continue_to_review` | متابعة للمراجعة | Continue to review | Zur Prüfung |
| `p17.commerce.checkout.not_payment_note` | ليس الدفع — تأكيد الطلب فقط (v1) | Not payment — order confirmation only (v1) | Keine Zahlung — nur Bestellbestätigung (v1) |

## Order Summary Preview

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.summary.product` | المنتج | Product | Produkt |
| `p17.commerce.summary.price` | السعر | Price | Preis |
| `p17.commerce.summary.shipping` | الشحن | Shipping | Versand |
| `p17.commerce.summary.total` | الإجمالي | Total | Gesamt |
| `p17.commerce.summary.delivery_method` | طريقة الاستلام | Delivery method | Lieferart |
| `p17.commerce.summary.delivery_address` | عنوان التسليم | Delivery address | Lieferadresse |
| `p17.commerce.summary.reassurance` | يمكنك مراجعة الطلب قبل التأكيد | You can review before confirming | Sie können vor der Bestätigung prüfen |
| `p17.commerce.summary.what_next_title` | بعد التأكيد | After confirmation | Nach der Bestätigung |
| `p17.commerce.summary.confirm_cta` | تأكيد الطلب | Confirm order | Bestellung bestätigen |
| `p17.commerce.summary.edit_address` | تعديل العنوان | Edit address | Adresse bearbeiten |
| `p17.commerce.summary.edit_shipping` | تعديل الشحن | Edit shipping | Versand bearbeiten |
| `p17.commerce.summary.pickup_free` | استلام شخصي — مجانًا | Pickup — free | Abholung — kostenlos |

## Confirmation

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.confirmation.title` | تم إنشاء طلبك | Your order was created | Ihre Bestellung wurde erstellt |
| `p17.commerce.confirmation.awaiting_seller` | بانتظار تأكيد البائع | Awaiting seller confirmation | Warten auf Verkäuferbestätigung |
| `p17.commerce.confirmation.view_order` | عرض الطلب | View order | Bestellung ansehen |
| `p17.commerce.confirmation.chat_seller` | التحدث مع البائع | Message seller | Verkäufer kontaktieren |

## Orders (buyer)

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.orders.title` | طلباتي | My orders | Meine Bestellungen |
| `p17.commerce.orders.view_details` | عرض التفاصيل | View details | Details ansehen |
| `p17.commerce.orders.has_issue` | يوجد مشكلة؟ | Have an issue? | Problem? |
| `p17.commerce.orders.cancel_order` | إلغاء الطلب | Cancel order | Bestellung stornieren |
| `p17.commerce.orders.timeline_title` | مسار الطلب | Order timeline | Bestellverlauf |

## Issue report

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.issue.title` | ما المشكلة؟ | What is the issue? | Was ist das Problem? |
| `p17.commerce.issue.not_received` | لم أستلم الطلب | I did not receive the order | Bestellung nicht erhalten |
| `p17.commerce.issue.different_product` | المنتج مختلف عن الوصف | Product differs from description | Produkt weicht ab |
| `p17.commerce.issue.damaged` | المنتج تالف | Product is damaged | Produkt beschädigt |
| `p17.commerce.issue.shipping_problem` | مشكلة في الشحن | Shipping problem | Versandproblem |
| `p17.commerce.issue.other` | مشكلة أخرى | Other issue | Anderes Problem |
| `p17.commerce.issue.continue` | متابعة | Continue | Weiter |

## Seller

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.seller.title` | طلبات البائع | Seller orders | Verkäuferbestellungen |
| `p17.commerce.seller.confirm_order` | تأكيد الطلب | Confirm order | Bestellung bestätigen |
| `p17.commerce.seller.reject_order` | رفض الطلب | Reject order | Bestellung ablehnen |
| `p17.commerce.seller.mark_preparing` | بدء التجهيز | Start preparing | Vorbereitung starten |
| `p17.commerce.seller.mark_shipped` | تم الشحن | Mark shipped | Als versendet markieren |

## Status labels

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.status.pending_seller` | بانتظار تأكيد البائع | Awaiting seller | Warten auf Verkäufer |
| `p17.commerce.status.confirmed` | تم تأكيد الطلب | Confirmed | Bestätigt |
| `p17.commerce.status.preparing` | قيد التجهيز | Preparing | In Vorbereitung |
| `p17.commerce.status.shipped` | تم الشحن | Shipped | Versendet |
| `p17.commerce.status.in_transit` | قيد الشحن | In transit | Unterwegs |
| `p17.commerce.status.out_for_delivery` | خرج للتسليم | Out for delivery | Zur Zustellung unterwegs |
| `p17.commerce.status.delivered` | تم التسليم | Delivered | Zugestellt |
| `p17.commerce.status.completed` | اكتمل الطلب | Completed | Abgeschlossen |
| `p17.commerce.status.cancelled` | ملغى | Cancelled | Storniert |

## Timeline steps

| Key | ar |
|-----|-----|
| `p17.commerce.timeline.created` | تم إنشاء الطلب |
| `p17.commerce.timeline.awaiting_seller` | بانتظار تأكيد البائع |
| `p17.commerce.timeline.seller_confirmed` | تم تأكيد الطلب |
| `p17.commerce.timeline.preparing` | قيد التجهيز |
| `p17.commerce.timeline.shipped` | تم الشحن |
| `p17.commerce.timeline.in_transit` | قيد الشحن |
| `p17.commerce.timeline.out_for_delivery` | خرج للتسليم |
| `p17.commerce.timeline.delivered` | تم التسليم |
| `p17.commerce.timeline.completed` | اكتمل الطلب |

## Dev mock banner

| Key | ar | en | de |
|-----|----|----|-----|
| `p17.commerce.dev.banner` | معاينة تجريبية — ليست طلبات حقيقية | Preview only — not real orders | Nur Vorschau — keine echten Bestellungen |

---

*P17-1 i18n draft — documentation only. Wire to locales in P17-4+ after UX sign-off.*
