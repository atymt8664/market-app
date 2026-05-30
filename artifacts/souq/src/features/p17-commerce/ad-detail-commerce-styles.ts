/**
 * P17 ad-detail commerce — visual hierarchy tokens (Dark Premium + Lime).
 * Order: Buy Now → Add to Cart → WhatsApp → Message Seller
 */

/** 🥇 Primary commerce CTA — lime filled */
export const P17_BUY_NOW_BTN =
  "flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-primary bg-primary px-3 text-[15px] font-bold text-primary-foreground shadow-[0_0_28px_-4px_hsl(var(--primary)/0.52)] ring-1 ring-primary/35 transition-[transform,box-shadow,background-color,border-color] hover:border-primary hover:bg-primary/92 hover:shadow-[0_0_32px_-2px_hsl(var(--primary)/0.58)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

/** 🥈 Secondary commerce CTA — lime border only */
export const P17_ADD_TO_CART_BTN =
  "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary/65 bg-transparent px-3 text-sm font-semibold text-primary shadow-none transition-[transform,border-color,background-color] hover:border-primary/85 hover:bg-primary/[0.06] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35";

/** 🥉 WhatsApp — external contact, distinct from commerce lime */
export const P17_WHATSAPP_BTN =
  "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366]/60 bg-zinc-950/88 text-sm font-semibold text-[#25D366] shadow-[0_0_14px_-8px_rgba(37,211,102,0.38)] transition-[transform,box-shadow,border-color,background-color] hover:border-[#25D366]/80 hover:bg-[#25D366]/[0.09] hover:shadow-[0_0_18px_-6px_rgba(37,211,102,0.42)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40";

/** 4️⃣ Message seller — lowest prominence */
export const P17_MESSAGE_SELLER_BTN =
  "flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/32 bg-[#0A0A0A]/75 text-sm font-medium text-primary/80 shadow-none transition-[transform,border-color,background-color] hover:border-primary/42 hover:bg-zinc-950/85 hover:text-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50";

/** Sheet primary dismiss — lime filled (main action inside sheet) */
export const P17_SHEET_OK_BTN =
  "inline-flex h-[3.25rem] w-full items-center justify-center rounded-2xl border-2 border-primary bg-primary px-4 text-[15px] font-bold text-primary-foreground shadow-[0_0_26px_-4px_hsl(var(--primary)/0.5)] transition-[transform,box-shadow,background-color] hover:bg-primary/92 hover:shadow-[0_0_30px_-2px_hsl(var(--primary)/0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

/** Dark Premium card shell */
export const P17_SHEET_CARD =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A] shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12";

/** Premium sheet backdrop */
export const P17_SHEET_OVERLAY = "bg-black/72 backdrop-blur-[2px]";

/** Sheet panel shell */
export const P17_SHEET_PANEL =
  "flex min-h-0 w-full flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t-2 border-primary/45 !bg-[#0A0A0A]/98 p-0 shadow-[0_-14px_48px_-16px_rgba(0,0,0,0.62),0_0_28px_-14px_hsl(var(--primary)/0.22)] ring-1 ring-primary/25 backdrop-blur-md sm:mx-auto sm:max-w-lg";
