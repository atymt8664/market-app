/**
 * نفس نظام التفاعل البصري المستخدم في /admin/categories:
 * BTN_FIX يمنع طبقة hover-elevate الافتراضية من اعتراض النقرات؛ باقي الثوابت توفر hover/active واضحين.
 */
import { cn } from "@/lib/utils";

export const BTN_FIX = "no-default-hover-elevate";

export const INPUT_FIELD =
  "h-11 rounded-xl border border-primary/35 bg-zinc-900/95 text-foreground shadow-[0_0_12px_-10px_hsl(var(--primary)/0.1)] placeholder:text-zinc-500 transition-all duration-150 hover:border-primary/45 hover:bg-zinc-900 focus-visible:border-primary/55 focus-visible:ring-2 focus-visible:ring-primary/25";

export const CARD_SHELL =
  "rounded-2xl border border-primary/35 bg-zinc-950/70 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10";

export const DIALOG_SURFACE =
  "border border-primary/35 bg-zinc-950 text-foreground shadow-[0_0_28px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15 sm:rounded-2xl";

export const SURFACE_TABLE_WRAP =
  "relative isolate z-0 overflow-x-auto rounded-2xl border border-primary/35 bg-zinc-950/70 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.14)] ring-1 ring-primary/10";

export const STAT_TILE =
  "rounded-2xl border border-primary/30 bg-zinc-950/70 px-4 py-3 shadow-[0_0_18px_-14px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10 transition-colors duration-200 hover:border-primary/45 hover:bg-zinc-900/75 hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)]";

export const SUB_CARD =
  "rounded-2xl border border-primary/30 bg-zinc-950/60 p-3 shadow-[0_0_16px_-12px_hsl(var(--primary)/0.12)] ring-1 ring-primary/8 transition-all duration-200 hover:border-primary/45 hover:bg-zinc-900/65 hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.16)]";

export const PANEL_INSET =
  "rounded-2xl border border-primary/25 bg-zinc-950/55 px-4 py-12 text-center transition-colors";

export const SELECT_FIELD =
  "flex h-11 w-full cursor-pointer appearance-none rounded-xl border border-primary/35 bg-zinc-900/95 px-3 py-2 text-sm text-foreground shadow-[0_0_14px_-10px_hsl(var(--primary)/0.12)] outline-none transition-all duration-150 ease-out [color-scheme:dark] hover:border-primary/45 hover:bg-zinc-900 hover:shadow-[0_0_18px_-8px_hsl(var(--primary)/0.18)] focus-visible:border-primary/55 focus-visible:ring-2 focus-visible:ring-primary/25 [&>option]:bg-zinc-950 [&>option]:text-foreground";

/** Radix Select — trigger (Souq Arab EU dark + lime) */
export const ADMIN_SELECT_TRIGGER = cn(
  SELECT_FIELD,
  "items-center justify-between gap-2 data-[placeholder]:text-zinc-500 [&>span]:line-clamp-1",
);

/** Radix Select — dropdown panel */
export const ADMIN_SELECT_CONTENT =
  "z-[200] max-h-72 overflow-y-auto rounded-2xl border border-primary/40 bg-zinc-950 p-1.5 text-foreground shadow-[0_0_32px_-10px_hsl(var(--primary)/0.38)] ring-1 ring-primary/15 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";

/** Radix Select — option row (RTL) */
export const ADMIN_SELECT_ITEM =
  "relative flex w-full cursor-pointer select-none items-center rounded-xl py-2.5 pe-9 ps-3 text-right text-sm outline-none transition-colors duration-150 focus:bg-primary/15 focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-primary/12 data-[highlighted]:text-foreground data-[state=checked]:bg-primary/15 data-[state=checked]:font-semibold data-[state=checked]:text-primary";

export const MODAL_HEADER_RTL = "space-y-2 text-right sm:text-right";

export const MODAL_LABEL = "text-sm font-medium text-zinc-300";

export const MODAL_FIELD_GROUP = "space-y-2";

export const MODAL_BODY = "space-y-4";

export const MODAL_SCROLL =
  "max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pe-1 [scrollbar-color:hsl(var(--primary)/0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/35 [&::-webkit-scrollbar-track]:bg-transparent";

export const MODAL_SECTION_CARD = cn(
  SUB_CARD,
  "space-y-3 p-4",
);

export const MODAL_SECTION_TITLE =
  "flex items-center gap-2 text-sm font-semibold text-primary";

export const DIALOG_SURFACE_RTL = cn(
  DIALOG_SURFACE,
  "[&>button]:left-4 [&>button]:right-auto [&>button]:rounded-xl [&>button]:border [&>button]:border-primary/30 [&>button]:bg-zinc-900/90 [&>button]:opacity-100 [&>button]:transition-colors hover:[&>button]:border-primary/50 hover:[&>button]:bg-primary/10",
);

/** صف جدول رئيسي — hover موحّد */
export const ADMIN_TABLE_ROW =
  "border-b border-primary/10 bg-zinc-950/40 transition-colors duration-200 hover:bg-primary/[0.06] hover:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12)]";

