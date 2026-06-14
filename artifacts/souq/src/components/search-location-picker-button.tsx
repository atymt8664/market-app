import { MapPin } from "lucide-react";
import { lazy, Suspense, useCallback, useState } from "react";
import { useSearchLocation } from "@/hooks/use-search-location";
import {
  marketplaceHeaderIconButtonActiveClass,
  marketplaceHeaderIconButtonClass,
} from "@/lib/marketplace-icon-button-styles";
import { ensureFullLocaleForInteraction, t } from "@/i18n";
import { cn } from "@/lib/utils";

/** P7-PR-1: defer Leaflet + picker sheet until first tap — keeps Home cold path lean. */
const SearchLocationPickerPanel = lazy(() =>
  import("@/components/search-location-picker-panel").then((m) => ({
    default: m.SearchLocationPickerPanel,
  })),
);

export function SearchLocationPickerButton({
  className,
}: {
  className?: string;
} = {}) {
  const { barLabel, hasLocation } = useSearchLocation();
  const [open, setOpen] = useState(false);
  /** Load picker chunk once on first open; keep mounted so repeat opens stay instant. */
  const [pickerMounted, setPickerMounted] = useState(false);

  const handleOpen = useCallback(() => {
    ensureFullLocaleForInteraction();
    setPickerMounted(true);
    setOpen(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={barLabel ?? t("search_location.open_picker")}
        aria-expanded={open}
        title={barLabel ?? undefined}
        className={cn(
          marketplaceHeaderIconButtonClass,
          hasLocation && marketplaceHeaderIconButtonActiveClass,
          className,
        )}
      >
        <MapPin className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>

      {pickerMounted ? (
        <Suspense fallback={null}>
          <SearchLocationPickerPanel open={open} onOpenChange={setOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
