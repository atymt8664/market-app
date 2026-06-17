import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import type { ChatAdReferencePayload } from "@/lib/chat-ad-reference-message";
import { t } from "@/i18n";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChatAdReferenceMessageContentProps = {
  payload: ChatAdReferencePayload;
  dirRtl: boolean;
  mine: boolean;
};

function resolvePriceLabel(payload: ChatAdReferencePayload): string | null {
  const type = payload.priceType ?? "fixed";
  if (type === "free") return t("ad-card.free");
  if (type === "swap") return t("ad-card.swap");
  if (payload.price == null) return null;
  return formatPrice(payload.price, type);
}

export function ChatAdReferenceMessageContent({
  payload,
  dirRtl,
  mine,
}: ChatAdReferenceMessageContentProps) {
  const priceLabel = resolvePriceLabel(payload);
  const lead = mine
    ? t("message_thread.ad_reference_lead_mine")
    : t("message_thread.ad_reference_lead_peer");

  return (
    <div className="space-y-2" dir={dirRtl ? "rtl" : "ltr"}>
      <p className="text-[12.5px] leading-relaxed text-zinc-100">
        {lead}
        {": "}
        <span className="font-semibold text-white">{payload.title}</span>
        {priceLabel ? (
          <>
            {" — "}
            <span className="font-medium text-primary">{priceLabel}</span>
          </>
        ) : null}
      </p>
      <Link
        href={`/ad/${payload.adId}`}
        className={cn(
          "flex items-center gap-2 rounded-lg border border-primary/22 bg-black/35 px-2 py-1.5 transition-colors hover:border-primary/35 hover:bg-black/50",
          dirRtl ? "text-right" : "text-left",
        )}
      >
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md border border-primary/20 bg-[#0A0A0A]">
          {payload.imageUrl ? (
            <img src={payload.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary/70">
              <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold text-white">{payload.title}</p>
          {priceLabel ? (
            <p className="truncate text-[11px] text-primary">{priceLabel}</p>
          ) : null}
        </div>
      </Link>
    </div>
  );
}
