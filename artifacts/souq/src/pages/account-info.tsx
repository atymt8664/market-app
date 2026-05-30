import { AccountHeader } from "@/components/account-header";
import {
  ArrowUpCircle,
  Award,
  CreditCard,
  Globe,
  HelpCircle,
  Images,
  Info,
  Lock,
  Pin,
  Shield,
  Sparkles,
  Star,
  CheckCircle2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { useState } from "react";
import { APP_VERSION } from "@/lib/app-config";
import {
  SETTINGS_ACTION_PANEL,
  SETTINGS_CARD,
  SETTINGS_CARD_COMPACT,
  SETTINGS_FIELD,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_LABEL,
  SETTINGS_MAIN_COLUMN,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PAGE_BG,
  SETTINGS_PRIMARY_BUTTON,
  SETTINGS_ROW_BUTTON,
} from "@/components/settings-shell";
import { cn } from "@/lib/utils";
import {
  appendReturnToQuery,
  stashLegalExplicitReturn,
  stashLegalNavigationReturn,
  stashReturnTarget,
} from "@/lib/return-navigation";

const PAYMENTS_FEATURE_ROW =
  "rounded-2xl border border-primary/36 bg-[#0A0A0A]/76 p-3 shadow-[0_0_20px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10 md:p-3.5";

const PROMOTE_PREVIEW_FROM_PAYMENTS = "/promote-preview?return=%2Faccount%2Fpayments";
const PAGE_META: Record<string, { titleKey: string; icon: React.ReactNode }> = {
  language: { titleKey: "language.title", icon: <Globe className="w-6 h-6" /> },
  privacy: { titleKey: "account_info.privacy.title", icon: <Shield className="w-6 h-6" /> },
  security: { titleKey: "account_info.security.title", icon: <Lock className="w-6 h-6" /> },
  payments: { titleKey: "payments.title", icon: <CreditCard className="w-6 h-6" /> },
  help: { titleKey: "account_info.help.title", icon: <HelpCircle className="w-6 h-6" /> },
  rate: { titleKey: "account_info.rate.title", icon: <Star className="w-6 h-6" /> },
  about: { titleKey: "account_info.about.title", icon: <Info className="w-6 h-6" /> },
};

export default function AccountInfoPage() {
  const { locale, setLocale } = useLocale();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/account/:slug");
  const slug = params?.slug ?? "";
  const page = PAGE_META[slug];
  const [rateValue, setRateValue] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [rateError, setRateError] = useState("");
  const [lastSubmittedRating, setLastSubmittedRating] = useState(0);
  const isPaymentsPage = slug === "payments";
  const isLanguagePage = slug === "language";
  if (!page) {
    return (
      <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
        <AccountHeader title={t("account_info.not_found_title")} />
        <div className={`${SETTINGS_MAIN_COLUMN} py-10 text-center text-muted-foreground`}>
          {t("account_info.not_found")}
        </div>
      </div>
    );
  }
  const languageBody = (
    <div className="space-y-3" dir={locale === "ar" ? "rtl" : "ltr"}>
      <p className="text-sm text-muted-foreground">{t("language.description")}</p>
      {([
        { code: "ar", label: t("language.option.ar") },
        { code: "en", label: t("language.option.en") },
        { code: "de", label: t("language.option.de") },
      ] as const).map((option) => (
        <button
          key={option.code}
          type="button"
          onClick={() => void setLocale(option.code)}
          className={`${SETTINGS_ROW_BUTTON} flex items-center justify-between ${
            locale === option.code
              ? "border-primary/40 bg-primary/[0.12] text-foreground shadow-[0_0_0_1px_rgba(182,227,86,0.1)]"
              : ""
          }`}
        >
          <span className="text-sm font-medium">{option.label}</span>
          {locale === option.code ? <CheckCircle2 className="w-4 h-4 text-primary" /> : null}
        </button>
      ))}
    </div>
  );
  const paymentsBody = (
    <div className="space-y-3.5" dir={locale === "ar" ? "rtl" : "ltr"}>
      <section className={SETTINGS_CARD}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_16px_-8px_hsl(var(--primary)/0.38)]">
            <CreditCard className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground md:text-base">{t("payments.title")}</h3>
            <p className="text-xs leading-relaxed text-zinc-400 md:text-sm">
              {t("payments.overview.l1")}
              <br />
              {t("payments.overview.l2")}
            </p>
          </div>
        </div>
      </section>

      <p
        className="rounded-2xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-amber-100/95 md:text-xs"
        role="note"
      >
        {t("payments.disclaimer_no_payments")}
      </p>

      <section className={SETTINGS_CARD}>
        <h3 className="mb-3 text-sm font-semibold text-foreground md:text-base">{t("payments.features.title")}</h3>
        <div className="space-y-2">
          {(
            [
              { id: "bump_once" as const, icon: <ArrowUpCircle className="h-5 w-5" strokeWidth={2.25} /> },
              { id: "highlight" as const, icon: <Sparkles className="h-5 w-5" strokeWidth={2.25} /> },
              { id: "daily" as const, icon: <TrendingUp className="h-5 w-5" strokeWidth={2.25} /> },
              { id: "top" as const, icon: <Pin className="h-5 w-5" strokeWidth={2.25} /> },
              { id: "gallery" as const, icon: <Images className="h-5 w-5" strokeWidth={2.25} /> },
              { id: "urgent" as const, icon: <Zap className="h-5 w-5" strokeWidth={2.25} /> },
            ] as const
          ).map((row) => (
            <div key={row.id} className={cn(PAYMENTS_FEATURE_ROW, "flex items-start gap-3")}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_14px_-8px_hsl(var(--primary)/0.35)]">
                {row.icon}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5 text-start">
                <p className="text-sm font-semibold leading-snug text-foreground">{t(`promote.feature.${row.id}.name`)}</p>
                <p className="text-[11px] leading-relaxed text-zinc-500 md:text-xs">{t(`promote.feature.${row.id}.desc`)}</p>
              </div>
            </div>
          ))}
          <div className={cn(PAYMENTS_FEATURE_ROW, "flex items-start gap-3")}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/45 bg-primary/10 text-primary shadow-[0_0_14px_-8px_hsl(var(--primary)/0.35)]">
              <Award className="h-5 w-5" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1 space-y-1 text-start">
              <p className="text-sm font-semibold leading-snug text-foreground">{t("payments.features.bundles_heading")}</p>
              <p className="text-[11px] leading-relaxed text-zinc-500 md:text-xs">{t("payments.features.bundles_line")}</p>
              <ul className="list-inside list-disc space-y-0.5 text-[11px] text-zinc-400 md:text-xs">
                <li>{t("promote.bundle.quick.name")}</li>
                <li>{t("promote.bundle.pro.name")}</li>
                <li>{t("promote.bundle.power.name")}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <section className={SETTINGS_CARD}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground md:text-base">{t("payments.methods.title")}</h3>
          <span className="shrink-0 rounded-full border border-primary/40 bg-[#0A0A0A]/90 px-2 py-0.5 text-[10px] font-semibold text-primary shadow-[0_0_10px_-6px_hsl(var(--primary)/0.3)]">
            {t("common.coming_soon")}
          </span>
        </div>
        <div className="space-y-2">
          {[t("payments.methods.visa_mc"), t("payments.methods.paypal")].map((method) => (
            <button
              key={method}
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-primary/25 bg-[#0A0A0A]/80 px-3 py-2.5 text-start text-sm font-medium text-zinc-500 opacity-80 shadow-[inset_0_0_0_1px_rgba(182,227,86,0.06)]"
            >
              {method}
            </button>
          ))}
        </div>
      </section>
      <section className={SETTINGS_CARD}>
        <h3 className="mb-2 text-sm font-semibold text-foreground md:text-base">{t("payments.transactions.title")}</h3>
        <div className="rounded-2xl border border-dashed border-primary/25 bg-[#0A0A0A]/70 px-4 py-6 text-center ring-1 ring-primary/10">
          <p className="text-sm font-medium text-foreground">{t("payments.transactions.empty")}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">{t("payments.transactions.subtext")}</p>
        </div>
      </section>
      <section
        className={cn(
          SETTINGS_CARD,
          "border-primary/40 bg-gradient-to-b from-primary/[0.12] to-[#0A0A0A]/90 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.22)] ring-1 ring-primary/14",
        )}
      >
        <h3 className="mb-1 text-sm font-semibold text-foreground md:text-base">{t("payments.promo.title")}</h3>
        <p className="mb-3 text-xs leading-relaxed text-zinc-500">{t("payments.promo.desc")}</p>
        <button
          type="button"
          onClick={() => navigate(PROMOTE_PREVIEW_FROM_PAYMENTS)}
          className="h-11 w-full rounded-2xl border border-primary/45 bg-primary/12 px-4 text-sm font-semibold text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)] transition hover:border-primary/55 hover:bg-primary/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] sm:w-auto sm:min-w-[200px]"
        >
          {t("payments.promo.button")}
        </button>
      </section>
    </div>
  );
  const rateBody = (
    <div className="space-y-4">
      <p className="leading-relaxed text-muted-foreground">
        {t("account_info.rate.p1_before")}
        <span className="font-bold text-primary">EU</span>
        {t("account_info.rate.p1_after")}
      </p>
      <div
        className={cn(
          SETTINGS_CARD_COMPACT,
          "space-y-4 border-primary/40 p-4 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.18)] md:p-5",
        )}
      >
        <div>
          <p className={`${SETTINGS_LABEL} mb-2 block`}>{t("account_info.rate.select")}</p>
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const index = i + 1;
              const active = index <= rateValue;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setRateValue(index);
                    setRateError("");
                    setSubmitted(false);
                  }}
                  aria-label={t("account_info.rate.star_aria", { count: index })}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-[#0A0A0A]/80 shadow-[0_0_14px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/10 transition-colors hover:border-primary/40 hover:bg-black/90"
                >
                  <Star
                    className={`h-[18px] w-[18px] ${active ? "fill-primary text-primary" : "text-zinc-500"}`}
                  />
                </button>
              );
            })}
          </div>
          {rateError ? (
            <p className="mt-2 text-xs text-destructive">{rateError}</p>
          ) : null}
        </div>
        <div>
          <p className={`${SETTINGS_LABEL} mb-2 block`}>{t("account_info.rate.feedback_optional")}</p>
          <textarea
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
              setSubmitted(false);
            }}
            placeholder={t("account_info.rate.feedback_placeholder")}
            className={`${SETTINGS_FIELD} min-h-[100px]`}
          />
        </div>
      </div>
      <div className={SETTINGS_ACTION_PANEL}>
        <button
          type="button"
          onClick={() => {
            if (rateValue === 0) {
              setRateError(t("account_info.rate.validation_required"));
              setSubmitted(false);
              return;
            }
            setRateError("");
            setLastSubmittedRating(rateValue);
            setRateValue(0);
            setFeedback("");
            setSubmitted(true);
          }}
          className={SETTINGS_PRIMARY_BUTTON}
        >
          {t("account_info.rate.submit")}
        </button>
      </div>
      {submitted ? (
        <div
          className={cn(
            SETTINGS_CARD_COMPACT,
            "border-primary/35 bg-primary/[0.07] p-4 text-foreground",
          )}
        >
          <p className="text-sm font-medium">{t("account_info.rate.success_submitted")}</p>
          {lastSubmittedRating === 5 ? (
            <button
              type="button"
              className={cn(SETTINGS_OUTLINE_BUTTON, "mt-3 !min-h-10 w-full py-2 text-xs sm:w-auto")}
            >
              {t("account_info.rate.google_play_cta")}
            </button>
          ) : null}
        </div>
      ) : null}
      <p
        className={cn(
          SETTINGS_CARD_COMPACT,
          "border-primary/25 bg-[#0A0A0A]/60 px-3 py-2.5 text-xs leading-relaxed text-zinc-500",
        )}
      >
        {t("account_info.rate.play_store_note")}
      </p>
    </div>
  );
  const defaultBodyBySlug: Record<string, React.ReactNode> = {
    privacy: (
      <>
        <p className="mb-3">{t("account_info.privacy.p1")}</p>
        <ul className="list-disc pr-5 space-y-2 text-muted-foreground">
          <li>{t("account_info.privacy.i1")}</li>
          <li>{t("account_info.privacy.i2")}</li>
          <li>{t("account_info.privacy.i3")}</li>
        </ul>
      </>
    ),
    security: (
      <>
        <p className="mb-3">{t("account_info.security.p1")}</p>
        <ul className="list-disc pr-5 space-y-2 text-muted-foreground">
          <li>{t("account_info.security.i1")}</li>
          <li>{t("account_info.security.i2")}</li>
          <li>{t("account_info.security.i3")}</li>
        </ul>
      </>
    ),
    help: (
      <>
        <p className="mb-3">{t("account_info.help.p1")}</p>
        <a href="mailto:souqarab.market@gmail.com" className="text-primary font-medium" dir="ltr">souqarab.market@gmail.com</a>
      </>
    ),
    rate: rateBody,
    about: (
      <div className="space-y-3.5" dir={locale === "ar" ? "rtl" : "ltr"}>
        <section className={SETTINGS_CARD}>
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.app_name_label")}</h3>
          <p className="text-sm text-foreground">{t("account_info.about.app_name_value")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("account_info.about.version_label")}: {APP_VERSION}</p>
        </section>

        <section className={SETTINGS_CARD}>
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.description_title")}</h3>
          <p className="text-sm text-muted-foreground">{t("account_info.about.description_body")}</p>
        </section>

        <section className={SETTINGS_CARD}>
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.offers_title")}</h3>
          <ul className="list-disc space-y-1.5 ps-5 text-sm text-muted-foreground">
            <li>{t("account_info.about.offers.post_ads")}</li>
            <li>{t("account_info.about.offers.browse_listings")}</li>
            <li>{t("account_info.about.offers.message_sellers")}</li>
            <li>{t("account_info.about.offers.save_favorites")}</li>
            <li>{t("account_info.about.offers.report_suspicious")}</li>
          </ul>
        </section>

        <section
          className={`${SETTINGS_CARD_COMPACT} border-primary/40 bg-primary/[0.07] md:p-4`}
        >
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">{t("account_info.about.safety_title")}</h3>
          <p className="text-sm text-foreground/90">{t("account_info.about.safety_body")}</p>
        </section>

        <section className={SETTINGS_CARD}>
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.region_title")}</h3>
          <p className="text-sm text-muted-foreground">{t("account_info.about.region_value")}</p>
        </section>

        <section className={SETTINGS_CARD}>
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.contact_title")}</h3>
          <a href="mailto:souqarab.market@gmail.com" className="text-primary font-medium" dir="ltr">
            souqarab.market@gmail.com
          </a>
        </section>

        <section className={SETTINGS_CARD}>
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.quick_links_title")}</h3>
          <div className="space-y-2">
            <button
              type="button"
              className={SETTINGS_ROW_BUTTON}
              onClick={() => {
                const back = `/account/${slug}`;
                stashLegalNavigationReturn(back);
                stashLegalExplicitReturn(back);
                stashReturnTarget(back);
                navigate(appendReturnToQuery("/terms", back));
              }}
            >
              {t("account_info.about.quick_links.terms")}
            </button>
            <button
              type="button"
              className={SETTINGS_ROW_BUTTON}
              onClick={() => {
                const back = `/account/${slug}`;
                stashLegalNavigationReturn(back);
                stashLegalExplicitReturn(back);
                stashReturnTarget(back);
                navigate(appendReturnToQuery("/privacy", back));
              }}
            >
              {t("account_info.about.quick_links.privacy")}
            </button>
            <button
              type="button"
              className={SETTINGS_ROW_BUTTON}
              onClick={() => {
                const back = `/account/${slug}`;
                stashLegalNavigationReturn(back);
                stashLegalExplicitReturn(back);
                stashReturnTarget(back);
                navigate(appendReturnToQuery("/account/help", back));
              }}
            >
              {t("account_info.about.quick_links.help")}
            </button>
          </div>
        </section>
      </div>
    ),
  };
  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t(page.titleKey)} />
      <div className={SETTINGS_MAIN_COLUMN}>
        {isPaymentsPage ? (
          <div className="text-sm leading-relaxed text-zinc-400">{paymentsBody}</div>
        ) : isLanguagePage ? (
          <div className={SETTINGS_CARD}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/80 text-primary shadow-[0_0_18px_-14px_hsl(var(--primary)/0.2)]">
              {page.icon}
            </div>
            <div className="text-sm leading-relaxed text-foreground">{languageBody}</div>
          </div>
        ) : (
          <div className={SETTINGS_CARD}>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-primary/35 bg-[#0A0A0A]/80 text-primary shadow-[0_0_18px_-14px_hsl(var(--primary)/0.2)]">
              {page.icon}
            </div>
            <div className="text-sm leading-relaxed text-muted-foreground [&_p]:text-muted-foreground [&_a]:text-primary">
              {defaultBodyBySlug[slug]}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
