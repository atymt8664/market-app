import { ArrowRight } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_ACTION_ICON,
  SETTINGS_HEADER_TRAILING,
  SETTINGS_HUB_HEADER_INNER,
  SETTINGS_PAGE_TITLE,
  SETTINGS_PAGE_TITLE_BADGE,
} from "@/components/settings-shell";
import { navigateBackFromChild } from "@/lib/return-navigation";
import { platformHeaderDomProps } from "@/lib/platform-header-safe-area";

export function AccountHeader({
  title,
  backFallback,
}: {
  title: string;
  /** Used when returnTo is absent — e.g. security subpages default to /account/security */
  backFallback?: string;
}) {
  const [, navigate] = useLocation();
  const search = useSearch();

  const handleBack = () => {
    navigateBackFromChild(navigate, { search, fallback: backFallback });
  };

  return (
    <header className={SETTINGS_HEADER_BAR} dir="rtl" {...platformHeaderDomProps()}>
      <div className={SETTINGS_HUB_HEADER_INNER}>
        <h1 className={SETTINGS_PAGE_TITLE}>
          <span className={SETTINGS_PAGE_TITLE_BADGE}>{title}</span>
        </h1>
        <div className={SETTINGS_HEADER_TRAILING}>
          <button type="button" onClick={handleBack} className={SETTINGS_BACK_BUTTON} aria-label="رجوع">
            <ArrowRight className={SETTINGS_HEADER_ACTION_ICON} strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </header>
  );
}
