import { ChevronDown, MapPin } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useSelectedCity } from "@/hooks/use-selected-city";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const LocationPickerPanel = lazy(() =>
  import("./location-picker-panel").then((mod) => ({
    default: mod.LocationPickerPanel,
  })),
);

function prefetchLocationPickerPanel(): void {
  void import("./location-picker-panel");
}

export function LocationPicker({
  triggerClassName,
}: {
  triggerClassName?: string;
} = {}) {
  const { displayLabel } = useSelectedCity();
  const [open, setOpen] = useState(false);
  const [panelMounted, setPanelMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ric = window.requestIdleCallback as
      | ((cb: IdleRequestCallback, opts?: IdleRequestOptions) => number)
      | undefined;
    const id = ric
      ? ric(() => prefetchLocationPickerPanel(), { timeout: 3500 })
      : window.setTimeout(prefetchLocationPickerPanel, 3500);
    return () => {
      if (ric) window.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
    };
  }, []);

  const handleOpen = useCallback(() => {
    setPanelMounted(true);
    setOpen(true);
  }, []);

  const triggerLabel = displayLabel ?? t("location_picker.trigger");

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={t("location_picker.aria")}
        aria-expanded={open}
        className={cn(
          "flex max-w-[min(100%,12rem)] items-center gap-1 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.06] px-2 py-1.5 text-[11px] font-semibold text-primary shadow-[0_0_12px_-10px_hsl(var(--primary)/0.22)] ring-1 ring-primary/10 transition-all active:scale-[0.98]",
          triggerClassName,
          displayLabel && "border-primary/35 bg-primary/[0.08]",
        )}
      >
        <MapPin className="h-3 w-3 shrink-0 opacity-85" aria-hidden />
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-75" aria-hidden />
      </button>

      {panelMounted ? (
        <Suspense fallback={null}>
          <LocationPickerPanel open={open} onOpenChange={setOpen} />
        </Suspense>
      ) : null}
    </>
  );
}