/** كبسولات فلتر / تبويب نصية */
export function adminPillBtn(active: boolean) {
  return cn(
    BTN_FIX,
    "cursor-pointer rounded-2xl border px-3 py-2 text-sm font-medium transition-all duration-150 ease-out",
    "active:scale-[0.97]",
    active
      ? "border-primary/50 bg-primary/15 font-semibold text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/20"
      : "border-primary/20 bg-zinc-900/70 text-muted-foreground hover:border-primary/45 hover:bg-primary/[0.08] hover:text-foreground hover:shadow-[0_0_16px_-10px_hsl(var(--primary)/0.2)]",
  );
}

/** أزرار صف الجدول الصغيرة (دمج مع ألوان الحدود لكل إجراء) */
export const ADMIN_ROW_ACTION_BASE = cn(
  BTN_FIX,
  "inline-flex cursor-pointer items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 ease-out",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
  "enabled:hover:brightness-110 enabled:active:scale-[0.94]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

/** بطاقة إحصاء قابلة للنقر (لوحة التحكم / إحصائيات) */
export const ADMIN_STAT_CARD_BTN = cn(
  BTN_FIX,
  "rounded-2xl border border-primary/35 bg-zinc-950/70 p-4 text-right shadow-[0_0_20px_-14px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10 transition-all duration-150 ease-out",
  "hover:border-primary/50 hover:shadow-[0_0_28px_-10px_hsl(var(--primary)/0.28)] active:scale-[0.98]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
);

export const BTN_TOOLBAR_PRIMARY = cn(
  BTN_FIX,
  "rounded-xl cursor-pointer transition-all duration-150 ease-out",
  "hover:brightness-110 hover:shadow-[0_0_26px_-8px_hsl(var(--primary)/0.5)] active:scale-[0.97]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

export const BTN_TOOLBAR_OUTLINE = cn(
  BTN_FIX,
  "rounded-xl cursor-pointer border border-primary/40 bg-zinc-900/60 transition-all duration-150 ease-out",
  "hover:border-primary/65 hover:bg-primary/12 hover:text-primary hover:shadow-[0_0_22px_-10px_hsl(var(--primary)/0.28)] active:scale-[0.97]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

export const BTN_SEARCH = cn(
  BTN_FIX,
  "shrink-0 cursor-pointer gap-2 rounded-xl transition-all duration-150 ease-out",
  "hover:brightness-110 hover:shadow-[0_0_22px_-8px_hsl(var(--primary)/0.45)] active:scale-[0.97]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

export const BTN_TBL_OUTLINE = cn(
  BTN_FIX,
  "h-8 min-h-8 cursor-pointer rounded-xl border border-zinc-600/85 bg-zinc-950/55 text-sm text-zinc-100 transition-all duration-150 ease-out",
  "enabled:hover:border-primary/55 enabled:hover:bg-primary/12 enabled:hover:text-primary enabled:hover:shadow-[0_0_20px_-10px_hsl(var(--primary)/0.24)]",
  "enabled:active:scale-[0.94]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.38]",
);

export const BTN_TBL_TOGGLE = cn(
  BTN_FIX,
  "h-8 min-h-8 cursor-pointer rounded-xl border border-amber-500/45 bg-amber-500/[0.13] text-sm text-amber-100 transition-all duration-150 ease-out",
  "enabled:hover:border-amber-400/60 enabled:hover:bg-amber-500/22 enabled:hover:shadow-[0_0_18px_-8px_rgba(245,158,11,0.28)]",
  "enabled:active:scale-[0.94]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.38]",
);

export const BTN_TBL_DELETE = cn(
  BTN_FIX,
  "h-8 min-h-8 cursor-pointer rounded-xl border border-red-500/50 bg-red-950/40 text-sm text-red-100 transition-all duration-150 ease-out",
  "enabled:hover:border-red-400/65 enabled:hover:bg-red-900/50 enabled:hover:shadow-[0_0_18px_-8px_rgba(239,68,68,0.35)]",
  "enabled:active:scale-[0.94]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-[0.35]",
);

export const BTN_MODAL_GHOST = cn(
  BTN_FIX,
  "cursor-pointer rounded-xl border border-zinc-600/80 bg-zinc-900/80 transition-all duration-150 ease-out",
  "hover:border-primary/45 hover:bg-zinc-800 hover:text-foreground active:scale-[0.98]",
);

export const BTN_MODAL_PRIMARY = cn(
  BTN_FIX,
  "cursor-pointer rounded-xl transition-all duration-150 ease-out",
  "hover:brightness-110 hover:shadow-[0_0_22px_-8px_hsl(var(--primary)/0.45)] active:scale-[0.98]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);

export const BTN_MODAL_DANGER = cn(
  BTN_FIX,
  "cursor-pointer rounded-xl border border-red-500/45 bg-red-600 text-white transition-all duration-150 ease-out",
  "hover:bg-red-500 hover:shadow-[0_0_20px_-8px_rgba(239,68,68,0.45)] active:scale-[0.98]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
);
