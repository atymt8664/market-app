import { Eye, Megaphone, UserPlus, Users } from "lucide-react";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  PROFILE_SECTION_HEADER,
  PROFILE_SECTION_LABEL,
  profileSectionClassName,
} from "@/components/profile-section-shell";

type ProfileMetricsBandProps = {
  adCount: number;
  profileViews: number;
  followerCount: number;
  followingCount: number;
  numberLocale: string;
  dir: "rtl" | "ltr";
  onFollowersClick: () => void;
  onFollowingClick: () => void;
  onViewsClick: () => void;
  className?: string;
};

const heroCell =
  "flex min-h-[3.25rem] flex-col items-center justify-center gap-px px-2 py-1 md:min-h-[3.5rem] md:py-1.5";

const secondaryMetricBtn =
  "inline-flex min-h-7 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-transparent px-1.5 py-0.5 text-[11px] transition-colors hover:border-primary/24 hover:bg-black/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 md:gap-1.5 md:text-xs";

export function ProfileMetricsBand({
  adCount,
  profileViews,
  followerCount,
  followingCount,
  numberLocale,
  dir,
  onFollowersClick,
  onFollowingClick,
  onViewsClick,
  className,
}: ProfileMetricsBandProps) {
  const adsFormatted = adCount.toLocaleString(numberLocale);
  const viewsFormatted = profileViews.toLocaleString(numberLocale);
  const followersFormatted = followerCount.toLocaleString(numberLocale);
  const followingFormatted = followingCount.toLocaleString(numberLocale);

  return (
    <section
      dir={dir}
      className={profileSectionClassName(cn("overflow-hidden", className))}
      data-testid="profile-metrics-band"
    >
      <div className={cn(PROFILE_SECTION_HEADER, dir === "rtl" ? "text-right" : "text-left")}>
        <p className={PROFILE_SECTION_LABEL}>{t("profile.section.metrics")}</p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-primary/20 rtl:divide-x-reverse">
        <div className={cn(heroCell, "select-none")}>
          <p className="inline-flex items-center gap-1 text-lg font-bold tabular-nums leading-none text-primary md:text-xl">
            <Megaphone className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
            {adsFormatted}
          </p>
          <p className="text-[11px] font-medium text-foreground md:text-xs">
            {t("profile.stats.ads")}
          </p>
        </div>

        <button
          type="button"
          onClick={onViewsClick}
          aria-label={`${t("profile.stats.views")}: ${viewsFormatted}`}
          className={cn(
            heroCell,
            "transition-colors hover:bg-black/35 active:scale-[0.99]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35",
          )}
        >
          <p className="inline-flex items-center gap-1 text-lg font-bold tabular-nums leading-none text-primary md:text-xl">
            <Eye className="h-3 w-3 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
            {viewsFormatted}
          </p>
          <p className="text-[11px] font-medium text-foreground md:text-xs">
            {t("profile.stats.views")}
          </p>
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-primary/20 border-t border-primary/20 rtl:divide-x-reverse">
        <button
          type="button"
          onClick={onFollowersClick}
          aria-label={`${t("profile.stats.followers")}: ${followersFormatted}`}
          className={cn(secondaryMetricBtn, dir === "rtl" ? "flex-row-reverse" : "flex-row")}
        >
          <UserPlus className="h-3 w-3 shrink-0 text-primary/85" strokeWidth={2.25} aria-hidden />
          <span className="font-bold tabular-nums text-primary">{followersFormatted}</span>
          <span className="truncate text-foreground">{t("profile.stats.followers")}</span>
        </button>
        <button
          type="button"
          onClick={onFollowingClick}
          aria-label={`${t("profile.stats.following")}: ${followingFormatted}`}
          className={cn(secondaryMetricBtn, dir === "rtl" ? "flex-row-reverse" : "flex-row")}
        >
          <Users className="h-3 w-3 shrink-0 text-primary/85" strokeWidth={2.25} aria-hidden />
          <span className="font-bold tabular-nums text-primary">{followingFormatted}</span>
          <span className="truncate text-foreground">{t("profile.stats.following")}</span>
        </button>
      </div>
    </section>
  );
}
