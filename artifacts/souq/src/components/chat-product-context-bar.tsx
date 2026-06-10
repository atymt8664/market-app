import { Link } from "wouter";
import type { ConversationDetail } from "@workspace/api-client-react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChatProductContextBarProps = {
  conv: ConversationDetail;
  dirRtl: boolean;
};

function resolveAdPriceLabel(conv: ConversationDetail): string | null {
  const type = conv.adPriceType ?? "fixed";
  if (type === "free") return t("ad-card.free");
  if (type === "swap") return t("ad-card.swap");
  if (conv.adPrice == null) return null;
  return formatPrice(conv.adPrice, type);
}

export function ChatProductContextBar({ conv, dirRtl }: ChatProductContextBarProps) {
  const priceLabel = resolveAdPriceLabel(conv);
  const available = conv.adAvailable !== false;
  const Chevron = dirRtl ? ChevronLeft : ChevronRight;

  const inner = (
    <>
      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-primary/22 bg-[#0A0A0A] ring-1 ring-primary/10">
        {conv.adImage ? (
          <img
            src={conv.adImage}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            sizes="32px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/70">
            <MessageCircle className="h-3 w-3" strokeWidth={2} aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11.5px] font-semibold leading-tight text-white">
          {conv.adTitle}
        </p>
        {priceLabel ? (
          <p className="mt-px truncate text-[10.5px] font-medium text-primary">{priceLabel}</p>
        ) : null}
        {!available ? (
          <p className="mt-px truncate text-[10px] text-zinc-500">
            {t("message_thread.menu_ad_unavailable")}
          </p>
        ) : null}
      </div>
      {available ? (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A]/90 text-primary shadow-[0_0_10px_-6px_hsl(var(--primary)/0.25)] ring-1 ring-primary/12"
          aria-hidden
        >
          <Chevron className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      ) : null}
    </>
  );

  return (
    <div
      className="mx-auto w-full max-w-[820px] shrink-0 border-b border-primary/15 bg-[#0A0A0A]/96 px-3 pb-1.5 pt-2"
      dir={dirRtl ? "rtl" : "ltr"}
      data-testid="chat-product-context-bar"
    >
      {available ? (
        <Link
          href={`/ad/${conv.adId}`}
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-lg border border-primary/18 bg-[rgba(0,0,0,0.35)] px-2 py-1.5 shadow-[0_0_14px_-14px_hsl(var(--primary)/0.16)] ring-1 ring-primary/8 transition-[border-color,background-color] hover:border-primary/32 hover:bg-black/50 active:scale-[0.995]",
            dirRtl ? "text-right" : "text-left",
          )}
          data-testid="chat-product-context-link"
        >
          {inner}
        </Link>
      ) : (
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-lg border border-primary/12 bg-[rgba(0,0,0,0.25)] px-2 py-1.5 opacity-70",
            dirRtl ? "text-right" : "text-left",
          )}
        >
          {inner}
        </div>
      )}
    </div>
  );
}
