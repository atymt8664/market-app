import { AccountHeader } from "@/components/account-header";
import {
  ArrowUpCircle,
  BadgeDollarSign,
  CreditCard,
  Globe,
  HelpCircle,
  Info,
  Lock,
  Pin,
  Rocket,
  Shield,
  Star,
  CheckCircle2,
} from "lucide-react";
import { Link, useRoute } from "wouter";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import { useState } from "react";
import { APP_VERSION } from "@/lib/app-config";

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
      <div className="flex flex-col w-full min-h-[100dvh] bg-background">
        <AccountHeader title={t("account_info.not_found_title")} />
        <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-6 text-center text-muted-foreground">
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
          onClick={() => setLocale(option.code)}
          className={`w-full rounded-xl border px-3 py-3 flex items-center justify-between transition ${
            locale === option.code
              ? "border-primary/40 bg-primary/10 text-foreground"
              : "border-border/70 bg-background/40 text-foreground hover:bg-muted/40"
          }`}
        >
          <span className="text-sm font-medium">{option.label}</span>
          {locale === option.code ? <CheckCircle2 className="w-4 h-4 text-primary" /> : null}
        </button>
      ))}
    </div>
  );
  const paymentsBody = (
    <div className="space-y-3.5">
      <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">
            <CreditCard className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm md:text-base font-semibold text-foreground">{t("payments.title")}</h3>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {t("payments.overview.l1")}
              <br />
              {t("payments.overview.l2")}
            </p>
          </div>
        </div>
      </section>
      <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
        <h3 className="text-sm md:text-base font-semibold text-foreground mb-3">{t("payments.features.title")}</h3>
        <div className="space-y-2">
          {[
            { icon: <Rocket className="h-4 w-4" />, title: t("payments.features.boost.title"), desc: t("payments.features.boost.desc") },
            { icon: <Pin className="h-4 w-4" />, title: t("payments.features.pin.title"), desc: t("payments.features.pin.desc") },
            { icon: <ArrowUpCircle className="h-4 w-4" />, title: t("payments.features.top.title"), desc: t("payments.features.top.desc") },
            { icon: <BadgeDollarSign className="h-4 w-4" />, title: t("payments.features.packages.title"), desc: t("payments.features.packages.desc") },
          ].map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 flex items-start gap-3">
              <div className="h-8 w-8 shrink-0 rounded-lg border border-primary/20 bg-primary/10 text-primary flex items-center justify-center">{feature.icon}</div>
              <div>
                <p className="text-sm font-medium text-foreground">{feature.title}</p>
                <p className="text-xs text-muted-foreground">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm md:text-base font-semibold text-foreground">{t("payments.methods.title")}</h3>
          <span className="rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[11px] text-muted-foreground">{t("common.coming_soon")}</span>
        </div>
        <div className="space-y-2">
          {["Visa / Mastercard", "PayPal"].map((method) => (
            <button key={method} type="button" disabled className="w-full rounded-xl border border-border/50 bg-background/30 px-3 py-2.5 text-right text-sm text-muted-foreground opacity-70 cursor-not-allowed">
              {method}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
        <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("payments.transactions.title")}</h3>
        <div className="rounded-xl border border-dashed border-border/60 bg-background/35 px-4 py-6 text-center">
          <p className="text-sm font-medium text-foreground">{t("payments.transactions.empty")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("payments.transactions.subtext")}</p>
        </div>
      </section>
      <section className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/10 to-card/75 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
        <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">{t("payments.promo.title")}</h3>
        <p className="text-xs text-muted-foreground mb-3">{t("payments.promo.desc")}</p>
        <button type="button" disabled className="h-10 w-full sm:w-auto sm:min-w-[180px] rounded-xl border border-primary/30 bg-background/40 px-4 text-sm font-medium text-muted-foreground cursor-not-allowed opacity-75">
          {t("payments.promo.button")}
        </button>
      </section>
    </div>
  );
  const rateBody = (
    <div className="space-y-3.5">
      <>
        <p>{t("account_info.rate.p1")}</p>
        <div>
          <p className="mb-2 text-xs text-muted-foreground">{t("account_info.rate.select")}</p>
          <div className="flex items-center gap-1.5">
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
                  className="h-9 w-9 rounded-full border border-border/60 bg-background/40 flex items-center justify-center hover:bg-muted/50 transition-colors"
                >
                  <Star
                    className={`h-4 w-4 ${active ? "text-primary fill-primary" : "text-muted-foreground"}`}
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
          <p className="mb-2 text-xs text-muted-foreground">{t("account_info.rate.feedback_optional")}</p>
          <textarea
            value={feedback}
            onChange={(e) => {
              setFeedback(e.target.value);
              setSubmitted(false);
            }}
            placeholder={t("account_info.rate.feedback_placeholder")}
            className="min-h-[100px] w-full rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>
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
          className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-black"
        >
          {t("account_info.rate.submit")}
        </button>
        {submitted ? (
          <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-3">
            <p className="text-sm font-medium text-foreground">
              {t("account_info.rate.success_submitted")}
            </p>
            {lastSubmittedRating === 5 ? (
              <button
                type="button"
                className="mt-2 h-9 rounded-xl border border-primary/30 bg-background/40 px-3 text-xs font-medium text-primary"
              >
                {t("account_info.rate.google_play_cta")}
              </button>
            ) : null}
          </div>
        ) : null}
        <p className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2 text-xs text-muted-foreground">
          {t("account_info.rate.play_store_note")}
        </p>
      </>
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
        <a href="mailto:support@souq-arab.de" className="text-primary font-medium" dir="ltr">support@souq-arab.de</a>
      </>
    ),
    rate: rateBody,
    about: (
      <div className="space-y-3.5" dir={locale === "ar" ? "rtl" : "ltr"}>
        <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.app_name_label")}</h3>
          <p className="text-sm text-foreground">{t("account_info.about.app_name_value")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("account_info.about.version_label")}: {APP_VERSION}</p>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.description_title")}</h3>
          <p className="text-sm text-muted-foreground">{t("account_info.about.description_body")}</p>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.offers_title")}</h3>
          <ul className="list-disc space-y-1.5 ps-5 text-sm text-muted-foreground">
            <li>{t("account_info.about.offers.post_ads")}</li>
            <li>{t("account_info.about.offers.browse_listings")}</li>
            <li>{t("account_info.about.offers.message_sellers")}</li>
            <li>{t("account_info.about.offers.save_favorites")}</li>
            <li>{t("account_info.about.offers.report_suspicious")}</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-1">{t("account_info.about.safety_title")}</h3>
          <p className="text-sm text-foreground/90">{t("account_info.about.safety_body")}</p>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.region_title")}</h3>
          <p className="text-sm text-muted-foreground">{t("account_info.about.region_value")}</p>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.contact_title")}</h3>
          <a href="mailto:souqarab.market@gmail.com" className="text-primary font-medium" dir="ltr">
            souqarab.market@gmail.com
          </a>
        </section>

        <section className="rounded-2xl border border-primary/20 bg-card/70 p-4 shadow-[0_0_0_1px_rgba(182,227,86,0.05),0_8px_20px_-14px_rgba(182,227,86,0.35)]">
          <h3 className="text-sm md:text-base font-semibold text-foreground mb-2">{t("account_info.about.quick_links_title")}</h3>
          <div className="space-y-2">
            <Link href="/terms" className="block rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
              {t("account_info.about.quick_links.terms")}
            </Link>
            <Link href="/privacy" className="block rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
              {t("account_info.about.quick_links.privacy")}
            </Link>
            <Link href="/account/help" className="block rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
              {t("account_info.about.quick_links.help")}
            </Link>
          </div>
        </section>
      </div>
    ),
  };
  return (
    <div className="flex flex-col w-full min-h-[100dvh] bg-background pb-8">
      <AccountHeader title={t(page.titleKey)} />
      <div className="mx-auto w-full max-w-[900px] md:max-w-[760px] lg:max-w-[860px] px-4 md:px-6 py-5">
        {isPaymentsPage ? (
          <div className="text-sm leading-relaxed">{paymentsBody}</div>
        ) : isLanguagePage ? (
          <div className="bg-card/70 rounded-2xl border border-border p-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              {page.icon}
            </div>
            <div className="text-sm leading-relaxed">{languageBody}</div>
          </div>
        ) : (
          <div className="bg-card/70 rounded-2xl border border-border p-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              {page.icon}
            </div>
            <div className="text-sm leading-relaxed">{defaultBodyBySlug[slug]}</div>
          </div>
        )}
      </div>
    </div>
  );
}
