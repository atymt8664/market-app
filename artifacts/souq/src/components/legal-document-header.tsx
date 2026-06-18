import { useLayoutEffect } from "react";
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
import {
  getBrowserSearchRaw,
  navigateBackFromLegalPage,
  syncLegalExplicitFromCurrentUrl,
} from "@/lib/return-navigation";
import { platformHeaderDomProps } from "@/lib/platform-header-safe-area";

type LegalDocumentHeaderProps = {
  title: string;
};

export function LegalDocumentHeader({ title }: LegalDocumentHeaderProps) {
  const [pathname, navigate] = useLocation();
  const search = useSearch();

  useLayoutEffect(() => {
    syncLegalExplicitFromCurrentUrl();
  }, [pathname, search]);

  const handleBack = () => {
    navigateBackFromLegalPage(navigate, getBrowserSearchRaw(), "/settings");
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
