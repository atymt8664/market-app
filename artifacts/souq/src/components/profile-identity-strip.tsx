import { Link } from "wouter";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import { ProfileSegmentTabBar } from "@/components/profile-segment-tab-bar";
import {
  PROFILE_SECTION_HEADER,
  PROFILE_SECTION_LABEL,
  profileSectionClassName,
} from "@/components/profile-section-shell";

export type ProfilePlanTier = "personal" | "featured" | "professional" | "trust";

const PROFILE_PLAN_LEARN_MORE_HREF: Record<ProfilePlanTier, string> = {
  personal: "/professional-seller/personal",
  featured: "/professional-seller/premium",
  professional: "/professional-seller/professional",
  trust: "/professional-seller/trust",
};

const PROFILE_PLAN_TIERS: ProfilePlanTier[] = [
  "personal",
  "featured",
  "professional",
  "trust",
];

function planTierTabLabel(tier: ProfilePlanTier): string {
  switch (tier) {
    case "personal":
      return t("profile.plan_tier.tab.personal");
    case "featured":
      return t("profile.plan_tier.tab.featured");
    case "professional":
      return t("profile.plan_tier.tab.professional");
    case "trust":
      return t("profile.plan_tier.tab.trust");
    default:
      return t("profile.plan_tier.tab.personal");
  }
}

function planTierSummaryCopy(tier: ProfilePlanTier): { title: string; status: string } {
  switch (tier) {
    case "personal":
      return {
        title: t("profile.plan_tier.summary.personal.title"),
        status: t("profile.plan_tier.summary.personal.status"),
      };
    case "featured":
      return {
        title: t("profile.plan_tier.summary.featured.title"),
        status: t("profile.plan_tier.summary.featured.status"),
      };
    case "professional":
      return {
        title: t("profile.plan_tier.summary.professional.title"),
        status: t("profile.plan_tier.summary.professional.status"),
      };
    case "trust":
      return {
        title: t("profile.plan_tier.summary.trust.title"),
        status: t("profile.plan_tier.summary.trust.status"),
      };
    default:
      return {
        title: t("profile.plan_tier.summary.personal.title"),
        status: t("profile.plan_tier.summary.personal.status"),
      };
  }
}

type ProfileIdentityStripProps = {
  planTier: ProfilePlanTier;
  onPlanTierChange: (tier: ProfilePlanTier) => void;
  dir: "rtl" | "ltr";
  className?: string;
};

export function ProfileIdentityStrip({
  planTier,
  onPlanTierChange,
  dir,
  className,
}: ProfileIdentityStripProps) {
  const { title, status } = planTierSummaryCopy(planTier);

  const tierTabs = PROFILE_PLAN_TIERS.map((tier) => ({
    value: tier,
    label: planTierTabLabel(tier),
  }));

  return (
    <section
      dir={dir}
      className={profileSectionClassName(cn("overflow-hidden", className))}
      data-testid="profile-identity-strip"
    >
      <div className={cn(PROFILE_SECTION_HEADER, dir === "rtl" ? "text-right" : "text-left")}>
        <p className={PROFILE_SECTION_LABEL}>{t("profile.section.identity")}</p>
      </div>

      <ProfileSegmentTabBar
        tabs={tierTabs}
        value={planTier}
        onChange={onPlanTierChange}
        columns={4}
        ariaLabel={t("profile.plan_tier.nav_aria")}
      />

      <div
        className={cn(
          "flex min-h-8 flex-row items-center justify-between gap-1.5 px-2 py-1 md:px-2.5",
          dir === "rtl" ? "text-right" : "text-left",
        )}
      >
        <p className="min-w-0 flex-1 truncate text-[11px] leading-none md:text-xs">
          <span className="font-semibold text-foreground">{title}</span>
          <span className="mx-1 text-primary/35">·</span>
          <span className="font-medium text-primary/85">{status}</span>
        </p>
        <Link
          href={PROFILE_PLAN_LEARN_MORE_HREF[planTier]}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-primary/36 bg-[#0A0A0A]/82 px-1.5 py-0.5 text-[10px] font-semibold text-primary shadow-[0_0_12px_-10px_hsl(var(--primary)/0.14)] ring-1 ring-primary/12 transition-colors hover:border-primary/48 hover:bg-black/90 active:scale-[0.99] md:px-2 md:text-[11px]"
        >
          {t("pro_seller.entry_cta")}
        </Link>
      </div>
    </section>
  );
}
