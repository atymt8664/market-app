import { MapPin, ExternalLink } from "lucide-react";
import { t } from "@/i18n";
import { buildChatLocationMapsUrl, type ChatLocationPayload } from "@/lib/chat-location-message";
import { cn } from "@/lib/utils";

type ChatLocationMessageCardProps = {
  location: ChatLocationPayload;
  mine: boolean;
  dirRtl: boolean;
};

export function ChatLocationMessageCard({
  location,
  mine,
  dirRtl,
}: ChatLocationMessageCardProps) {
  const mapsUrl = buildChatLocationMapsUrl(location.lat, location.lng);
  return (
    <div
      className={cn(
        "flex min-w-[11.5rem] max-w-[min(100%,260px)] flex-col gap-2.5 rounded-xl border border-primary/35 bg-zinc-950/90 p-3 shadow-[0_0_20px_-12px_hsl(var(--primary)/0.38)] ring-1 ring-primary/20",
        mine ? "text-end" : "text-start",
      )}
      dir={dirRtl ? "rtl" : "ltr"}
    >
      <div
        className={cn(
          "flex items-center gap-2.5",
          dirRtl ? "flex-row-reverse" : "flex-row",
        )}
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_14px_-8px_hsl(var(--primary)/0.45)]"
          aria-hidden
        >
          <MapPin className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <span className="min-w-0 text-sm font-semibold leading-snug text-white">
          {t("message_thread.location_card_title")}
        </span>
      </div>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex min-h-[2.25rem] w-full items-center justify-center gap-2 rounded-lg border border-primary/45 bg-primary/12 px-3 py-2 text-[12px] font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/18",
          dirRtl && "flex-row-reverse",
        )}
      >
        <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {t("message_thread.location_card_open_map")}
      </a>
    </div>
  );
}
