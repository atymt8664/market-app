import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import {
  SETTINGS_BACK_BUTTON,
  SETTINGS_HEADER_BAR,
  SETTINGS_HUB_HEADER_INNER,
  SETTINGS_PAGE_TITLE,
} from "@/components/settings-shell";
import { navigateBackFromChild } from "@/lib/return-navigation";

export function AccountHeader({ title }: { title: string }) {
  const [, navigate] = useLocation();

  const handleBack = () => {
    navigateBackFromChild(navigate);
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
