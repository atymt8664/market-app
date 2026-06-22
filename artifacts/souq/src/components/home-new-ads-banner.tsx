import { Loader2, Sparkles } from "lucide-react";
import { t } from "@/i18n";
import { HOME_PAGE_INSET } from "@/lib/home-page-layout";
import { cn } from "@/lib/utils";

type HomeNewAdsBannerProps = {
  count: number;
  busy?: boolean;
  onRefresh: () => void;
  className?: string;
};

/** Compact home feed chip — does not overlay cards, search, or bottom nav. */
export function HomeNewAdsBanner({
  count,
  busy = false,
  onRefresh,
  className,
}: HomeNewAdsBannerProps) {
  if (count <= 0) return null;

  const label =
    count === 1
      ? t("home.new_ads_banner_one")
      : t("home.new_ads_banner_many", { count: String(count) });

  return (
    <div
      className={cn(HOME_PAGE_INSET, "mb-2 flex justify-center pt-0.5", className)}
      data-testid="home-new-ads-banner"
    >
      <button
        type="button"
        onClick={onRefresh}
        disabled={busy}
        className={cn(
          "inline-flex max-w-full items-center justify-center gap-1.5 rounded-full",
          "border border-primary/35 bg-[#0A0A0A]/95 px-3 py-1.5",
          "text-[11px] font-semibold leading-tight text-primary sm:text-xs",
          "ring-1 ring-primary/10 transition-colors",
          "hover:border-primary/50 hover:bg-black/90 active:bg-black",
          "disabled:cursor-wait disabled:opacity-70",
        )}
        dir="auto"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        )}
        <span className="truncate">{label}</span>
      </button>
    </div>
  );
}
