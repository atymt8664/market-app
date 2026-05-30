import { useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  IdCard,
  MessageCircle,
  Shield,
  Star,
  UserCircle,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_CARD,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
  SETTINGS_PAGE_TITLE,
  SETTINGS_SECTION_TITLE,
} from "@/components/settings-shell";

const FACTOR_CARD =
  "rounded-2xl border border-primary/38 bg-[#0A0A0A]/78 p-3 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 md:p-3.5";

const ICON_WRAP =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.42)]";

const LEVEL_CARD =
  "rounded-2xl border border-primary/35 bg-[#0A0A0A]/75 px-2.5 py-3 text-center shadow-[0_0_18px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:py-3.5";

const LEVEL_KEYS = ["new", "good", "trusted", "excellent"] as const;

const FACTOR_KEYS = [
  "identity",
  "response",
  "reports",
  "profile",
  "activity",
  "reviews",
  "continuity",
  "sales",
] as const;

const FACTOR_ICONS: Record<(typeof FACTOR_KEYS)[number], ReactNode> = {
  identity: <IdCard className="h-5 w-5" strokeWidth={2.25} />,
  response: <MessageCircle className="h-5 w-5" strokeWidth={2.25} />,
  reports: <Shield className="h-5 w-5" strokeWidth={2.25} />,
  profile: <UserCircle className="h-5 w-5" strokeWidth={2.25} />,
  activity: <Activity className="h-5 w-5" strokeWidth={2.25} />,
  reviews: <Star className="h-5 w-5" strokeWidth={2.25} />,
  continuity: <CalendarDays className="h-5 w-5" strokeWidth={2.25} />,
  sales: <BadgeCheck className="h-5 w-5" strokeWidth={2.25} />,
};

function FactorRow({
  dir,
  textStart,
  factorKey,
}: {
  dir: "rtl" | "ltr";
  textStart: string;
  factorKey: (typeof FACTOR_KEYS)[number];
}) {
  return (
    <article className={FACTOR_CARD} dir={dir}>
      <div className="flex items-start gap-3">
        <span className={ICON_WRAP}>{FACTOR_ICONS[factorKey]}</span>
        <div className={cn("min-w-0 flex-1 space-y-1.5", textStart)}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {t(`seller_trust.factor.${factorKey}.title`)}
            </h3>
            <span className="inline-flex rounded-full border border-zinc-600/55 bg-[#0A0A0A]/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              {t("seller_trust.badge_soon")}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500 md:text-xs">{t(`seller_trust.factor.${factorKey}.desc`)}</p>
          <Button
            type="button"
            disabled
            className="mt-1 h-8 rounded-xl border border-primary/30 bg-[#0A0A0A]/85 px-3 text-[11px] font-semibold text-zinc-500 shadow-none"
          >
            {t("seller_trust.badge_soon")}
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function SellerTrustPage() {
  const [, navigate] = useLocation();
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textStart = dir === "rtl" ? "text-right" : "text-left";

  const onBack = useCallback(() => {
    navigate("/professional-seller/trust");
  }, [navigate]);

  return (
    <div className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)} dir={dir}>
      <header className={SETTINGS_HEADER_BAR} dir="rtl">
        <div className={SETTINGS_HEADER_INNER}>
          <h1 className={SETTINGS_PAGE_TITLE}>{t("seller_trust.page.title")}</h1>
          <button type="button" onClick={onBack} className={SETTINGS_BACK_BUTTON} aria-label={t("seller_trust.page.back_aria")}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <div className={cn(SETTINGS_MAIN_COLUMN, "gap-3.5")}>
        <section className={SETTINGS_CARD} dir={dir}>
          <p className={cn("text-sm font-semibold leading-snug text-foreground", textStart)}>{t("seller_trust.hero.title")}</p>
          <p className={cn("mt-2 text-xs leading-relaxed text-zinc-500", textStart)}>{t("seller_trust.hero.p1")}</p>
          <p className={cn("mt-1.5 text-xs leading-relaxed text-zinc-500", textStart)}>{t("seller_trust.hero.p2")}</p>
          <p className={cn("mt-1.5 text-xs leading-relaxed text-zinc-500", textStart)}>{t("seller_trust.hero.p3")}</p>
          <p className={cn("mt-2 rounded-xl border border-amber-500/30 bg-amber-950/25 px-3 py-2 text-[11px] font-medium leading-relaxed text-amber-100/95", textStart)}>
            {t("seller_trust.hero.p4")}
          </p>
        </section>

        <section className={SETTINGS_CARD} dir={dir}>
          <p className={cn("text-[11px] font-semibold uppercase tracking-wide text-zinc-500", textStart)}>
            {t("seller_trust.preview.section_label")}
          </p>
          <div className={cn("mt-2 flex flex-col items-stretch gap-1 sm:flex-row sm:items-end sm:justify-between", textStart)}>
            <div className="tabular-nums">
              <span className="text-2xl font-bold tracking-tight text-primary md:text-3xl">{t("seller_trust.preview.score_display")}</span>
            </div>
            <p className="max-w-md text-[11px] leading-relaxed text-zinc-500 md:text-xs">{t("seller_trust.preview.caption")}</p>
          </div>
        </section>

        <h2 className={SETTINGS_SECTION_TITLE}>{t("seller_trust.section_levels")}</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-2.5">
          {LEVEL_KEYS.map((key) => (
            <div key={key} className={LEVEL_CARD} dir={dir}>
              <p className="text-xs font-bold text-foreground md:text-sm">{t(`seller_trust.level.${key}.name`)}</p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-zinc-500 md:text-[11px]">{t(`seller_trust.level.${key}.hint`)}</p>
              <span className="mt-2 inline-flex rounded-full border border-zinc-600/55 bg-[#0A0A0A]/90 px-2 py-0.5 text-[9px] font-semibold text-zinc-400">
                {t("seller_trust.badge_soon")}
              </span>
            </div>
          ))}
        </div>

        <h2 className={SETTINGS_SECTION_TITLE}>{t("seller_trust.section_factors")}</h2>
        <div className="space-y-2.5">
          {FACTOR_KEYS.map((k) => (
            <FactorRow key={k} dir={dir} textStart={textStart} factorKey={k} />
          ))}
        </div>

        <section className={SETTINGS_CARD} dir={dir}>
          <p className={cn("text-[11px] leading-relaxed text-zinc-500", textStart)}>{t("seller_trust.footer_note")}</p>
        </section>
      </div>
    </div>
  );
}
