import { MapPin } from "lucide-react";
import { useCallback, useState } from "react";
import { SearchLocationPickerPanel } from "@/components/search-location-picker-panel";
import { useSearchLocation } from "@/hooks/use-search-location";
import {
  marketplaceHeaderIconButtonActiveClass,
  marketplaceHeaderIconButtonClass,
} from "@/lib/marketplace-icon-button-styles";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

export function SearchLocationPickerButton({
  className,
}: {
  className?: string;
} = {}) {
  const { barLabel, hasLocation } = useSearchLocation();
  const [open, setOpen] = useState(false);

  const handleOpen = useCallback(() => {
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

      <SearchLocationPickerPanel open={open} onOpenChange={setOpen} />
    </>
  );
}
