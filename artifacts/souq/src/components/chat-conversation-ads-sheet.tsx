import { createPortal } from "react-dom";
import type { ConversationAdReference } from "@workspace/api-client-react";
import { MessageCircle, X } from "lucide-react";
import { Link } from "wouter";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

const PANEL_SHELL =
  "flex max-h-[min(72dvh,560px)] flex-col gap-0 rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";

type ChatConversationAdsSheetProps = {
  open: boolean;
  dirRtl: boolean;
  ads: ConversationAdReference[];
  onOpenChange: (open: boolean) => void;
  onSelectAd: (ad: ConversationAdReference) => void;
};

function resolvePriceLabel(ad: ConversationAdReference): string | null {
  const type = ad.priceType ?? "fixed";
  if (type === "free") return t("ad-card.free");
  if (type === "swap") return t("ad-card.swap");
  if (ad.price == null) return null;
  return formatPrice(ad.price, type);
}

export function ChatConversationAdsSheet({
  open,
  dirRtl,
  ads,
  onOpenChange,
  onSelectAd,
}: ChatConversationAdsSheetProps) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex flex-col justify-end" dir={dirRtl ? "rtl" : "ltr"}>
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[1px]"
        aria-label={t("message_thread.ads_sheet_close")}
        onClick={() => onOpenChange(false)}
      />
      <div className={cn(PANEL_SHELL, "relative z-[1] w-full")} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-3 border-b border-primary/15 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">
            {t("message_thread.ads_sheet_title")}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/35 bg-[#0A0A0A] text-primary"
            aria-label={t("message_thread.ads_sheet_close")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <ul className="space-y-2">
            {ads.map((ad) => {
              const priceLabel = resolvePriceLabel(ad);
              const available = ad.available !== false;
              return (
                <li key={ad.adId}>
                  <div className="flex items-stretch gap-2 rounded-xl border border-primary/18 bg-black/30 ring-1 ring-primary/8">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectAd(ad);
                        onOpenChange(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-start transition-colors hover:bg-black/40"
                    >
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-[#0A0A0A]">
                        {ad.imageUrl ? (
                          <img
                            src={ad.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-primary/70">
                            <MessageCircle className="h-4 w-4" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-white">{ad.title}</p>
                        {priceLabel ? (
                          <p className="mt-0.5 truncate text-[11px] font-medium text-primary">
                            {priceLabel}
                          </p>
                        ) : null}
                        {!available ? (
                          <p className="mt-0.5 text-[10px] text-zinc-500">
                            {t("message_thread.menu_ad_unavailable")}
                          </p>
                        ) : null}
                      </div>
                    </button>
                    {available ? (
                      <Link
                        href={`/ad/${ad.adId}`}
                        className="flex shrink-0 items-center px-2 text-[11px] font-medium text-primary/90 hover:text-primary"
                      >
                        {t("message_thread.ads_sheet_open_ad")}
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>,
    document.body,
  );
}
