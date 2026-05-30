/**
 * P17-1 mock copy — draft strings only (not wired to t() / locales).
 * Canonical keys documented in docs/architecture/P17-1-i18n-draft.md
 */
export const P17_MOCK = {
  devBanner: "معاينة تجريبية — ليست طلبات حقيقية",
  devBannerSub: "P17-1 Mock · لا دفع · لا API",

  checkout: {
    title: "إتمام الطلب",
    summaryTitle: "مراجعة الطلب",
    stepAddress: "عنوان",
    stepShipping: "شحن",
    stepReview: "مراجعة",
    stepOf: (n: number) => `الخطوة ${n}/3`,
    deliveryAddress: "عنوان التسليم",
    addAddress: "إضافة عنوان جديد",
    edit: "تعديل",
    continue: "متابعة",
    continueToReview: "متابعة للمراجعة",
    shippingMethod: "طريقة الاستلام",
    quickSummary: "ملخص سريع",
    notPaymentNote: "ليس الدفع — تأكيد الطلب فقط (v1)",
    privacyNote: "عنوانك يُستخدم للتوصيل فقط ولا يُشارك مع أطراف أخرى.",
  },

  summary: {
    product: "المنتج",
    price: "السعر",
    shipping: "الشحن",
    total: "الإجمالي",
    deliveryMethod: "طريقة الاستلام",
    deliveryAddress: "عنوان التسليم",
    reassurance: "يمكنك مراجعة الطلب قبل التأكيد",
    whatNextTitle: "بعد التأكيد",
    whatNext1: "سيصل إشعار للبائع",
    whatNext2: "سيراجع البائع الطلب (عادةً خلال 24 ساعة)",
    whatNext3: "يمكنك متابعة الحالة من «طلباتي»",
    confirmCta: "تأكيد الطلب",
    editAddress: "تعديل العنوان",
    editShipping: "تعديل الشحن",
    pickupFree: "استلام شخصي — مجانًا",
  },

  confirmation: {
    title: "تم إنشاء طلبك",
    awaitingSeller: "بانتظار تأكيد البائع",
    viewOrder: "عرض الطلب",
    chatSeller: "التحدث مع البائع",
    whatNow: "ماذا يحدث الآن؟",
  },

  orders: {
    title: "طلباتي",
    empty: "لا توجد طلبات في المعاينة",
    viewDetails: "عرض التفاصيل",
    lastUpdate: "آخر تحديث",
    orderNumber: "رقم الطلب",
    chatSeller: "التحدث مع البائع",
    hasIssue: "يوجد مشكلة؟",
    cancelOrder: "إلغاء الطلب",
    whereAmI: "أين أنا؟",
    whatHappening: "ماذا يحدث الآن؟",
    whatToDo: "ماذا أفعل؟",
    amISafe: "هل أنا بأمان؟",
    safeAnswer: "نعم — يمكنك متابعة الطلب أو التواصل مع البائع",
    timelineTitle: "مسار الطلب",
  },

  issue: {
    title: "ما المشكلة؟",
    notReceived: "لم أستلم الطلب",
    differentProduct: "المنتج مختلف عن الوصف",
    damaged: "المنتج تالف",
    shippingProblem: "مشكلة في الشحن",
    other: "مشكلة أخرى",
    continue: "متابعة",
    mockNote: "معاينة فقط — لن يُرسل بلاغ حقيقي",
  },

  seller: {
    title: "طلبات البائع",
    incoming: "طلبات واردة",
    needsConfirm: "يحتاج تأكيدك",
    confirmOrder: "تأكيد الطلب",
    rejectOrder: "رفض الطلب",
    preparing: "قيد التجهيز",
    markPreparing: "بدء التجهيز",
    trackingNumber: "رقم التتبع (معاينة)",
    carrier: "شركة الشحن",
    markShipped: "تم الشحن",
    shipped: "تم الشحن",
    buyer: "المشتري",
    threeActionsHint: "ثلاث خطوات فقط: تأكيد → تجهيز → شحن",
    mockNote: "لوحة بائع مبسطة — معاينة P17-1",
  },

  status: {
    pending_seller: "بانتظار تأكيد البائع",
    confirmed: "تم تأكيد الطلب",
    preparing: "قيد التجهيز",
    shipped: "تم الشحن",
    in_transit: "قيد الشحن",
    out_for_delivery: "خرج للتسليم",
    delivered: "تم التسليم",
    completed: "اكتمل الطلب",
    cancelled: "ملغى",
  },

  timeline: {
    created: "تم إنشاء الطلب",
    awaiting_seller: "بانتظار تأكيد البائع",
    seller_confirmed: "تم تأكيد الطلب",
    preparing: "قيد التجهيز",
    shipped: "تم الشحن",
    in_transit: "قيد الشحن",
    out_for_delivery: "خرج للتسليم",
    delivered: "تم التسليم",
    completed: "اكتمل الطلب",
  },
} as const;

export const TIMELINE_STEP_IDS = [
  "created",
  "awaiting_seller",
  "seller_confirmed",
  "preparing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "completed",
] as const;

export function formatEuro(amount: number): string {
  return `€${amount.toFixed(2)}`;
}
