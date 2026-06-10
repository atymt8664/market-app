import { cn } from "@/lib/utils";

/**
 * P5-2D bubble shells — WhatsApp-like hierarchy (distinct mine vs peer) in Souq Dark Premium + Lime.
 * Mine: lime border/glow tint. Peer: neutral zinc, no lime fill.
 */
export const CHAT_SENT_BUBBLE_SHELL =
  "relative overflow-visible rounded-[17px] rounded-br-[6px] border border-primary/44 bg-[#0d1209] shadow-[0_0_26px_-12px_hsl(var(--primary)/0.44),0_2px_14px_-10px_rgba(0,0,0,0.42)] ring-1 ring-primary/28";

export const CHAT_RECV_BUBBLE_SHELL =
  "relative overflow-visible rounded-[17px] rounded-bl-[6px] border border-zinc-600/50 bg-[#151515] shadow-[0_2px_16px_-10px_rgba(0,0,0,0.58)] ring-1 ring-zinc-700/55";

export function chatBubbleTextClass(mine: boolean, isCompact: boolean): string {
  return cn(
    "whitespace-pre-wrap break-words opacity-100 [overflow-wrap:anywhere] [text-rendering:optimizeLegibility]",
    mine ? "text-white [-webkit-text-fill-color:#ffffff]" : "text-zinc-100 [-webkit-text-fill-color:#f4f4f5]",
    isCompact ? "text-[14px] leading-[1.35]" : "text-[14.5px] leading-[1.45]",
  );
}

export function chatBubbleTimestampClass(mine: boolean): string {
  return cn(
    "text-[10px] font-medium tabular-nums leading-none",
    mine ? "text-primary/65" : "text-zinc-500",
  );
}

export function chatBubbleImageClass(mine: boolean): string {
  return cn(
    "max-h-64 w-full max-w-[min(100%,280px)] rounded-xl object-cover sm:max-w-[300px]",
    mine
      ? "border border-primary/42 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.48)] ring-1 ring-primary/26"
      : "border border-zinc-600/45 shadow-[0_2px_14px_-10px_rgba(0,0,0,0.5)] ring-1 ring-zinc-700/40",
  );
}

/** P5-2D-A — quick replies: compact sent-bubble shell, no nested row chrome. */
export const CHAT_QUICK_REPLY_ROW =
  "flex gap-1.5 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const CHAT_QUICK_REPLY_CHIP =
  "max-w-[200px] shrink-0 truncate whitespace-nowrap rounded-[15px] rounded-br-[5px] border border-primary/40 bg-[#0d1209] px-2.5 py-1.5 text-[11.5px] font-medium leading-snug text-zinc-100 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.38),0_1px_10px_-8px_rgba(0,0,0,0.4)] ring-1 ring-primary/22 transition-[transform,border-color] duration-150 hover:border-primary/52 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45";
