/**
 * Ad detail location card (P3) — interactive in-card map, external maps on tap.
 */
import { lazy, memo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
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
  "w-full min-w-0 overflow-hidden rounded-2xl border border-primary/40 bg-zinc-950/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

const sectionHeading =
  "inline-flex max-w-full w-fit items-center rounded-2xl border border-primary/35 bg-card/80 px-2 py-px text-sm font-semibold leading-tight tracking-tight text-foreground shadow-[0_0_14px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10 dark:bg-zinc-950/70";

export type AdDetailLocationCardProps = {
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  countryCode?: string | null;
  className?: string;
  /** Matches ad-detail section card styling when embedded in page shell */
  sectionShellClassName?: string;
};

function AdDetailLocationCardInner({
  city,
  latitude,
  longitude,
  countryCode,
  className,
  sectionShellClassName,
}: AdDetailLocationCardProps) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const cityTrim = city.trim();

  const rootRef = useRef<HTMLDivElement>(null);
  const [mapVisible, setMapVisible] = useState(false);
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
      countryCode,
    }).then((resolved) => {
      if (cancelled) return;
      setCenter(resolved);
      setCenterLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [cityTrim, latitude, longitude, countryCode]);

  useEffect(() => {
    if (!center || !rootRef.current) return;
    const el = rootRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMapVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "160px 0px", threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [center]);

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
        ref={rootRef}
        className={cn(
          locationCardShell,
          "transition-[border-color,box-shadow] hover:border-primary/55 hover:shadow-[0_0_26px_-10px_hsl(var(--primary)/0.28)]",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-primary/15 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
            <span className="truncate">{cityTrim}</span>
          </div>
          {center ? (
            <button
              type="button"
              onClick={openExternal}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-primary/35 bg-zinc-950/80 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:border-primary/55 hover:bg-zinc-900/90"
              aria-label={t("ad_detail.location.open_in_maps")}
            >
              <ExternalLink className="h-3 w-3" strokeWidth={2.25} />
              <span className="hidden sm:inline">{t("ad_detail.location.open_in_maps")}</span>
            </button>
          ) : null}
        </div>

        <div className="relative aspect-[16/10] min-h-[11rem] w-full max-h-[220px] bg-zinc-900/90 sm:min-h-[12.5rem]">
          {centerLoading ? (
            <div
              className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900"
              aria-hidden
            />
          ) : center && mapVisible ? (
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
                className="absolute inset-0"
                onCardTap={openExternal}
              />
            </Suspense>
          ) : center ? (
            <div
              className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900"
              aria-hidden
            />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
              {t("ad_detail.location.map_preview_unavailable")}
            </div>
          )}
        </div>

        <p className="border-t border-primary/10 px-3 py-2 text-[10px] leading-snug text-muted-foreground">
          {t("ad_detail.location.privacy_hint")}
          {center ? (
            <>
              {" "}
              · {t("ad_detail.location.tap_map_hint")}
            </>
          ) : null}
        </p>
      </div>
    </section>
  );
}

export const AdDetailLocationCard = memo(AdDetailLocationCardInner);
AdDetailLocationCard.displayName = "AdDetailLocationCard";
