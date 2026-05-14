import { useCallback } from "react";
import { Redirect, useParams, useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
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
} from "@/components/settings-shell";

const SEGMENTS = ["personal", "premium", "professional", "trust"] as const;
type Segment = (typeof SEGMENTS)[number];

function isSegment(s: string | undefined): s is Segment {
  return !!s && (SEGMENTS as readonly string[]).includes(s);
}

function SegmentPageTitle({ segment }: { segment: Segment }) {
  switch (segment) {
    case "personal":
      return <h1 className={SETTINGS_PAGE_TITLE}>{t("pro_seller_page.segment.header.personal")}</h1>;
    case "premium":
      return <h1 className={SETTINGS_PAGE_TITLE}>{t("pro_seller_page.segment.header.premium")}</h1>;
    case "professional":
      return <h1 className={SETTINGS_PAGE_TITLE}>{t("pro_seller_page.segment.header.professional")}</h1>;
    case "trust":
      return <h1 className={SETTINGS_PAGE_TITLE}>{t("pro_seller_page.segment.header.trust")}</h1>;
    default:
      return <h1 className={SETTINGS_PAGE_TITLE}>{t("pro_seller_page.segment.header.personal")}</h1>;
  }
}

/** Shared plan-page typography (personal + premium) */
const PLAN_SECTION_LABEL = "mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500";

const PLAN_FEATURE_TILE =
  "rounded-xl border border-primary/28 bg-zinc-950/70 px-3 py-2.5 text-xs font-medium leading-snug text-foreground ring-1 ring-primary/10";

