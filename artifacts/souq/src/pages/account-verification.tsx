import { useMemo, type ReactNode } from "react";
import {
  BadgeCheck,
  Building2,
  IdCard,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { AccountHeader } from "@/components/account-header";
import { useLocale } from "@/hooks/use-locale";
import { t } from "@/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_CARD_COMPACT,
  SETTINGS_CARD_TITLE,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

const TYPE_CARD =
  "rounded-2xl border border-primary/38 bg-zinc-950/78 p-3 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12 md:p-3.5";

const ICON_WRAP =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.42)]";

const TYPE_KEYS = ["identity", "seller", "business", "phone", "email"] as const;

const TYPE_ICONS: Record<(typeof TYPE_KEYS)[number], ReactNode> = {
  identity: <IdCard className="h-5 w-5" strokeWidth={2.25} />,
  seller: <Store className="h-5 w-5" strokeWidth={2.25} />,
  business: <Building2 className="h-5 w-5" strokeWidth={2.25} />,
  phone: <Phone className="h-5 w-5" strokeWidth={2.25} />,
  email: <Mail className="h-5 w-5" strokeWidth={2.25} />,
};

const BENEFIT_KEYS = ["badge", "trust", "visibility", "fraud", "seller_trust"] as const;

const BENEFIT_ICONS: Record<(typeof BENEFIT_KEYS)[number], ReactNode> = {
  badge: <BadgeCheck className="h-5 w-5" strokeWidth={2.25} />,
  trust: <ShieldCheck className="h-5 w-5" strokeWidth={2.25} />,
  visibility: <TrendingUp className="h-5 w-5" strokeWidth={2.25} />,
  fraud: <Shield className="h-5 w-5" strokeWidth={2.25} />,
  seller_trust: <Sparkles className="h-5 w-5" strokeWidth={2.25} />,
};

function TypeRow({
  typeKey,
  dir,
  textStart,
}: {
  typeKey: (typeof TYPE_KEYS)[number];
  dir: "rtl" | "ltr";
  textStart: string;
}) {
  return (
    <article className={TYPE_CARD} dir={dir}>
      <div className="flex items-start gap-3">
        <span className={ICON_WRAP}>{TYPE_ICONS[typeKey]}</span>
        <div className={cn("min-w-0 flex-1 space-y-1.5", textStart)}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">
              {t(`verification_preview.type.${typeKey}.title`)}
            </h3>
            <span className="inline-flex rounded-full border border-zinc-600/55 bg-zinc-900/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
              {t("verification_preview.soon")}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-500 md:text-xs">
            {t(`verification_preview.type.${typeKey}.desc`)}
          </p>
        </div>
      </div>
    </article>
  );
}

function BenefitRow({
  benefitKey,
  dir,
  textStart,
}: {
  benefitKey: (typeof BENEFIT_KEYS)[number];
  dir: "rtl" | "ltr";
  textStart: string;
}) {
  return (
    <div
      className={cn(
        SETTINGS_CARD_COMPACT,
        "flex items-start gap-3 border-primary/25 bg-zinc-950/55 p-3.5",
      )}
      dir={dir}
    >
      <span className={ICON_WRAP}>{BENEFIT_ICONS[benefitKey]}</span>
      <div className={cn("min-w-0 flex-1 space-y-0.5", textStart)}>
        <p className="text-sm font-semibold text-foreground">
          {t(`verification_preview.benefit.${benefitKey}.title`)}
        </p>
        <p className="text-[11px] leading-relaxed text-zinc-500 md:text-xs">
          {t(`verification_preview.benefit.${benefitKey}.desc`)}
        </p>
      </div>
    </div>
  );
}

export default function AccountVerification() {
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textStart = dir === "rtl" ? "text-right" : "text-left";
  const typeKeys = useMemo(() => [...TYPE_KEYS], []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex min-h-[100dvh] w-full flex-col", SETTINGS_PAGE_BG)}
      dir={dir}
    >
      <AccountHeader title={t("verification_preview.page_title")} />

      <div
        className={cn(
          SETTINGS_MAIN_COLUMN,
          "flex-1 gap-3.5 pt-2 pb-6",
          SETTINGS_IMMERSIVE_BOTTOM,
        )}
      >
        <section className={SETTINGS_CARD} dir={dir}>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className={cn("min-w-0 flex-1 space-y-3", textStart)}>
              <h2 className={SETTINGS_CARD_TITLE}>{t("verification_preview.hero.title")}</h2>
              <p className="text-sm leading-relaxed text-zinc-500">
                {t("verification_preview.hero.lead")}
              </p>
              <ul
                className={cn(
                  "list-disc space-y-2 ps-4 text-xs leading-relaxed text-zinc-400 marker:text-primary md:text-sm",
                  textStart,
                )}
                dir={dir}
              >
                <li>{t("verification_preview.hero.point_trust")}</li>
                <li>{t("verification_preview.hero.point_safety")}</li>
                <li>{t("verification_preview.hero.point_credibility")}</li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className={cn(
            SETTINGS_CARD_COMPACT,
            "border-amber-500/35 bg-amber-500/[0.07] p-4 shadow-[0_0_18px_-12px_rgba(245,158,11,0.12)]",
            textStart,
          )}
          dir={dir}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400/95">
            {t("verification_preview.notice.kicker")}
          </p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {t("verification_preview.notice.title")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
            {t("verification_preview.notice.body")}
          </p>
        </section>

        <section className={SETTINGS_CARD} dir={dir}>
          <h2 className={cn(SETTINGS_CARD_TITLE, "mb-3")}>
            {t("verification_preview.types_title")}
          </h2>
          <div className="space-y-3">
            {typeKeys.map((k) => (
              <TypeRow key={k} typeKey={k} dir={dir} textStart={textStart} />
            ))}
          </div>
        </section>

        <section className={SETTINGS_CARD} dir={dir}>
          <h2 className={cn(SETTINGS_CARD_TITLE, "mb-3")}>
            {t("verification_preview.benefits_title")}
          </h2>
          <div className="space-y-2.5">
            {BENEFIT_KEYS.map((k) => (
              <BenefitRow key={k} benefitKey={k} dir={dir} textStart={textStart} />
            ))}
          </div>
        </section>

        <section className={SETTINGS_CARD} dir={dir}>
          <div className={SETTINGS_ACTION_PANEL}>
            <Button
              type="button"
              disabled
              className="h-11 w-full rounded-xl border border-primary/30 bg-zinc-950/90 text-sm font-semibold text-zinc-500 shadow-none"
            >
              {t("verification_preview.cta")}
            </Button>
            <p className={cn("text-center text-[11px] leading-relaxed text-zinc-500", textStart)}>
              {t("verification_preview.cta_footnote")}
            </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
