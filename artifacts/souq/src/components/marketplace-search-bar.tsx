import { Search } from "lucide-react";
import { memo } from "react";
import { Input } from "@/components/ui/input";
import { SearchLocationPickerButton } from "@/components/search-location-picker-button";
import { useSearchLocation } from "@/hooks/use-search-location";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export type MarketplaceSearchBarProps = {
  isRtl: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  searchLabel?: string;
  autoFocus?: boolean;
  className?: string;
};

export const MarketplaceSearchBar = memo(function MarketplaceSearchBar({
  isRtl,
  value,
  onChange,
  onSubmit,
  placeholder,
  searchLabel,
  autoFocus,
  className,
}: MarketplaceSearchBarProps) {
  const { barLabel } = useSearchLocation();
  const resolvedPlaceholder = placeholder ?? t("home.search_placeholder");

  const locationBtn = <SearchLocationPickerButton className="h-8 w-8 shrink-0 sm:h-9 sm:w-9" />;
  const summary = barLabel ? (
    <span
      className="hidden max-w-[28%] shrink-0 truncate text-[10px] font-semibold text-primary min-[400px]:inline sm:max-w-[32%] sm:text-[11px]"
      title={barLabel}
    >
      {barLabel}
    </span>
  ) : null;

  const searchField = (
    <form
      onSubmit={onSubmit}
      className="relative min-h-9 min-w-0 flex-1"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <label className="sr-only">{searchLabel ?? t("home.search_label")}</label>
      <Search
        className="pointer-events-none absolute start-2.5 top-1/2 z-[1] h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-90"
        aria-hidden
      />
      <Input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoFocus={autoFocus}
        dir={isRtl ? "rtl" : "ltr"}
        placeholder={resolvedPlaceholder}
        className={cn(
          "h-9 w-full min-w-0 border-0 bg-transparent py-0 text-[13px] leading-tight text-foreground shadow-none",
          "placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0",
          "ps-9 pe-1.5",
          isRtl ? "text-right placeholder:text-right" : "text-left placeholder:text-left",
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );

  return (
    <div
      className={cn(
        "flex min-h-9 min-w-0 flex-1 items-center gap-1 rounded-2xl border border-primary/30 bg-[#0A0A0A]/75 py-0.5 pe-1 ps-1.5 ring-1 ring-primary/10",
        "transition-colors focus-within:border-primary/45 focus-within:ring-primary/15",
        className,
      )}
      role="search"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {isRtl ? (
        <>
          {searchField}
          {summary}
          {locationBtn}
        </>
      ) : (
        <>
          {locationBtn}
          {summary}
          {searchField}
        </>
      )}
    </div>
  );
});