/** صفحة «الحساب الشخصي» — هيكل منتج جاهز للتوسع، بدون منطق دفع أو اشتراك */
function PersonalAccountPlanPage({ dir, textStart }: { dir: "rtl" | "ltr"; textStart: string }) {
  return (
    <>
      <section className={cn(SETTINGS_CARD, "p-3 md:p-4")} dir={dir}>
        <div className={cn("flex flex-wrap items-start justify-between gap-2", textStart)}>
          <h2 className="text-base font-bold leading-tight text-foreground md:text-lg">{t("pro_seller_page.personal.hero_title")}</h2>
          <span className="inline-flex shrink-0 items-center rounded-full border border-primary/45 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary md:text-[11px]">
            {t("pro_seller_page.personal.badge")}
          </span>
        </div>
        <p className={cn("mt-2 text-xs leading-relaxed text-muted-foreground md:text-sm", textStart)}>{t("pro_seller_page.personal.tagline")}</p>
      </section>

      <section className={cn(SETTINGS_CARD, "p-3 md:p-4")} dir={dir}>
        <h3 className={cn(PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.personal.section_includes")}</h3>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className={PLAN_FEATURE_TILE}>{t("pro_seller_page.personal.include.ads")}</div>
          <div className={PLAN_FEATURE_TILE}>{t("pro_seller_page.personal.include.browse")}</div>
          <div className={PLAN_FEATURE_TILE}>{t("pro_seller_page.personal.include.social")}</div>
          <div className={PLAN_FEATURE_TILE}>{t("pro_seller_page.personal.include.account")}</div>
        </div>
      </section>

      <section className={cn(SETTINGS_CARD, "p-3 md:p-4")} dir={dir}>
        <h3 className={cn(PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.personal.section_status")}</h3>
        <ul
          dir={dir}
          className={cn("mt-2 list-disc space-y-1.5 ps-4 text-xs leading-relaxed text-muted-foreground md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.personal.status.free")}</li>
          <li>{t("pro_seller_page.personal.status.no_subscription")}</li>
          <li>{t("pro_seller_page.personal.status.no_payment")}</li>
          <li>{t("pro_seller_page.personal.status.all_users")}</li>
        </ul>
      </section>

      <section className={cn(SETTINGS_CARD, "p-3 md:p-4")} dir={dir}>
        <h3 className={cn(PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.personal.section_future")}</h3>
        <p className={cn("mt-1 text-[11px] leading-relaxed text-zinc-500 md:text-xs", textStart)}>{t("pro_seller_page.personal.future_intro")}</p>
        <ul
          dir={dir}
          className={cn("mt-2 list-disc space-y-1 ps-4 text-xs leading-relaxed text-muted-foreground md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.personal.future.item_1")}</li>
          <li>{t("pro_seller_page.personal.future.item_2")}</li>
          <li>{t("pro_seller_page.personal.future.item_3")}</li>
        </ul>
      </section>

      <section className={cn(SETTINGS_CARD, "p-3 md:p-4")} dir={dir}>
        <Button
          type="button"
          disabled
          className="h-11 w-full cursor-default rounded-2xl border border-primary/48 bg-zinc-900/95 text-sm font-semibold text-primary shadow-[0_0_22px_-12px_hsl(var(--primary)/0.28)] ring-1 ring-primary/25 opacity-100 disabled:opacity-100"
        >
          {t("pro_seller_page.personal.cta_active")}
        </Button>
        <p className={cn("mt-2 text-[10px] leading-relaxed text-muted-foreground md:text-[11px]", textStart)}>{t("pro_seller_page.personal.footer")}</p>
      </section>
    </>
  );
}

/** Premium-only: أضيق من الشخصي، إطار أوضح، lime خفيف — لا تغيير على الشخصي */
const PREMIUM_PLAN_SECTION_LABEL =
  "mb-0.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary/75 md:mb-1 md:text-[11px]";

const PREMIUM_FEATURE_TILE =
  "rounded-xl border border-primary/34 bg-zinc-950/80 px-2.5 py-2 text-[11px] font-medium leading-snug text-foreground shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.05)] ring-1 ring-primary/14 md:px-3 md:py-2.5 md:text-xs";

const PREMIUM_PRICE_ROW =
  "flex flex-wrap items-baseline justify-between gap-1.5 rounded-xl border border-primary/28 bg-zinc-950/85 px-2.5 py-2 ring-1 ring-primary/12 md:px-3 md:py-2.5";

const PREMIUM_CARD_SHELL = cn(
  SETTINGS_CARD,
  "border-primary/48 p-2.5 shadow-[0_0_26px_-14px_hsl(var(--primary)/0.24)] ring-1 ring-primary/16 md:p-3.5",
);

const PREMIUM_HERO_SHELL = cn(
  PREMIUM_CARD_SHELL,
  "shadow-[0_0_34px_-12px_hsl(var(--primary)/0.32)] ring-primary/22",
);

/** Professional / متجر — أعلى من المميز بصريًا (glow أقوى، تركيز «أعمال») */
const PRO_PLAN_SECTION_LABEL =
  "mb-0.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/85 md:mb-1 md:text-[11px] md:tracking-[0.14em]";

const PRO_FEATURE_TILE =
  "rounded-xl border border-primary/40 bg-zinc-950/[0.82] px-2.5 py-2 text-[11px] font-medium leading-snug text-foreground shadow-[inset_0_1px_0_0_hsl(var(--primary)/0.07)] ring-1 ring-primary/18 md:px-3 md:py-2.5 md:text-xs";

const PRO_PRICE_ROW =
  "flex flex-wrap items-baseline justify-between gap-1.5 rounded-xl border border-primary/32 bg-zinc-950/88 px-2.5 py-2 ring-1 ring-primary/14 md:px-3 md:py-2.5";

const PRO_CARD_SHELL = cn(
  SETTINGS_CARD,
  "border-primary/52 p-2.5 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.3)] ring-1 ring-primary/20 md:p-3.5",
);

const PRO_HERO_SHELL = cn(
  PRO_CARD_SHELL,
  "border-t border-t-primary/40 pt-2.5 shadow-[0_0_44px_-10px_hsl(var(--primary)/0.4)] ring-primary/26 md:pt-3",
);

/** صفحة «الحساب المميز» — معاينة تسعير وتجهيز مستقبلي فقط، بدون دفع أو تفعيل */
function PremiumAccountPlanPage({ dir, textStart }: { dir: "rtl" | "ltr"; textStart: string }) {
  return (
    <>
      <section className={PREMIUM_HERO_SHELL} dir={dir}>
        <div className={cn("flex flex-wrap items-start justify-between gap-1.5", textStart)}>
          <h2 className="text-[1.05rem] font-bold leading-snug tracking-tight text-foreground md:text-lg">{t("pro_seller_page.premium.hero_title")}</h2>
          <span className="inline-flex shrink-0 items-center rounded-full border border-primary/55 bg-primary/[0.11] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.35)] md:px-2.5 md:text-[10px]">
            {t("pro_seller_page.premium.badge")}
          </span>
        </div>
        <p className={cn("mt-1.5 text-[13px] leading-relaxed text-muted-foreground md:text-sm", textStart)}>{t("pro_seller_page.premium.tagline")}</p>
      </section>

      <section className={PREMIUM_CARD_SHELL} dir={dir}>
        <h3 className={cn(PREMIUM_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.premium.section_may_include")}</h3>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
          <div className={PREMIUM_FEATURE_TILE}>{t("pro_seller_page.premium.include.visibility")}</div>
          <div className={PREMIUM_FEATURE_TILE}>{t("pro_seller_page.premium.include.tools")}</div>
          <div className={PREMIUM_FEATURE_TILE}>{t("pro_seller_page.premium.include.trust")}</div>
          <div className={PREMIUM_FEATURE_TILE}>{t("pro_seller_page.premium.include.priority")}</div>
          <div className={cn(PREMIUM_FEATURE_TILE, "sm:col-span-2")}>{t("pro_seller_page.premium.include.profile")}</div>
        </div>
      </section>

      <section className={PREMIUM_CARD_SHELL} dir={dir}>
        <h3 className={cn(PREMIUM_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.premium.section_pricing")}</h3>
        <p
          className={cn(
            "mt-1.5 rounded-lg border border-dashed border-primary/28 bg-primary/[0.045] px-2 py-1.5 text-[10px] leading-relaxed text-zinc-400 md:text-[11px]",
            textStart,
          )}
        >
          {t("pro_seller_page.premium.price_preview_banner")}
        </p>
        <div className="mt-1.5 space-y-1.5">
          <div className={cn(PREMIUM_PRICE_ROW, textStart)} dir={dir}>
            <span className="max-w-[58%] text-[11px] text-muted-foreground md:text-xs">{t("pro_seller_page.premium.price_monthly_label")}</span>
            <span className="text-sm font-semibold tabular-nums tracking-tight text-primary md:text-base">{t("pro_seller_page.premium.price_monthly_value")}</span>
          </div>
          <div className={cn(PREMIUM_PRICE_ROW, textStart)} dir={dir}>
            <span className="max-w-[58%] text-[11px] text-muted-foreground md:text-xs">{t("pro_seller_page.premium.price_yearly_label")}</span>
            <span className="text-sm font-semibold tabular-nums tracking-tight text-primary md:text-base">{t("pro_seller_page.premium.price_yearly_value")}</span>
          </div>
        </div>
        <p className={cn("mt-1.5 text-[10px] leading-relaxed text-zinc-500 md:text-[11px]", textStart)}>{t("pro_seller_page.premium.price_disclaimer")}</p>
      </section>

      <section className={PREMIUM_CARD_SHELL} dir={dir}>
        <h3 className={cn(PREMIUM_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.premium.section_status")}</h3>
        <ul
          dir={dir}
          className={cn("mt-1.5 list-disc space-y-1 ps-3.5 text-[11px] leading-relaxed text-muted-foreground md:space-y-1.5 md:ps-4 md:text-xs md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.premium.status.no_subscription")}</li>
          <li>{t("pro_seller_page.premium.status.no_charges")}</li>
          <li>{t("pro_seller_page.premium.status.free_today")}</li>
          <li>{t("pro_seller_page.premium.status.in_prep")}</li>
        </ul>
      </section>

      <section className={PREMIUM_CARD_SHELL} dir={dir}>
        <h3 className={cn(PREMIUM_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.premium.section_future")}</h3>
        <ul
          dir={dir}
          className={cn("mt-1.5 list-disc space-y-1 ps-3.5 text-[11px] leading-relaxed text-muted-foreground md:ps-4 md:text-xs md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.premium.future.item_1")}</li>
          <li>{t("pro_seller_page.premium.future.item_2")}</li>
          <li>{t("pro_seller_page.premium.future.item_3")}</li>
          <li>{t("pro_seller_page.premium.future.item_4")}</li>
        </ul>
      </section>

      <section className={PREMIUM_CARD_SHELL} dir={dir}>
        <Button
          type="button"
          disabled
          className="h-10 w-full cursor-default rounded-2xl border border-primary/52 bg-zinc-900/95 text-sm font-semibold text-primary/95 shadow-[0_0_28px_-14px_hsl(var(--primary)/0.38)] ring-1 ring-primary/28 opacity-100 disabled:opacity-100 md:h-11"
        >
          {t("pro_seller_page.premium.cta_disabled")}
        </Button>
        <p className={cn("mt-1.5 text-[10px] leading-relaxed text-muted-foreground md:text-[11px]", textStart)}>{t("pro_seller_page.premium.footer")}</p>
      </section>
    </>
  );
}

/** صفحة «الحساب الاحترافي» — متاجر ومحلات؛ تجهيز معماري فقط */
function ProfessionalAccountPlanPage({ dir, textStart }: { dir: "rtl" | "ltr"; textStart: string }) {
  return (
    <>
      <section className={PRO_HERO_SHELL} dir={dir}>
        <div className={cn("flex flex-wrap items-start justify-between gap-1.5", textStart)}>
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.08rem] font-bold leading-snug tracking-tight text-foreground md:text-xl">{t("pro_seller_page.pro_plan.hero_title")}</h2>
            <p className={cn("mt-1 text-[12px] font-medium leading-relaxed text-zinc-400 md:text-[13px]", textStart)}>
              {t("pro_seller_page.pro_plan.hero_subtitle")}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full border border-primary/60 bg-primary/[0.14] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-primary shadow-[0_0_16px_-5px_hsl(var(--primary)/0.45)] md:px-2.5 md:text-[10px]">
            {t("pro_seller_page.pro_plan.badge")}
          </span>
        </div>
      </section>

      <section className={PRO_CARD_SHELL} dir={dir}>
        <h3 className={cn(PRO_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.pro_plan.section_may_include")}</h3>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
          <div className={PRO_FEATURE_TILE}>{t("pro_seller_page.pro_plan.include.store_inline")}</div>
          <div className={PRO_FEATURE_TILE}>{t("pro_seller_page.pro_plan.include.shareable_storefront")}</div>
          <div className={PRO_FEATURE_TILE}>{t("pro_seller_page.pro_plan.include.pro_seller_badge")}</div>
          <div className={PRO_FEATURE_TILE}>{t("pro_seller_page.pro_plan.include.higher_ranking")}</div>
          <div className={PRO_FEATURE_TILE}>{t("pro_seller_page.pro_plan.include.ad_management")}</div>
          <div className={PRO_FEATURE_TILE}>{t("pro_seller_page.pro_plan.include.stats_future")}</div>
          <div className={PRO_FEATURE_TILE}>{t("pro_seller_page.pro_plan.include.support_priority")}</div>
          <div className={cn(PRO_FEATURE_TILE, "sm:col-span-2")}>{t("pro_seller_page.pro_plan.include.profile_store")}</div>
        </div>
      </section>

      <section className={PRO_CARD_SHELL} dir={dir}>
        <h3 className={cn(PRO_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.pro_plan.section_pricing")}</h3>
        <p
          className={cn(
            "mt-1.5 rounded-lg border border-dashed border-primary/32 bg-primary/[0.05] px-2 py-1.5 text-[10px] leading-relaxed text-zinc-400 md:text-[11px]",
            textStart,
          )}
        >
          {t("pro_seller_page.pro_plan.price_preview_banner")}
        </p>
        <div className="mt-1.5 space-y-1.5">
          <div className={cn(PRO_PRICE_ROW, textStart)} dir={dir}>
            <span className="max-w-[58%] text-[11px] text-muted-foreground md:text-xs">{t("pro_seller_page.pro_plan.price_monthly_label")}</span>
            <span className="text-sm font-semibold tabular-nums tracking-tight text-primary md:text-base">{t("pro_seller_page.pro_plan.price_monthly_value")}</span>
          </div>
          <div className={cn(PRO_PRICE_ROW, textStart)} dir={dir}>
            <span className="max-w-[58%] text-[11px] text-muted-foreground md:text-xs">{t("pro_seller_page.pro_plan.price_yearly_label")}</span>
            <span className="text-sm font-semibold tabular-nums tracking-tight text-primary md:text-base">{t("pro_seller_page.pro_plan.price_yearly_value")}</span>
          </div>
        </div>
        <p className={cn("mt-1.5 text-[10px] leading-relaxed text-zinc-500 md:text-[11px]", textStart)}>{t("pro_seller_page.pro_plan.price_disclaimer")}</p>
      </section>

      <section className={PRO_CARD_SHELL} dir={dir}>
        <h3 className={cn(PRO_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.pro_plan.section_status")}</h3>
        <ul
          dir={dir}
          className={cn("mt-1.5 list-disc space-y-1 ps-3.5 text-[11px] leading-relaxed text-muted-foreground md:space-y-1.5 md:ps-4 md:text-xs md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.pro_plan.status.no_subscription")}</li>
          <li>{t("pro_seller_page.pro_plan.status.no_charges")}</li>
          <li>{t("pro_seller_page.pro_plan.status.free_today")}</li>
          <li>{t("pro_seller_page.pro_plan.status.arch_prep")}</li>
        </ul>
      </section>

      <section className={PRO_CARD_SHELL} dir={dir}>
        <h3 className={cn(PRO_PLAN_SECTION_LABEL, textStart)}>{t("pro_seller_page.pro_plan.section_future")}</h3>
        <ul
          dir={dir}
          className={cn("mt-1.5 list-disc space-y-1 ps-3.5 text-[11px] leading-relaxed text-muted-foreground md:ps-4 md:text-xs md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.pro_plan.future.item_1")}</li>
          <li>{t("pro_seller_page.pro_plan.future.item_2")}</li>
          <li>{t("pro_seller_page.pro_plan.future.item_3")}</li>
          <li>{t("pro_seller_page.pro_plan.future.item_4")}</li>
          <li>{t("pro_seller_page.pro_plan.future.item_5")}</li>
          <li>{t("pro_seller_page.pro_plan.future.item_6")}</li>
          <li>{t("pro_seller_page.pro_plan.future.item_7")}</li>
        </ul>
      </section>

      <section className={PRO_CARD_SHELL} dir={dir}>
        <Button
          type="button"
          disabled
          className="h-10 w-full cursor-default rounded-2xl border border-primary/55 bg-zinc-900/95 text-sm font-semibold text-primary shadow-[0_0_32px_-14px_hsl(var(--primary)/0.42)] ring-1 ring-primary/30 opacity-100 disabled:opacity-100 md:h-11"
        >
          {t("pro_seller_page.pro_plan.cta_disabled")}
        </Button>
        <p className={cn("mt-1.5 text-[10px] leading-relaxed text-muted-foreground md:text-[11px]", textStart)}>{t("pro_seller_page.pro_plan.footer")}</p>
      </section>
    </>
  );
}

/** صفحة «درجة الثقة» — معلوماتية، خفيفة، بدون منطق احتساب */
const TRUST_SECTION_LABEL =
  "mb-0.5 px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-500 md:mb-1 md:text-[11px]";

const TRUST_SIGNAL_CARD =
  "rounded-xl border border-primary/26 bg-zinc-950/72 px-2.5 py-2 text-[11px] font-medium leading-snug text-foreground ring-1 ring-primary/10 md:text-xs";

const TRUST_CARD_SHELL = cn(
  SETTINGS_CARD,
  "border-primary/38 p-2.5 shadow-[0_0_20px_-14px_hsl(var(--primary)/0.18)] ring-1 ring-primary/12 md:p-3",
);

const TRUST_HERO_SHELL = cn(
  TRUST_CARD_SHELL,
  "shadow-[0_0_26px_-12px_hsl(var(--primary)/0.22)] ring-primary/15",
);

function TrustScorePlanPage({ dir, textStart }: { dir: "rtl" | "ltr"; textStart: string }) {
  return (
    <>
      <section className={TRUST_HERO_SHELL} dir={dir}>
        <div className={cn("flex flex-wrap items-start justify-between gap-1.5", textStart)}>
          <p className={cn("min-w-0 flex-1 text-[13px] font-medium leading-relaxed text-muted-foreground md:text-sm", textStart)}>
            {t("pro_seller_page.trust_plan.hero_subtitle")}
          </p>
          <span className="inline-flex shrink-0 items-center rounded-full border border-primary/45 bg-primary/[0.08] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary md:text-[10px]">
            {t("pro_seller_page.trust_plan.badge")}
          </span>
        </div>
      </section>

      <section className={TRUST_CARD_SHELL} dir={dir}>
        <h3 className={cn(TRUST_SECTION_LABEL, textStart)}>{t("pro_seller_page.trust_plan.section_how")}</h3>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
          <div className={TRUST_SIGNAL_CARD}>{t("pro_seller_page.trust_plan.signal.verify")}</div>
          <div className={TRUST_SIGNAL_CARD}>{t("pro_seller_page.trust_plan.signal.activity")}</div>
          <div className={TRUST_SIGNAL_CARD}>{t("pro_seller_page.trust_plan.signal.quality")}</div>
          <div className={TRUST_SIGNAL_CARD}>{t("pro_seller_page.trust_plan.signal.reports")}</div>
          <div className={TRUST_SIGNAL_CARD}>{t("pro_seller_page.trust_plan.signal.response")}</div>
          <div className={TRUST_SIGNAL_CARD}>{t("pro_seller_page.trust_plan.signal.ratings_future")}</div>
          <div className={cn(TRUST_SIGNAL_CARD, "sm:col-span-2")}>{t("pro_seller_page.trust_plan.signal.continuity")}</div>
        </div>
      </section>

      <section className={TRUST_CARD_SHELL} dir={dir}>
        <h3 className={cn(TRUST_SECTION_LABEL, textStart)}>{t("pro_seller_page.trust_plan.section_why")}</h3>
        <ul
          dir={dir}
          className={cn("mt-1.5 list-disc space-y-1 ps-3.5 text-[11px] leading-relaxed text-muted-foreground md:ps-4 md:text-xs md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.trust_plan.why.fake_accounts")}</li>
          <li>{t("pro_seller_page.trust_plan.why.trust_between")}</li>
          <li>{t("pro_seller_page.trust_plan.why.highlight_trusted")}</li>
          <li>{t("pro_seller_page.trust_plan.why.better_decision")}</li>
        </ul>
      </section>

      <section className={TRUST_CARD_SHELL} dir={dir}>
        <h3 className={cn(TRUST_SECTION_LABEL, textStart)}>{t("pro_seller_page.trust_plan.section_status")}</h3>
        <ul
          dir={dir}
          className={cn("mt-1.5 list-disc space-y-1 ps-3.5 text-[11px] leading-relaxed text-muted-foreground md:ps-4 md:text-xs md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.trust_plan.status.no_calculation")}</li>
          <li>{t("pro_seller_page.trust_plan.status.no_evaluation")}</li>
          <li>{t("pro_seller_page.trust_plan.status.arch_only")}</li>
          <li>{t("pro_seller_page.trust_plan.status.accounts_equal")}</li>
        </ul>
      </section>

      <section className={TRUST_CARD_SHELL} dir={dir}>
        <h3 className={cn(TRUST_SECTION_LABEL, textStart)}>{t("pro_seller_page.trust_plan.section_future")}</h3>
        <ul
          dir={dir}
          className={cn("mt-1.5 list-disc space-y-1 ps-3.5 text-[11px] leading-relaxed text-muted-foreground md:ps-4 md:text-xs md:text-sm", textStart)}
        >
          <li>{t("pro_seller_page.trust_plan.future.item_1")}</li>
          <li>{t("pro_seller_page.trust_plan.future.item_2")}</li>
          <li>{t("pro_seller_page.trust_plan.future.item_3")}</li>
          <li>{t("pro_seller_page.trust_plan.future.item_4")}</li>
          <li>{t("pro_seller_page.trust_plan.future.item_5")}</li>
        </ul>
      </section>

      <section className={TRUST_CARD_SHELL} dir={dir}>
        <Button
          type="button"
          disabled
          className="h-10 w-full cursor-default rounded-2xl border border-primary/48 bg-zinc-900/95 text-sm font-semibold text-primary/95 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.3)] ring-1 ring-primary/22 opacity-100 disabled:opacity-100 md:h-11"
        >
          {t("pro_seller_page.trust_plan.cta_disabled")}
        </Button>
        <p className={cn("mt-1.5 text-[10px] leading-relaxed text-muted-foreground md:text-[11px]", textStart)}>{t("pro_seller_page.trust_plan.footer")}</p>
      </section>
    </>
  );
}

export default function ProfessionalSellerPage() {
  const params = useParams<{ segment: string }>();
  const [, navigate] = useLocation();
  const { locale } = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const textStart = dir === "rtl" ? "text-right" : "text-left";

  const raw = params.segment;
  if (!isSegment(raw)) {
    return <Redirect to="/professional-seller/personal" />;
  }
  const segment: Segment = raw;

  const onBack = useCallback(() => {
    navigate("/profile");
  }, [navigate]);

  return (
    <div className={cn(SETTINGS_PAGE_BG, SETTINGS_IMMERSIVE_BOTTOM)} dir={dir}>
      <header className={SETTINGS_HEADER_BAR} dir="rtl">
        <div className={SETTINGS_HEADER_INNER}>
          <SegmentPageTitle segment={segment} />
          <button type="button" onClick={onBack} className={SETTINGS_BACK_BUTTON} aria-label={t("pro_seller_page.back_aria")}>
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </header>

      <div
        className={cn(
          SETTINGS_MAIN_COLUMN,
          segment === "premium" || segment === "professional" || segment === "trust" ? "gap-2 md:gap-2.5" : "gap-3",
        )}
      >
        {segment === "personal" ? (
          <PersonalAccountPlanPage dir={dir} textStart={textStart} />
        ) : segment === "premium" ? (
          <PremiumAccountPlanPage dir={dir} textStart={textStart} />
        ) : segment === "professional" ? (
          <ProfessionalAccountPlanPage dir={dir} textStart={textStart} />
        ) : (
          <TrustScorePlanPage dir={dir} textStart={textStart} />
        )}
      </div>
    </div>
  );
}
