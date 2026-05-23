import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import {
  buildCityMapsSearchUrl,
  buildCityStaticMapUrl,
  resolveGermanCityCenter,
} from "@/lib/german-city-centers";

const locationCardShell =
  "w-full min-w-0 overflow-hidden rounded-2xl border border-primary/40 bg-zinc-950/75 shadow-[0_0_22px_-12px_hsl(var(--primary)/0.18)] ring-1 ring-primary/10";

const adHeaderBackBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-zinc-950/90 text-primary transition-colors hover:border-primary/65 hover:bg-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90";

export type AdDetailLocationCardProps = {
  city: string;
  className?: string;
};

function MapImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn("h-full w-full object-cover", className)}
    />
  );
}

export function AdDetailLocationCard({ city, className }: AdDetailLocationCardProps) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const cityTrim = city.trim();
  const center = useMemo(
    () => (cityTrim ? resolveGermanCityCenter(cityTrim) : null),
    [cityTrim],
  );
  const mapsUrl = cityTrim ? buildCityMapsSearchUrl(cityTrim, center) : "";
  const previewMapUrl = center ? buildCityStaticMapUrl(center, 640, 220) : null;
  const expandedMapUrl = center ? buildCityStaticMapUrl(center, 800, 420) : null;

  const rootRef = useRef<HTMLDivElement>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!previewMapUrl || !rootRef.current) return;
    const el = rootRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMapVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [previewMapUrl]);

  if (!cityTrim) {
    return (
      <div
        className={cn(
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

  const openMaps = () => {
    if (!mapsUrl) return;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div className={cn("min-w-0 space-y-1.5", className)} dir={isRtl ? "rtl" : "ltr"}>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex w-full items-center justify-end gap-2 px-0.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
          <span>{cityTrim}</span>
        </button>

        <div ref={rootRef} className="min-w-0">
          <button
            type="button"
            onClick={openMaps}
            className={cn(
              locationCardShell,
              "group relative block w-full overflow-hidden text-start transition-[border-color,box-shadow] hover:border-primary/55 hover:shadow-[0_0_26px_-10px_hsl(var(--primary)/0.28)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-95",
            )}
            aria-label={t("ad_detail.location.open_map_aria", { city: cityTrim })}
          >
            <div className="relative aspect-[2.4/1] max-h-[5.5rem] w-full min-h-[4.5rem] bg-zinc-900/90 sm:max-h-[6rem]">
              {previewMapUrl && mapVisible ? (
                <MapImage
                  src={previewMapUrl}
                  alt=""
                  aria-hidden
                />
              ) : (
                <div
                  className="absolute inset-0 animate-pulse bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900"
                  aria-hidden
                />
              )}
            </div>
          </button>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          hideClose
          side="bottom"
          className="flex max-h-[min(92dvh,720px)] flex-col gap-0 overflow-hidden rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20"
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-2.5 pt-3">
            <SheetTitle className="m-0 flex-1 text-start text-base font-semibold text-white">
              {cityTrim}
            </SheetTitle>
            <button
              type="button"
              className={adHeaderBackBtn}
              aria-label={t("common.back")}
              onClick={() => setSheetOpen(false)}
            >
              <ArrowRight
                className={cn("h-4 w-4", !isRtl && "rotate-180")}
                strokeWidth={2.25}
              />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <button
              type="button"
              onClick={openMaps}
              className={cn(
                locationCardShell,
                "block w-full overflow-hidden transition-[border-color,box-shadow] hover:border-primary/55 active:opacity-95",
              )}
              aria-label={t("ad_detail.location.open_map_aria", { city: cityTrim })}
            >
              {expandedMapUrl ? (
                <div className="relative aspect-[16/9] w-full min-h-[10rem] bg-zinc-900">
                  <MapImage src={expandedMapUrl} alt="" aria-hidden />
                </div>
              ) : (
                <div className="flex min-h-[10rem] items-center justify-center px-4 text-center text-sm text-muted-foreground">
                  {t("ad_detail.location.map_preview_unavailable")}
                </div>
              )}
            </button>
          </div>

          <div className="shrink-0 border-t border-primary/20 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              type="button"
              className="h-11 w-full rounded-full border border-primary/45 bg-zinc-950/80 text-base font-semibold text-primary shadow-[0_0_16px_-12px_hsl(var(--primary)/0.35)] hover:border-primary/60 hover:bg-zinc-900/90"
              onClick={openMaps}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {t("ad_detail.location.open_in_maps")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
