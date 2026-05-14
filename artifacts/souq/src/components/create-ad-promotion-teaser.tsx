import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { Link } from "wouter";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const SHELL =
  "rounded-2xl border border-primary/42 bg-zinc-950/80 p-3.5 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)] ring-1 ring-primary/14 md:p-4";

const ICON_WRAP =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.38)] [&_svg]:h-5 [&_svg]:w-5";

export function CreateAdPromotionTeaser({
  isRtl,
  previewHref,
}: {
  isRtl: boolean;
  previewHref: string;
}) {
  const dir = isRtl ? "rtl" : "ltr";
  const textStart = isRtl ? "text-right" : "text-left";

  return (
    <div className={SHELL} dir={dir}>
      <div className={cn("flex flex-col gap-3", textStart)}>
        <div className="flex min-w-0 flex-1 gap-3" dir={dir}>
          <span className={ICON_WRAP}>
            <Megaphone strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-zinc-600/55 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                {t("create_ad.promotion_teaser.badge_soon")}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500 md:text-[13px]">{t("create_ad.promotion_teaser.desc")}</p>
            <ul className={cn("list-inside list-disc space-y-1 text-[11px] leading-relaxed text-zinc-400 md:text-xs", textStart)}>
              <li>{t("create_ad.promotion_teaser.bullet_top")}</li>
              <li>{t("create_ad.promotion_teaser.bullet_visual")}</li>
              <li>{t("create_ad.promotion_teaser.bullet_bundles")}</li>
              <li>{t("create_ad.promotion_teaser.bullet_visibility")}</li>
            </ul>
          </div>
        </div>
      </div>

      <Link
        href={previewHref}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-semibold text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)] transition hover:border-primary/55 hover:bg-primary/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]",
        )}
        aria-label={t("create_ad.promotion_teaser.cta_aria")}
      >
        <span>{t("create_ad.promotion_teaser.cta")}</span>
        <ChevronLeft className="h-4 w-4 opacity-90 ltr:hidden" strokeWidth={2.5} />
        <ChevronRight className="h-4 w-4 opacity-90 rtl:hidden" strokeWidth={2.5} />
      </Link>
    </div>
  );
}
