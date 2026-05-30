import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchLocationMap } from "@/components/search-location-map";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Minus, Plus, Search } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useSearchLocation } from "@/hooks/use-search-location";
import { useDebounce } from "@/hooks/use-debounce";
import { useLocale } from "@/hooks/use-locale";
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";
import {
  adjustSearchRadiusKm,
  clampSearchRadiusKm,
  DEFAULT_SEARCH_MAP_CENTER,
  DEFAULT_SEARCH_RADIUS_KM,
  getGeolocationContextIssue,
  getPickerInitialRadiusKm,
  SEARCH_RADIUS_KM_MAX,
  SEARCH_RADIUS_KM_MIN,
  type SearchLocationState,
} from "@/lib/search-location";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const PICKER_HISTORY_MARKER = 2;

const sheetShell =
  "z-[60] flex h-[min(100dvh,920px)] max-h-[100dvh] w-full flex-col border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.72)] ring-1 ring-primary/14 sm:max-h-[92dvh] sm:rounded-t-2xl";
const headerBar =
  "shrink-0 border-b border-primary/25 bg-[#0A0A0A]/50 px-3 py-3 shadow-[inset_0_-1px_0_rgba(163,230,53,0.06)] sm:px-4";
const searchCard =
  "rounded-2xl border border-primary/32 bg-[#0A0A0A]/88 shadow-[0_0_20px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12";

