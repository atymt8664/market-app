/** Inline emoji/attach controls — 44px touch target; icons centered inside. */
export const CHAT_COMPOSER_INLINE_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary transition-[background-color,transform] hover:bg-primary/10 active:scale-[0.96] disabled:opacity-45";

/** Shared composer shell — compact; buttons are 44px, textarea stays slim. */
export const CHAT_COMPOSER_FIELD_SHELL =
  "flex min-h-[2.25rem] min-w-0 flex-1 items-end gap-0 overflow-hidden rounded-xl border border-primary/18 bg-[rgba(0,0,0,0.55)] px-0.5 py-0 shadow-[0_0_12px_-14px_hsl(var(--primary)/0.2)] ring-1 ring-primary/8";

export const CHAT_COMPOSER_TEXTAREA =
  "box-border min-h-[1.375rem] max-h-[6.5rem] min-w-0 w-full max-w-full flex-1 resize-none overflow-x-hidden overflow-y-auto border-0 bg-transparent py-1.5 text-[13.5px] leading-[1.4] text-white placeholder:text-zinc-300 placeholder:opacity-100 focus:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap";
