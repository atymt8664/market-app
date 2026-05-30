/**
 * P17 ad-detail commerce — visual hierarchy tokens (Dark Premium + Lime).
 * Order: Buy Now → Add to Cart → WhatsApp → Message Seller
 */

/** 🥇 Primary commerce CTA — lime filled, strongest visual weight on ad detail */
export const P17_BUY_NOW_BTN =
  "flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-primary bg-primary/88 px-3 text-base font-extrabold tracking-tight text-primary-foreground shadow-[0_0_20px_-8px_hsl(var(--primary)/0.36)] ring-1 ring-primary/28 transition-[transform,box-shadow,background-color,border-color] hover:border-primary/95 hover:bg-primary/80 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45";

/** 🥈 Secondary commerce CTA — outline only, clearly weaker than Buy Now */
export const P17_ADD_TO_CART_BTN =
  "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary/52 bg-transparent px-3 text-sm font-medium text-primary/90 shadow-none transition-[transform,border-color,background-color] hover:border-primary/68 hover:bg-primary/[0.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/28";

/** 🥉 WhatsApp — external contact, distinct from commerce lime */
export const P17_WHATSAPP_BTN =
  "flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366]/60 bg-zinc-950/88 text-sm font-semibold text-[#25D366] shadow-[0_0_14px_-8px_rgba(37,211,102,0.38)] transition-[transform,box-shadow,border-color,background-color] hover:border-[#25D366]/80 hover:bg-[#25D366]/[0.09] hover:shadow-[0_0_18px_-6px_rgba(37,211,102,0.42)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40";

/** 4️⃣ Message seller — lowest prominence */
export const P17_MESSAGE_SELLER_BTN =
  "flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/32 bg-[#0A0A0A]/75 text-sm font-medium text-primary/80 shadow-none transition-[transform,border-color,background-color] hover:border-primary/42 hover:bg-zinc-950/85 hover:text-primary/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50";

/** Utility dismiss — black + lime outline (not a commerce CTA) */
export const P17_SHEET_OK_BTN =
  "inline-flex h-[3.25rem] w-full items-center justify-center rounded-2xl border border-primary/40 bg-[#0A0A0A] px-4 text-sm font-semibold text-primary shadow-none ring-1 ring-primary/10 transition-[transform,border-color,background-color] hover:border-primary/52 hover:bg-black active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

/** Dark Premium card shell — black surface, thin lime rim, no glow */
export const P17_SHEET_CARD =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A] ring-1 ring-primary/10";

/** Premium sheet backdrop */
export const P17_SHEET_OVERLAY = "bg-black/80 backdrop-blur-[1px]";

/** Sheet panel shell */
export const P17_SHEET_PANEL =
  "flex min-h-0 w-full flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 !bg-[#0A0A0A] p-0 shadow-[0_-10px_40px_-18px_rgba(0,0,0,0.85)] sm:mx-auto sm:max-w-lg";

/** Roadmap / icon chip inside sheet — matches app card chips */
export const P17_SHEET_CHIP =
  "flex items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A] ring-1 ring-primary/10";
