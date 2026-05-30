/**
 * أنماط موحدة لصفحات الحساب — نفس هوية كروت البروفايل / المفضلة / الشات (dark + lime).
 * استخدم القيم كسلاسل Tailwind جاهزة مع `cn()`.
 */

export const AUTH_PAGE_BG =
  "flex min-h-[100dvh] w-full flex-col bg-[#0A0A0A]";

export const AUTH_HEADER =
  "sticky top-0 z-40 flex items-center gap-3 border-b border-primary/20 bg-[#0A0A0A]/95 px-4 py-3 backdrop-blur shadow-[0_1px_14px_-6px_rgba(0,0,0,0.35)] md:gap-4 md:py-3.5";

export const AUTH_HEADER_TITLE = "text-lg font-bold text-foreground";

/** زر الرجوع — نفس روح أزرار الرأس في البروفايل */
export const AUTH_BACK_BUTTON =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-black/55 text-primary shadow-[0_0_10px_-4px_hsl(var(--primary)/0.2)] transition-colors hover:border-primary/75 hover:bg-black/90 active:scale-[0.98]";

/** كرت النموذج الرئيسي */
export const AUTH_CARD =
  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 p-5 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-6";

/** حقول الإدخال الداكنة */
export const AUTH_INPUT =
  "h-11 border border-primary/30 bg-[#0A0A0A]/90 text-foreground shadow-none placeholder:text-zinc-500 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 focus-visible:ring-offset-[#0A0A0A] md:text-sm";

/** لوحات القوائم المنبثقة (دولة / مدينة) */
export const AUTH_POPOVER_PANEL =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/95 p-1.5 shadow-[0_0_28px_-10px_hsl(var(--primary)/0.28)] ring-1 ring-primary/15";

/** صف خيار في قائمة (دولة / مدينة / لغة) */
export const AUTH_SELECT_ROW =
  "flex w-full items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-right text-sm text-foreground transition-colors hover:border-primary/25 hover:bg-black/85 active:bg-black/30";

/** تنبيه سياقي صغير داخل كرت (ضيف / رسائل) */
export const AUTH_CONTEXT_ALERT =
  "rounded-xl border border-primary/25 bg-[#0A0A0A]/85 p-3 text-right shadow-[0_0_14px_-10px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10";

/** زر أساسي primary */
export const AUTH_PRIMARY_BTN =
  "h-12 w-full rounded-full bg-primary text-base font-semibold text-primary-foreground shadow-[0_0_18px_-8px_hsl(var(--primary)/0.45)] transition-[transform,box-shadow] hover:shadow-[0_0_22px_-8px_hsl(var(--primary)/0.55)] active:scale-[0.99]";

/** زر ثانوي outline */
export const AUTH_OUTLINE_BTN =
  "h-12 w-full rounded-full border border-primary/40 bg-[#0A0A0A]/90 text-base font-semibold text-primary shadow-[0_0_14px_-10px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-colors hover:border-primary/55 hover:bg-black/95";

/**
 * زر إجراء بارز بدون تعبئة lime كاملة — نفس عائلة ضيف التسجيل / CTAs داكنة.
 * الأهمُّ بين زرّين متشابهين (مثلاً تسجيل الدخول أمام إنشاء حساب).
 */
export const AUTH_ACCENT_OUTLINE_BTN =
  "h-12 w-full rounded-full border border-primary/48 bg-[#0A0A0A]/95 text-base font-semibold text-primary shadow-[0_0_20px_-10px_hsl(var(--primary)/0.38)] ring-1 ring-primary/18 transition-[transform,box-shadow] hover:border-primary/62 hover:bg-black/30 hover:shadow-[0_0_26px_-10px_hsl(var(--primary)/0.48)] active:scale-[0.99]";

/** ثانوي بنفس العائلة — حدود ولون أهدأ قليلًا */
export const AUTH_ACCENT_GHOST_BTN =
  "h-12 w-full rounded-full border border-primary/26 bg-[#0A0A0A]/88 text-base font-semibold text-foreground/95 shadow-[0_0_14px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06] transition-colors hover:border-primary/38 hover:bg-black/88 hover:text-foreground active:scale-[0.99]";

/** كرت ترحيب صغير أعلى صفحات الحساب (عنوان + وصف) */
export const AUTH_HERO_CARD =
  "rounded-2xl border border-primary/28 bg-[#0A0A0A]/65 px-4 py-4 text-center shadow-[0_0_20px_-14px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

/** صف مدينة ككرت صغير داخل قائمة التسجيل */
export const AUTH_CITY_CARD_ROW =
  "flex w-full items-center rounded-xl border border-primary/28 bg-[#0A0A0A]/92 px-3 py-2.5 text-right text-sm text-foreground shadow-[0_0_14px_-10px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 transition-[border-color,box-shadow,background-color] hover:border-primary/42 hover:shadow-[0_0_18px_-10px_hsl(var(--primary)/0.26)] active:scale-[0.99]";

