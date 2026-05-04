import { useLayoutEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useLocation, useSearch } from "wouter";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_HEADER_BAR,
  SETTINGS_HEADER_INNER,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";
import {
  getBrowserSearchRaw,
  navigateBackFromLegalPage,
  syncLegalExplicitFromCurrentUrl,
} from "@/lib/return-navigation";

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
    <header className={SETTINGS_HEADER_BAR} dir="rtl">
      <div className={SETTINGS_HEADER_INNER}>
        <h1 className={SETTINGS_PAGE_TITLE}>{title}</h1>
        <button type="button" onClick={handleBack} className={SETTINGS_BACK_BUTTON} aria-label="رجوع">
          <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>
    </header>
  );
}
