import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type MonetizationPreviewBannerProps = {
  className?: string;
};

/** Visible guard: architecture preview — no live charges (P8-1G / P10). */
export function MonetizationPreviewBanner({ className }: MonetizationPreviewBannerProps) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-2xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-[13px] font-medium leading-relaxed text-amber-100/95",
        className,
      )}
    >
      {t("p10.monetization.boundary.preview_banner")}
    </p>
  );
}
