import { useCallback, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n";
import { readPromoteAdPreview } from "@/lib/promote-ad-preview";
import { cn } from "@/lib/utils";
import { PromoteAdMarketingBody } from "@/components/promote-ad-marketing-body";
import { AdCardNoImagePlaceholder } from "@/components/ad-card-no-image-placeholder";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";

export default function PromoteAdPage() {
  const [, navigate] = useLocation();
  const { locale } = useLocale();
  const [, params] = useRoute<{ id: string }>("/promote/:id");
  const rawId = params?.id ?? "";
  const adId = Number(rawId);
  const validId = Number.isFinite(adId) && adId > 0;

  const preview = useMemo(
    () => (validId ? readPromoteAdPreview(adId) : null),
    [adId, validId],
  );

  const displayTitle =
    preview?.title && preview.title.length > 0
      ? preview.title
      : t("promote.ad_fallback_title", { id: validId ? String(adId) : "—" });

  const imageUrl = preview?.imageUrl ?? null;

  const dir = locale === "ar" ? "rtl" : "ltr";
  const textStart = dir === "rtl" ? "text-right" : "text-left";

  const onBack = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  if (!validId) {
    return (
      <div className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)} dir={dir}>
        <header className={SETTINGS_HEADER_BAR} dir="rtl">
          <div className={SETTINGS_HEADER_INNER}>
            <h1 className={SETTINGS_PAGE_TITLE}>{t("promote.title")}</h1>
            <button type="button" onClick={onBack} className={SETTINGS_BACK_BUTTON} aria-label={t("promote.back_aria")}>
              <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>
        </header>
        <div className={SETTINGS_MAIN_COLUMN}>
          <p className={cn("text-sm text-muted-foreground", textStart)}>{t("promote.invalid_ad")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)} dir={dir}>
      <header className={SETTINGS_HEADER_BAR} dir="rtl">
        <div className={SETTINGS_HEADER_INNER}>
          <h1 className={SETTINGS_PAGE_TITLE}>{t("promote.title")}</h1>
          <button type="button" onClick={onBack} className={SETTINGS_BACK_BUTTON} aria-label={t("promote.back_aria")}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <div className={cn(SETTINGS_MAIN_COLUMN, "gap-3.5")}>
        <section className={SETTINGS_CARD} dir={dir}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div
              className={cn(
                "relative h-20 w-full shrink-0 overflow-hidden rounded-2xl border border-primary/32 bg-[#0A0A0A] sm:h-20 sm:w-28",
                "ring-1 ring-primary/10",
              )}
            >
              {imageUrl ? (
                <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <AdCardNoImagePlaceholder plainBackdrop compact className="rounded-2xl" />
              )}
            </div>
            <div className={cn("min-w-0 flex-1 space-y-1.5", textStart)}>
              <p className="text-base font-bold leading-snug text-foreground line-clamp-2">{displayTitle}</p>
              <p className="text-xs leading-relaxed text-zinc-500">{t("promote.hero_hint")}</p>
            </div>
          </div>
        </section>

        <PromoteAdMarketingBody />
      </div>
    </div>
  );
}
