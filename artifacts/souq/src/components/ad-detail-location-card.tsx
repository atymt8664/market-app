/**
 * Ad detail location card (P3) — interactive in-card map; external maps via dedicated button only.
 */
import { lazy, memo, Suspense, useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  resolveAdCityCenter,
  type AdCityCenter,
} from "@/lib/ad-city-center";
import { openExternalMaps } from "@/lib/external-maps-links";

const AdDetailInteractiveMap = lazy(() =>
  import("@/components/ad-detail-interactive-map").then((m) => ({
    default: m.AdDetailInteractiveMap,
  })),
);

const locationCardShell =
  "w-full min-w-0 overflow-hidden rounded-2xl border border-primary/40 bg-[#0A0A0A]/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

const sectionHeading =
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-[#0A0A0A]/80 px-2 py-px text-sm font-semibold leading-tight tracking-tight text-foreground shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 bg-[#0A0A0A]/70";

export type AdDetailLocationCardProps = {
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string | null;
  className?: string;
  /** Matches ad-detail section card styling when embedded in page shell */
  sectionShellClassName?: string;
  /** When a modal/sheet overlays the page, suppress map compositor bleed-through. */
  overlayActive?: boolean;
};

function AdDetailLocationCardInner({
  city,
  latitude,
  longitude,
  countryCode = "DE",
  className,
  sectionShellClassName,
  overlayActive = false,
}: AdDetailLocationCardProps) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const cityTrim = city.trim();
  const country = countryCode?.trim().toUpperCase() || "DE";

  const [center, setCenter] = useState<AdCityCenter | null>(null);
  const [centerLoading, setCenterLoading] = useState(!!cityTrim);

  useEffect(() => {
    if (!cityTrim) {
      setCenter(null);
      setCenterLoading(false);
      return;
    }

    let cancelled = false;
    setCenterLoading(true);
    void resolveAdCityCenter({
      city: cityTrim,
      latitude,
      longitude,
      countryCode: country,
    }).then((resolved) => {
      if (cancelled) return;
      setCenter(resolved);
      setCenterLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cityTrim, latitude, longitude, country]);

  const openExternal = useCallback(() => {
    if (!center) return;
    openExternalMaps(center.lat, center.lng, cityTrim);
  }, [center, cityTrim]);

  if (!cityTrim) {
    return (
      <div
        className={cn(
          sectionShellClassName,
          locationCardShell,
          "flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground",
          className,
        )}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <MapPin className="h-4 w-4 shrink-0 text-primary/80" strokeWidth={2.25} />
        <span>{t("ad_detail.location.unavailable")}</span>
      </div>
    );
  }

  return (
    <section
      className={cn(sectionShellClassName, "space-y-2.5 text-sm", className)}
      dir={isRtl ? "rtl" : "ltr"}
      aria-label={t("ad_detail.location.section_title")}
    >
      <span className={sectionHeading}>{t("ad_detail.location.section_title")}</span>

      <div
        className={cn(
          locationCardShell,
          "transition-[border-color,box-shadow] hover:border-primary/55 hover:shadow-[0_0_26px_-10px_hsl(var(--primary)/0.28)]",
        )}
      >
        <div className="flex items-center gap-2 border-b border-primary/15 px-3 py-2.5">
          <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
          <span className="truncate text-sm font-medium text-foreground">{cityTrim}</span>
        </div>

        <div
          className={cn(
            "relative z-0 aspect-[16/10] min-h-[11rem] w-full max-h-[220px] bg-[#0A0A0A]/90 sm:min-h-[12.5rem]",
            overlayActive && "pointer-events-none [&_.leaflet-container]:invisible",
          )}
          aria-hidden={overlayActive || undefined}
        >
          {centerLoading ? (
            <div
              className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900"
              aria-hidden
            />
          ) : center ? (
            <Suspense
              fallback={
                <div
                  className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900"
                  aria-hidden
                />
              }
            >
              <AdDetailInteractiveMap
                lat={center.lat}
                lng={center.lng}
                city={cityTrim}
                onOpenExternal={openExternal}
              />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
              {t("ad_detail.location.map_preview_unavailable")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export const AdDetailLocationCard = memo(AdDetailLocationCardInner);
AdDetailLocationCard.displayName = "AdDetailLocationCard";
