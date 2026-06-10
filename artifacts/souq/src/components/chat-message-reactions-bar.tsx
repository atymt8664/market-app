import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";

import { createPortal } from "react-dom";

import { t } from "@/i18n";

import { cn } from "@/lib/utils";

import { ChatMessageReactionsExpanded } from "@/components/chat-message-reactions-expanded";



export const CHAT_MESSAGE_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;



export type MessageAnchorRect = {

  top: number;

  left: number;

  width: number;

  height: number;

};



type ChatMessageReactionsBarProps = {

  anchor: MessageAnchorRect;

  messageId: number;

  dirRtl: boolean;

  onPick: (emoji: string) => void;

};



const EMOJI_TAP_PX = 32;

const BAR_GAP_PX = 8;

const HEADER_SAFE_TOP_PX = 56;

const VIEWPORT_PAD_PX = 8;

const ACTIONS_SHEET_RESERVE_PX = 96;



const BAR_SHELL =

  "pointer-events-auto w-max max-w-[calc(100vw-16px)] rounded-full border border-primary/35 bg-[#0A0A0A] px-0.5 py-0.5 shadow-[0_4px_20px_-6px_rgba(0,0,0,0.65),0_0_16px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/15";



const SCROLL_ROW = "flex w-max max-w-[calc(100vw-16px)] items-center gap-0";



const EMOJI_BTN =

  "inline-flex shrink-0 items-center justify-center rounded-full text-[18px] leading-none transition-[transform,background-color] duration-150 hover:bg-primary/10 active:scale-90 active:bg-primary/20";



const MORE_BTN =

  "inline-flex shrink-0 items-center justify-center rounded-full border border-primary/25 bg-[#0A0A0A] text-[12px] font-bold text-primary hover:bg-primary/10 active:scale-90";



type BarPosition = {

  top: number;

  left: number;

};



function measureAnchor(messageId: number): MessageAnchorRect | null {

  const el = document.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`);

  if (!el) return null;

  const rect = el.getBoundingClientRect();

  return {

    top: rect.top,

    left: rect.left,

    width: rect.width,

    height: rect.height,

  };

}



function resolveBarPosition(

  anchor: MessageAnchorRect,

  barWidth: number,

  barHeight: number,

): BarPosition {

  const bubbleCenterX = anchor.left + anchor.width / 2;

  let left = bubbleCenterX - barWidth / 2;

  left = Math.max(

    VIEWPORT_PAD_PX,

    Math.min(left, window.innerWidth - barWidth - VIEWPORT_PAD_PX),

  );



  const maxTop =

    window.innerHeight - ACTIONS_SHEET_RESERVE_PX - barHeight - VIEWPORT_PAD_PX;



  let top = anchor.top - barHeight - BAR_GAP_PX;

  if (top < HEADER_SAFE_TOP_PX) {

    top = anchor.top + anchor.height + BAR_GAP_PX;

  }

  top = Math.min(Math.max(top, HEADER_SAFE_TOP_PX), Math.max(HEADER_SAFE_TOP_PX, maxTop));



  return { top, left };

}



function barPositionsEqual(a: BarPosition | null, b: BarPosition): boolean {

  return a != null && a.top === b.top && a.left === b.left;

}



export function ChatMessageReactionsBar({

  anchor: anchorProp,

  messageId,

  dirRtl,

  onPick,

}: ChatMessageReactionsBarProps) {

  const barRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<BarPosition | null>(null);

  const [pressedEmoji, setPressedEmoji] = useState<string | null>(null);

  const [expandedOpen, setExpandedOpen] = useState(false);



  const reposition = () => {

    const measured = measureAnchor(messageId) ?? anchorProp;

    const barWidth = barRef.current?.offsetWidth ?? 240;

    const barHeight = barRef.current?.offsetHeight ?? EMOJI_TAP_PX + 4;

    const next = resolveBarPosition(measured, barWidth, barHeight);

    setPosition((prev) => (barPositionsEqual(prev, next) ? prev : next));

  };



  useLayoutEffect(() => {

    reposition();

    const onLayout = () => reposition();

    window.addEventListener("resize", onLayout);

    window.addEventListener("scroll", onLayout, true);

    const node = barRef.current;

    const resizeObserver =

      typeof ResizeObserver !== "undefined" && node

        ? new ResizeObserver(onLayout)

        : null;

    if (node && resizeObserver) resizeObserver.observe(node);

    return () => {

      window.removeEventListener("resize", onLayout);

      window.removeEventListener("scroll", onLayout, true);

      resizeObserver?.disconnect();

    };

  }, [anchorProp, messageId]);



  const handlePick = (emoji: string) => {

    setPressedEmoji(emoji);

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {

      try {

        navigator.vibrate(8);

      } catch {

        /* optional haptic */

      }

    }

    window.setTimeout(() => {

      setPressedEmoji(null);

      onPick(emoji);

    }, 80);

  };



  if (typeof document === "undefined") return null;



  const fallbackWidth = (CHAT_MESSAGE_REACTIONS.length + 1) * EMOJI_TAP_PX + 8;

  const pos =

    position ??

    resolveBarPosition(anchorProp, fallbackWidth, EMOJI_TAP_PX + 4);



  const tapStyle = {

    width: EMOJI_TAP_PX,

    height: EMOJI_TAP_PX,

    minWidth: EMOJI_TAP_PX,

    minHeight: EMOJI_TAP_PX,

  };



  const openExpanded = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedOpen(true);
  };

  const moreButton = (
    <button
      type="button"
      onClick={openExpanded}
      className={cn(MORE_BTN, "touch-manipulation [-webkit-tap-highlight-color:transparent]")}
      style={tapStyle}
      aria-label={t("message_thread.reactions_more")}
      aria-haspopup="dialog"
    >
      ➕
    </button>
  );



  return (

    <>

      {createPortal(

        <div

          ref={barRef}

          className={cn(BAR_SHELL, "fixed z-[70]")}

          onClick={(e) => e.stopPropagation()}

          style={{ top: pos.top, left: pos.left }}

          role="toolbar"

          aria-label={t("message_thread.reactions_bar_label")}

        >

          <div className={SCROLL_ROW} dir={dirRtl ? "rtl" : "ltr"}>

            {CHAT_MESSAGE_REACTIONS.map((emoji) => (

              <button

                key={emoji}

                type="button"

                onPointerDown={(e) => {

                  e.preventDefault();

                  e.stopPropagation();

                  handlePick(emoji);

                }}

                className={cn(

                  EMOJI_BTN,

                  "touch-manipulation [-webkit-tap-highlight-color:transparent]",

                  pressedEmoji === emoji && "scale-90 bg-primary/25",

                )}

                style={tapStyle}

                aria-label={emoji}

              >

                <span aria-hidden className="select-none [font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif]">

                  {emoji}

                </span>

              </button>

            ))}

            {moreButton}

          </div>

        </div>,

        document.body,

      )}

      <ChatMessageReactionsExpanded

        open={expandedOpen}

        dirRtl={dirRtl}

        onPick={handlePick}

        onClose={() => setExpandedOpen(false)}

      />

    </>

  );

}