const radiusStepBtn =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/55 bg-[#0A0A0A]/90 text-primary shadow-[0_0_14px_-6px_hsl(var(--primary)/0.45)] ring-1 ring-primary/20 transition-[transform,box-shadow,border-color,background-color] hover:border-primary/70 hover:bg-black/95 hover:shadow-[0_0_18px_-6px_hsl(var(--primary)/0.55)] active:scale-[0.94] disabled:pointer-events-none disabled:opacity-40 touch-manipulation";

const NOMINATIM_USER_AGENT = "SouqArabEU/1.0 (location search; contact: support@souqarabeu.com)";

type GeocodeHit = {
  lat: number;
  lng: number;
  displayName: string;
  label: string;
  city: string;
  country: string;
  countryCode: string;
};

function parseGeocodeResult(item: Record<string, unknown>): GeocodeHit | null {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const address =
    item.address && typeof item.address === "object"
      ? (item.address as Record<string, unknown>)
      : {};
  const suburb = String(
    address.suburb ??
      address.neighbourhood ??
      address.quarter ??
      address.district ??
      "",
  ).trim();
  const city = String(
    address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.county ??
      "",
  ).trim();
  const state = String(address.state ?? "").trim();
  const country = String(address.country ?? "").trim();
  const countryCode = String(address.country_code ?? "").trim().toUpperCase();
  const displayName = String(item.display_name ?? (city || suburb || country)).trim();
  const primary = city || suburb || state;
  let label = "";
  if (primary && country) {
    label = suburb && city && suburb !== city ? `${suburb}, ${city}, ${country}` : `${primary}, ${country}`;
  } else if (primary) {
    label = primary;
  } else {
    label =
      displayName
        .split(",")
        .slice(0, 2)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ") || displayName;
  }
  return {
    lat,
    lng,
    displayName,
    label,
    city: city || suburb,
    country,
    countryCode,
  };
}

export type SearchLocationPickerPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SearchLocationPickerPanel({
  open,
  onOpenChange,
}: SearchLocationPickerPanelProps) {
  const { locale } = useLocale();
  const isRtl = locale === "ar";
  const { location, applyLocation } = useSearchLocation();

  const initialCenter = useMemo(
    () =>
      location
        ? { lat: location.lat, lng: location.lng }
        : { ...DEFAULT_SEARCH_MAP_CENTER },
    [location],
  );

  const [draftLat, setDraftLat] = useState(initialCenter.lat);
  const [draftLng, setDraftLng] = useState(initialCenter.lng);
  const [draftRadius, setDraftRadius] = useState(() =>
    getPickerInitialRadiusKm(location),
  );
  const [draftCountry, setDraftCountry] = useState(location?.country ?? "");
  const [draftCountryCode, setDraftCountryCode] = useState(location?.countryCode ?? "");
  const [draftCity, setDraftCity] = useState(location?.city ?? "");
  const [draftIsGps, setDraftIsGps] = useState(location?.isCurrentLocation ?? false);

  const [placeQuery, setPlaceQuery] = useState("");
  const debouncedPlaceQuery = useDebounce(placeQuery, 450);
  const [geocodeHits, setGeocodeHits] = useState<GeocodeHit[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const searchBlockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const c = location
      ? { lat: location.lat, lng: location.lng }
      : { ...DEFAULT_SEARCH_MAP_CENTER };
    setDraftLat(c.lat);
    setDraftLng(c.lng);
    setDraftRadius(getPickerInitialRadiusKm(location));
    setDraftCountry(location?.country ?? "");
    setDraftCountryCode(location?.countryCode ?? "");
    setDraftCity(location?.city ?? "");
    setDraftIsGps(location?.isCurrentLocation ?? false);
    setPlaceQuery("");
    setGeocodeHits([]);
    setSuggestionsDismissed(false);
    setGpsError(null);
    setMapReady(false);
  }, [open, location]);

  const queryTrim = placeQuery.trim();
  const debouncedTrim = debouncedPlaceQuery.trim();
  const canSearch = queryTrim.length >= 2;
  const searchSettled = canSearch && debouncedTrim === queryTrim;
  const showSuggestions =
    canSearch &&
    !suggestionsDismissed &&
    (geocodeLoading || geocodeHits.length > 0 || searchSettled);

  useEffect(() => {
    if (queryTrim.length < 2) setSuggestionsDismissed(false);
  }, [queryTrim]);

  useEffect(() => {
    if (!open || !showSuggestions) return;
    const onPointerDown = (e: PointerEvent) => {
      if (searchBlockRef.current?.contains(e.target as Node)) return;
      setSuggestionsDismissed(true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, showSuggestions]);

  useEffect(() => {
    if (!open) {
      setMapReady(false);
      return;
    }
    let cancelled = false;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (!cancelled) setMapReady(true);
      });
    });
    const fallback = window.setTimeout(() => {
      if (!cancelled) setMapReady(true);
    }, 520);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      clearTimeout(fallback);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = debouncedPlaceQuery.trim();
    if (q.length < 2) {
      setGeocodeHits([]);
      setGeocodeLoading(false);
      return;
    }
    const ac = new AbortController();
    setGeocodeLoading(true);
    void (async () => {
      try {
        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", q);
        url.searchParams.set("format", "json");
        url.searchParams.set("addressdetails", "1");
        url.searchParams.set("limit", "8");
        const res = await fetch(url.toString(), {
          signal: ac.signal,
          headers: {
            Accept: "application/json",
            "User-Agent": NOMINATIM_USER_AGENT,
          },
        });
        if (!res.ok) throw new Error("geocode failed");
        const data = (await res.json()) as Record<string, unknown>[];
        const seen = new Set<string>();
        const hits = data
          .map((row) => parseGeocodeResult(row))
          .filter((h): h is GeocodeHit => {
            if (!h) return false;
            const key = h.label.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        setGeocodeHits(hits);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") {
          setGeocodeHits([]);
        }
      } finally {
        if (!ac.signal.aborted) setGeocodeLoading(false);
      }
    })();
    return () => ac.abort();
  }, [debouncedPlaceQuery, open]);

  const onMapCenterChange = useCallback((lat: number, lng: number) => {
    setDraftLat(lat);
    setDraftLng(lng);
    setDraftIsGps(false);
  }, []);

  const nudgeRadius = useCallback((direction: 1 | -1) => {
    setDraftRadius((prev) => adjustSearchRadiusKm(prev, direction));
  }, []);

  const selectHit = useCallback((hit: GeocodeHit) => {
    setDraftLat(hit.lat);
    setDraftLng(hit.lng);
    setDraftCity(hit.city);
    setDraftCountry(hit.country);
    setDraftCountryCode(hit.countryCode);
    setDraftIsGps(false);
    setPlaceQuery(hit.label);
    setGeocodeHits([]);
    setSuggestionsDismissed(true);
  }, []);

  const useCurrentLocation = useCallback(() => {
    setGpsError(null);
    const contextIssue = getGeolocationContextIssue();
    if (contextIssue === "unsupported") {
      setGpsError(t("search_location.gps_unsupported"));
      return;
    }
    if (contextIssue === "insecure") {
      setGpsError(t("search_location.gps_insecure"));
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraftLat(pos.coords.latitude);
        setDraftLng(pos.coords.longitude);
        setDraftIsGps(true);
        setDraftCity("");
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError(t("search_location.gps_denied"));
        } else if (err.code === err.TIMEOUT) {
          setGpsError(t("search_location.gps_timeout"));
        } else {
          setGpsError(t("search_location.gps_failed"));
        }
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, []);

  const onApply = useCallback(() => {
    const next: SearchLocationState = {
      country: draftCountry || (draftIsGps ? "" : "Germany"),
      countryCode: draftCountryCode || (draftIsGps ? "" : "DE"),
      city: draftCity,
      lat: draftLat,
      lng: draftLng,
      radiusKm: draftRadius,
      isCurrentLocation: draftIsGps,
    };
    if (!draftCity && !draftCountry && !draftIsGps) {
      next.country = t("search_location.default_country");
      next.countryCode = "DE";
    }
    applyLocation(next);
    onOpenChange(false);
  }, [
    applyLocation,
    draftCity,
    draftCountry,
    draftCountryCode,
    draftIsGps,
    draftLat,
    draftLng,
    draftRadius,
    onOpenChange,
  ]);

  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (!open) return;

    history.pushState(
      { souqSearchLocationPicker: PICKER_HISTORY_MARKER },
      "",
      window.location.href,
    );

    const onPopState = () => {
      if (!openRef.current) return;
      scrollPopstateGuard.skipNext = true;
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPopState, { capture: true });
    return () => {
      window.removeEventListener("popstate", onPopState, { capture: true });
      const state = history.state as { souqSearchLocationPicker?: unknown } | null;
      if (state?.souqSearchLocationPicker === PICKER_HISTORY_MARKER) {
        scrollPopstateGuard.skipNext = true;
        history.back();
      }
    };
  }, [open, onOpenChange]);

  const BackIcon = isRtl ? ArrowRight : ArrowLeft;

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className={sheetShell}
        dir={isRtl ? "rtl" : "ltr"}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className={cn(headerBar, "space-y-0 text-right")}>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-[#0A0A0A]/90 text-primary shadow-[0_0_16px_-5px_hsl(var(--primary)/0.38)] active:scale-[0.96]"
              aria-label={t("search_location.close")}
            >
              <BackIcon className="h-5 w-5" />
            </button>
            <SheetTitle className="min-w-0 flex-1 text-base font-bold text-foreground">
              {t("search_location.title")}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-3 pb-1 pt-2.5 sm:px-4 sm:pt-3">
          <div
            ref={searchBlockRef}
            className={cn(searchCard, "relative z-[70] overflow-visible px-2.5 py-1")}
          >
            <Search
              className={cn(
                "pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground",
                isRtl ? "right-2" : "left-2",
              )}
              aria-hidden
            />
            <Input
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                setSuggestionsDismissed(false);
              }}
              placeholder={t("search_location.search_placeholder")}
              role="combobox"
              aria-expanded={showSuggestions}
              aria-autocomplete="list"
              className={cn(
                "h-9 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0",
                isRtl ? "pr-8 pl-2 text-right" : "pl-8 pr-2",
              )}
            />

            {showSuggestions ? (
              <div
                role="listbox"
                className={cn(
                  "absolute inset-x-0 top-[calc(100%+6px)] z-[80] max-h-[min(240px,32dvh)] overflow-y-auto overscroll-contain",
                  "rounded-2xl border border-primary/40 bg-[#0A0A0A]/[0.98] p-1.5",
                  "shadow-[0_0_28px_-10px_hsl(var(--primary)/0.38)] ring-1 ring-primary/22",
                )}
              >
                {geocodeLoading ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                    {t("search_location.searching")}
                  </div>
                ) : geocodeHits.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {geocodeHits.map((hit) => (
                      <li key={`${hit.lat}-${hit.lng}-${hit.label}`}>
                        <button
                          type="button"
                          role="option"
                          onClick={() => selectHit(hit)}
                          className={cn(
                            "w-full rounded-xl border border-transparent px-3 py-2.5 text-start text-sm text-foreground",
                            "transition-[border-color,background-color,box-shadow]",
                            "hover:border-primary/35 hover:bg-primary/10",
                            "hover:shadow-[0_0_14px_-10px_hsl(var(--primary)/0.32)]",
                            "active:scale-[0.99]",
                          )}
                        >
                          {hit.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-3 text-xs text-muted-foreground">
                    {t("search_location.no_results")}
                  </p>
                )}
              </div>
            ) : null}
          </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-2xl border border-primary/30 shadow-[0_0_22px_-14px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12">
            {open && mapReady ? (
              <SearchLocationMap
                lat={draftLat}
                lng={draftLng}
                radiusKm={draftRadius}
                sheetOpen={open}
                onCenterChange={onMapCenterChange}
                className="h-[min(64dvh,440px)] min-h-[340px] w-full"
              />
            ) : open ? (
              <div className="flex h-[min(64dvh,440px)] min-h-[340px] items-center justify-center bg-[#0A0A0A] text-sm text-muted-foreground">
                <Loader2 className="me-2 h-4 w-4 animate-spin text-primary" />
                {t("search_location.map_loading")}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void useCurrentLocation()}
              disabled={gpsLoading}
              className={cn(
                "absolute bottom-14 z-[500] inline-flex max-w-[calc(100%-5rem)] items-center gap-2 rounded-full border border-primary/50",
                "bg-[#0A0A0A]/92 px-3 py-2 text-xs font-semibold text-primary shadow-[0_0_18px_-8px_hsl(var(--primary)/0.5)] ring-1 ring-primary/20",
                "transition-opacity hover:border-primary/70 disabled:opacity-60",
                "start-3",
              )}
            >
              {gpsLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {t("search_location.use_my_location")}
            </button>
          </div>

          {gpsError ? (
            <p
              role="alert"
              className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive"
            >
              {gpsError}
            </p>
          ) : null}

          <div
            className="mt-1 rounded-2xl border border-primary/28 bg-[#0A0A0A]/75 px-3 py-3.5 ring-1 ring-primary/10"
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => nudgeRadius(-1)}
                disabled={draftRadius <= SEARCH_RADIUS_KM_MIN}
                aria-label={t("search_location.radius_decrease")}
                className={radiusStepBtn}
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
              <p className="min-w-0 flex-1 text-center text-sm font-semibold text-foreground tabular-nums">
                {t("search_location.radius_value", { radius: draftRadius })}
              </p>
              <button
                type="button"
                onClick={() => nudgeRadius(1)}
                disabled={draftRadius >= SEARCH_RADIUS_KM_MAX}
                aria-label={t("search_location.radius_increase")}
                className={radiusStepBtn}
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            <Slider
              min={SEARCH_RADIUS_KM_MIN}
              max={SEARCH_RADIUS_KM_MAX}
              step={1}
              value={[draftRadius]}
              onValueChange={([v]) => {
                setDraftRadius(clampSearchRadiusKm(typeof v === "number" ? v : DEFAULT_SEARCH_RADIUS_KM));
              }}
              aria-label={t("search_location.radius_aria")}
              aria-valuetext={t("search_location.radius_value", { radius: draftRadius })}
              className="touch-manipulation"
              dir={isRtl ? "rtl" : "ltr"}
            />
            <div
              className="mt-3 flex w-full items-center justify-between text-[11px] font-medium text-muted-foreground"
              dir={isRtl ? "rtl" : "ltr"}
            >
              <span className="tabular-nums">{t("search_location.km_tick", { value: 1 })}</span>
              <span className="tabular-nums">{t("search_location.km_tick", { value: 500 })}</span>
            </div>
          </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-primary/20 bg-[#0A0A0A]/90 px-3 py-3 sm:px-4">
          <button
            type="button"
            onClick={onApply}
            className={cn(
              "h-11 w-full rounded-2xl border border-primary/55 bg-[#0A0A0A]/90 text-base font-bold text-primary",
              "shadow-[0_0_22px_-10px_hsl(var(--primary)/0.42)] ring-1 ring-primary/22",
              "transition-[transform,box-shadow,border-color,background-color]",
              "hover:border-primary/70 hover:bg-black/95 hover:shadow-[0_0_28px_-8px_hsl(var(--primary)/0.5)]",
              "active:scale-[0.98]",
            )}
          >
            {t("search_location.apply")}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
