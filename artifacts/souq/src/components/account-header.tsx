import { ArrowRight } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_HEADER_BAR,
  SETTINGS_HUB_HEADER_INNER,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";
import { navigateBackFromChild } from "@/lib/return-navigation";

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
    <header className={SETTINGS_HEADER_BAR} dir="rtl">
      <div className={SETTINGS_HUB_HEADER_INNER}>
        <h1 className={SETTINGS_PAGE_TITLE}>{title}</h1>
        <button type="button" onClick={handleBack} className={SETTINGS_BACK_BUTTON} aria-label="رجوع">
          <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>
    </header>
  );
}
