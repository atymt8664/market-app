import { useCallback, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { p10PreviewAttrs } from "@/lib/monetization-boundary";
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

/** مسموح فقط بمسارات داخلية معروفة — لا يُقبل مسار عشوائي. */
function safePromotePreviewReturn(raw: string | undefined): string | null {
  if (!raw || raw.length > 120) return null;
  if (raw === "/new" || raw === "/create-ad") return "/new";
  if (raw === "/account/payments") return raw;
  if (/^\/edit\/\d+$/.test(raw)) return raw;
  return null;
}

/** معاينة عامة لواجهة الترويج — بلا معرّف إعلان ولا جلسة معاينة. */
export default function PromotePreviewPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textStart = dir === "rtl" ? "text-right" : "text-left";

  const returnTo = useMemo(() => {
    const q = new URLSearchParams(search);
    return safePromotePreviewReturn(q.get("return") ?? undefined);
  }, [search]);

  const onBack = useCallback(() => {
    navigate(returnTo ?? "/new");
  }, [navigate, returnTo]);

  return (
    <div className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)} dir={dir} {...p10PreviewAttrs("user.promote_preview")}>
      <header className={SETTINGS_HEADER_BAR} dir="rtl">
        <div className={SETTINGS_HEADER_INNER}>
          <h1 className={SETTINGS_PAGE_TITLE}>{t("promote.title")}</h1>
          <button type="button" onClick={onBack} className={SETTINGS_BACK_BUTTON} aria-label={t("promote_preview.back_aria")}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <div className={cn(SETTINGS_MAIN_COLUMN, "gap-3.5")}>
        <p className={cn(SETTINGS_CARD, "text-xs leading-relaxed text-amber-100/95", textStart)} dir={dir}>
          {t("promote_preview.demo_banner")}
        </p>

        <section className={SETTINGS_CARD} dir={dir}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div
              className={cn(
                "relative h-20 w-full shrink-0 overflow-hidden rounded-2xl border border-primary/32 bg-[#0A0A0A] sm:h-20 sm:w-28",
                "ring-1 ring-primary/10",
              )}
            >
              <AdCardNoImagePlaceholder plainBackdrop compact className="rounded-2xl" />
            </div>
            <div className={cn("min-w-0 flex-1 space-y-1.5", textStart)}>
              <p className="text-base font-bold leading-snug text-foreground line-clamp-2">{t("promote_preview.demo_title")}</p>
              <p className="text-xs leading-relaxed text-zinc-500">{t("promote_preview.hero_hint")}</p>
            </div>
          </div>
        </section>

        <PromoteAdMarketingBody />
      </div>
    </div>
  );
}
