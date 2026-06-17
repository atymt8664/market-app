import { useState } from "react";
import type { ConversationAdReference, ConversationDetail } from "@workspace/api-client-react";
import { ChevronDown, Package } from "lucide-react";
import { ChatConversationAdsSheet } from "@/components/chat-conversation-ads-sheet";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type ChatConversationAdsBarProps = {
  conv: ConversationDetail;
  dirRtl: boolean;
  onSelectAd: (ad: ConversationAdReference) => void;
};

export function ChatConversationAdsBar({
  conv,
  dirRtl,
  onSelectAd,
}: ChatConversationAdsBarProps) {
  const [open, setOpen] = useState(false);
  const ads = conv.referencedAds?.length
    ? conv.referencedAds
    : conv.adId
      ? [
          {
            adId: conv.adId,
            title: conv.adTitle,
            imageUrl: conv.adImage ?? null,
            price: conv.adPrice ?? null,
            priceType: conv.adPriceType ?? null,
            available: conv.adAvailable !== false,
          },
        ]
      : [];

  if (!ads.length) return null;

  const count = ads.length;

  return (
    <>
      <div
        className="mx-auto w-full max-w-[820px] shrink-0 border-b border-primary/12 bg-[#0A0A0A]/96 px-3 py-1.5"
        dir={dirRtl ? "rtl" : "ltr"}
        data-testid="chat-conversation-ads-bar"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-primary/22 bg-black/25 px-2.5 py-1.5 text-start shadow-[0_0_12px_-14px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10 transition-colors hover:border-primary/35 hover:bg-black/40",
            dirRtl ? "text-right" : "text-left",
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-[#0A0A0A] text-primary">
            <Package className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-100">
            {t("message_thread.ads_bar_label", { count: String(count) })}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
        </button>
      </div>
      <ChatConversationAdsSheet
        open={open}
        dirRtl={dirRtl}
        ads={ads}
        onOpenChange={setOpen}
        onSelectAd={onSelectAd}
      />
    </>
  );
}
