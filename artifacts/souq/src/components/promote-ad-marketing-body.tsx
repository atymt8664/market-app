import { useCallback, useMemo, type ReactNode } from "react";
import {
  ArrowUpCircle,
  Award,
  Images,
  Info,
  Pin,
  Rocket,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_SECTION_TITLE,
} from "@/components/settings-shell";

const ROW_CARD =
  "rounded-2xl border border-primary/36 bg-zinc-950/76 p-3 shadow-[0_0_20px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-3.5";

const BUNDLE_CARD =
  "rounded-2xl border border-primary/44 bg-zinc-950/82 p-3.5 shadow-[0_0_26px_-10px_hsl(var(--primary)/0.26)] ring-1 ring-primary/16 md:p-4";

const ICON_WRAP =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.42)] md:h-11 md:w-11";

type FeatureId = "bump_once" | "highlight" | "daily" | "top" | "gallery" | "urgent";
type BundleId = "quick" | "pro" | "power";

function PromoteRow({
  dir,
  textStart,
  icon,
  name,
  description,
  duration,
  price,
  onInfo,
  dense,
}: {
  dir: "rtl" | "ltr";
  textStart: string;
  icon: ReactNode;
  name: string;
  description: string;
  duration: string;
  price: string;
  onInfo: () => void;
  dense?: boolean;
}) {
  return (
    <article className={dense ? ROW_CARD : BUNDLE_CARD} dir={dir}>
      <div className="flex items-start gap-2.5 md:gap-3">
        <span className={ICON_WRAP}>{icon}</span>
        <div className={cn("min-w-0 flex-1 space-y-0.5", textStart)}>
          <p className="text-sm font-semibold leading-snug text-foreground">{name}</p>
          <p className="text-[11px] leading-relaxed text-zinc-500 md:text-xs">{description}</p>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-1 text-[11px] text-zinc-400">
            <span className="font-medium text-zinc-300">{duration}</span>
            <span className="font-semibold text-primary tabular-nums">{price}</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 pt-0.5">
          <Checkbox checked={false} disabled className="h-[18px] w-[18px] rounded-md border-primary/50" />
          <button
            type="button"
            onClick={onInfo}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-primary/32 bg-zinc-950/85 text-primary/80 shadow-[0_0_12px_-8px_hsl(var(--primary)/0.3)] transition hover:border-primary/48 hover:bg-zinc-900/90 active:scale-[0.97]"
            aria-label={t("promote.pkg_info_aria")}
          >
            <Info className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </article>
  );
}

/** محتوى أقسام الترويج (ميزات + باقات + ملخص) — يُعاد استخدامه في `/promote/:id` و`/promote-preview`. */
export function PromoteAdMarketingBody() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textStart = dir === "rtl" ? "text-right" : "text-left";

  const showInfoToast = useCallback(() => {
    toast({ title: t("promote.info_toast") });
  }, [toast]);

  const featureRows: { id: FeatureId; icon: ReactNode }[] = useMemo(
    () => [
      { id: "bump_once", icon: <ArrowUpCircle className="h-5 w-5" strokeWidth={2.25} /> },
      { id: "highlight", icon: <Sparkles className="h-5 w-5" strokeWidth={2.25} /> },
      { id: "daily", icon: <TrendingUp className="h-5 w-5" strokeWidth={2.25} /> },
      { id: "top", icon: <Pin className="h-5 w-5" strokeWidth={2.25} /> },
      { id: "gallery", icon: <Images className="h-5 w-5" strokeWidth={2.25} /> },
      { id: "urgent", icon: <Zap className="h-5 w-5" strokeWidth={2.25} /> },
    ],
    [],
  );

  const bundleRows: { id: BundleId; icon: ReactNode }[] = useMemo(
    () => [
      { id: "quick", icon: <Rocket className="h-5 w-5" strokeWidth={2.25} /> },
      { id: "pro", icon: <Award className="h-5 w-5" strokeWidth={2.25} /> },
      { id: "power", icon: <Sparkles className="h-5 w-5" strokeWidth={2.25} /> },
    ],
    [],
  );

  return (
    <>
      <p className={cn(SETTINGS_CARD_SHELL, "px-3 py-2.5 text-xs leading-relaxed text-primary/88", textStart)}>
        {t("promote.page_intro")}
      </p>

      <div className="space-y-2">
        <h2 className={SETTINGS_SECTION_TITLE}>{t("promote.section.features_title")}</h2>
        <p className={cn("px-1 text-xs leading-relaxed text-zinc-500", textStart)}>{t("promote.section.features_hint")}</p>
        <div className="space-y-2">
          {featureRows.map((row) => (
            <PromoteRow
              key={row.id}
              dir={dir}
              textStart={textStart}
              icon={row.icon}
              name={t(`promote.feature.${row.id}.name`)}
              description={t(`promote.feature.${row.id}.desc`)}
              duration={t(`promote.feature.${row.id}.duration`)}
              price={t(`promote.feature.${row.id}.price`)}
              onInfo={showInfoToast}
              dense
            />
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-gradient-to-l from-transparent via-primary/25 to-transparent" aria-hidden />

      <div className="space-y-2">
        <h2 className={SETTINGS_SECTION_TITLE}>{t("promote.section.bundles_title")}</h2>
        <p className={cn("px-1 text-xs leading-relaxed text-zinc-500", textStart)}>{t("promote.section.bundles_hint")}</p>
        <div className="space-y-2.5">
          {bundleRows.map((row) => (
            <div key={row.id} className="relative">
              <span
                className={cn(
                  "pointer-events-none absolute -top-1.5 end-3 z-[1] inline-flex rounded-full border border-primary/40 bg-zinc-950/95 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-[0_0_12px_-4px_hsl(var(--primary)/0.35)]",
                )}
              >
                {t("promote.bundle_badge")}
              </span>
              <PromoteRow
                dir={dir}
                textStart={textStart}
                icon={row.icon}
                name={t(`promote.bundle.${row.id}.name`)}
                description={t(`promote.bundle.${row.id}.desc`)}
                duration={t(`promote.bundle.${row.id}.duration`)}
                price={t(`promote.bundle.${row.id}.price`)}
                onInfo={showInfoToast}
              />
            </div>
          ))}
        </div>
      </div>

      <section className={cn(SETTINGS_CARD, "space-y-3")} dir={dir}>
        <div className={cn("flex items-center justify-between gap-3", textStart)}>
          <span className="text-sm font-medium text-zinc-400">{t("promote.summary_label")}</span>
          <span className="text-sm font-bold text-primary tabular-nums">{t("promote.summary_demo")}</span>
        </div>
        <Button
          type="button"
          disabled
          className="h-12 w-full rounded-2xl border border-primary/35 bg-zinc-950/80 text-sm font-semibold text-zinc-500 opacity-90 shadow-none"
        >
          {t("promote.pay_disabled")}
        </Button>
        <p className={cn("text-xs leading-relaxed text-zinc-500", textStart)}>{t("promote.footer_message")}</p>
      </section>
    </>
  );
}
