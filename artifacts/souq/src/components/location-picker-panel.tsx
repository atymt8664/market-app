import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  MapPin,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { scrollPopstateGuard } from "@/components/scroll-restoration-guard";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSelectedCity } from "@/hooks/use-selected-city";
import {
  type MarketplaceCountryOption,
  filterCountriesByQuery,
  getMarketplaceCountryOptions,
} from "@/lib/marketplace-location-countries";
import {
  allowsManualCityForCountry,
  loadBundledCitiesWithRetry,
} from "@/lib/locations/cities-loader";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

const CITY_RESULTS_CAP = 120;

const LOCATION_PICKER_HISTORY_MARKER = 1;

/** نفس زر الرجوع الدائري في ad-detail (lime + glow) */
const locationPickerFloatingBackBtn =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-primary/55 bg-[#0A0A0A]/90 text-primary shadow-[0_0_16px_-5px_hsl(var(--primary)/0.38)] transition-[transform,colors,box-shadow] hover:border-primary/70 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.45)] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-55 dark:bg-black/55";

function getViewportScrollY(): number {
  if (typeof window === "undefined") return 0;
  const se = document.scrollingElement;
  if (se && typeof se.scrollTop === "number") return se.scrollTop;
  return (
    window.scrollY ??
    window.pageYOffset ??
    document.documentElement.scrollTop ??
    document.body.scrollTop ??
    0
  );
}

function setViewportScrollY(y: number): void {
  const top = Math.max(0, Math.round(y));
  const se = document.scrollingElement;
  if (se) se.scrollTop = top;
  window.scrollTo({ top, left: 0, behavior: "auto" });
}

function isPickerHistoryState(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "souqLocationPicker" in state &&
    (state as { souqLocationPicker: unknown }).souqLocationPicker ===
      LOCATION_PICKER_HISTORY_MARKER
  );
}

/** كروت القائمة داخل الـ sheet — نفس لغة home / BottomNav (dark + lime حدود و glow خفيف) */
const pickerSheetShell =
  "border-t border-primary/35 bg-[#0A0A0A] shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.72)] ring-1 ring-primary/14";
const pickerHeaderBar =
  "border-b border-primary/25 bg-[#0A0A0A]/50 shadow-[inset_0_-1px_0_rgba(163,230,53,0.06)]";
const pickerSearchCard =
  "rounded-2xl border border-primary/32 bg-[#0A0A0A]/88 shadow-[0_0_20px_-12px_hsl(var(--primary)/0.2)] ring-1 ring-primary/12";
const pickerInputInner =
  "border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";
const pickerListPad = "px-3 pb-4 pt-2 sm:px-4";
const pickerRowCard =
  "flex w-full items-center justify-between rounded-xl border border-primary/22 bg-[#0A0A0A]/78 px-3 py-3 text-right shadow-[0_0_14px_-14px_hsl(var(--primary)/0.12)] ring-1 ring-primary/10 transition-[color,background-color,border-color,box-shadow,transform] duration-150 hover:border-primary/40 hover:bg-black/88 active:scale-[0.99] md:hover:shadow-[0_0_22px_-12px_hsl(var(--primary)/0.22)]";
const pickerRowSelected =
  "border-primary/55 bg-primary/[0.12] text-primary shadow-[0_0_22px_-10px_hsl(var(--primary)/0.28)] ring-primary/28 [&_.row-title]:text-primary [&_.row-sub]:text-primary/75";

type Step = 1 | 2;

export type LocationPickerPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LocationPickerPanel({ open, onOpenChange }: LocationPickerPanelProps) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const { city, countryCode, setCity } = useSelectedCity();
  const setOpen = onOpenChange;
  const [step, setStep] = useState<Step>(1);
  const [draftCountry, setDraftCountry] =
    useState<MarketplaceCountryOption | null>(null);

  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [countryOptions, setCountryOptions] = useState<MarketplaceCountryOption[]>([]);
  const [countryOptionsLoading, setCountryOptionsLoading] = useState(false);
  const [cityList, setCityList] = useState<string[]>([]);
  const [cityListLoad, setCityListLoad] = useState<
    "idle" | "loading" | "error" | "ready"
  >("idle");
  const [cityListRetryNonce, setCityListRetryNonce] = useState(0);

  const openRef = useRef(open);
  openRef.current = open;

  const savedScrollYRef = useRef(0);
  const hadOpenPickerRef = useRef(false);
  const scrollRestoreGenRef = useRef(0);

  useLayoutEffect(() => {
    if (!open) {
      if (!hadOpenPickerRef.current) return;
      hadOpenPickerRef.current = false;
      const gen = ++scrollRestoreGenRef.current;
      const y = savedScrollYRef.current;
      const restore = () => {
        if (gen !== scrollRestoreGenRef.current) return;
        setViewportScrollY(y);
      };
      restore();
      requestAnimationFrame(() => {
        restore();
        requestAnimationFrame(() => {
          restore();
          window.setTimeout(restore, 0);
          window.setTimeout(restore, 50);
        });
      });
      return;
    }
    scrollRestoreGenRef.current += 1;
    hadOpenPickerRef.current = true;
    savedScrollYRef.current = getViewportScrollY();
  }, [open, setOpen]);

  useLayoutEffect(() => {
    if (!open) return;

    history.pushState(
      { souqLocationPicker: LOCATION_PICKER_HISTORY_MARKER },
      "",
      window.location.href,
    );

    const onPopState = () => {
      if (!openRef.current) return;
      scrollPopstateGuard.skipNext = true;
      setOpen(false);
    };
    window.addEventListener("popstate", onPopState, { capture: true });
    return () => {
      window.removeEventListener("popstate", onPopState, { capture: true });
      if (isPickerHistoryState(history.state)) {
        scrollPopstateGuard.skipNext = true;
        history.back();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraftCountry(null);
    setCountryQuery("");
    setCityQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCountryOptionsLoading(true);
    let cancelled = false;
    void getMarketplaceCountryOptions()
      .then((opts) => {
        if (!cancelled) setCountryOptions(opts);
      })
      .finally(() => {
        if (!cancelled) setCountryOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!draftCountry) {
      setCityList([]);
      setCityListLoad("idle");
      return;
    }
    let cancelled = false;
    setCityListLoad("loading");
    void loadBundledCitiesWithRetry(draftCountry.code).then((r) => {
      if (cancelled) return;
      setCityList(r.cities);
      setCityListLoad(r.loadFailed ? "error" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, [draftCountry?.code, cityListRetryNonce]);

  const filteredCountries = useMemo(
    () => filterCountriesByQuery(countryOptions, countryQuery),
    [countryOptions, countryQuery],
  );

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return cityList
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, CITY_RESULTS_CAP);
  }, [cityList, cityQuery]);

  const draftAllowsManual = useMemo(
    () => (draftCountry ? allowsManualCityForCountry(draftCountry.code) : false),
    [draftCountry?.code],
  );

  const handleClearLocation = () => {
    setCity("");
    setOpen(false);
  };

  const handlePickCountry = (opt: MarketplaceCountryOption) => {
    setDraftCountry(opt);
    setCityQuery("");
    setStep(2);
  };

  const handlePickCity = (cityName: string) => {
    if (!draftCountry) return;
    setCity(cityName, draftCountry.code);
    setOpen(false);
  };

  const goBackToCountries = () => {
    setStep(1);
    setDraftCountry(null);
    setCityQuery("");
  };

  const handleHeaderBack = () => {
    if (step === 2) {
      goBackToCountries();
    } else {
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          dir={isAr ? "rtl" : "ltr"}
          hideClose
          onCloseAutoFocus={(e) => e.preventDefault()}
          className={cn(
            "flex max-h-[88dvh] flex-col gap-0 overflow-hidden rounded-t-2xl p-0 sm:mx-auto sm:max-w-[480px]",
            pickerSheetShell,
          )}
        >
          <SheetHeader
            className={cn(
              "shrink-0 space-y-0 px-4 pb-3 pt-4",
              pickerHeaderBar,
            )}
          >
            <div
              className={cn(
                "flex w-full min-w-0 items-center justify-between gap-3",
                /* LTR: نفس الترتيب البصي — سهم يسار، نص يمين (في RTL العكس بالـ DOM) */
                !isAr && "flex-row-reverse",
              )}
            >
              <div className="min-w-0 flex-1 text-right">
                <AnimatePresence mode="wait" initial={false}>
                  {step === 2 ? (
                    <motion.div
                      key="back"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full min-w-0 space-y-1 text-right"
                    >
                      <SheetTitle className="text-base font-bold">
                        {t("location_picker.city_title")}
                      </SheetTitle>
                      {draftCountry ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {(isAr ? draftCountry.nameAr : draftCountry.nameEn)} ·{" "}
                          {draftCountry.nameEn}
                        </p>
                      ) : null}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="title"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full space-y-1 text-right"
                    >
                      <SheetTitle className="text-base font-bold">
                        {t("location_picker.title")}
                      </SheetTitle>
                      <p className="text-xs font-normal text-muted-foreground">
                        {t("location_picker.subtitle")}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button
                type="button"
                onClick={handleHeaderBack}
                aria-label={
                  step === 2
                    ? t("location_picker.back_country")
                    : t("location_picker.close_sheet")
                }
                className={cn(locationPickerFloatingBackBtn, "shrink-0")}
              >
                {isAr ? (
                  <ArrowRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                ) : (
                  <ArrowLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                )}
              </button>
            </div>
          </SheetHeader>

          <AnimatePresence mode="wait" initial={false}>
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="shrink-0 border-b border-primary/20 px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3">
                  <div className={cn("relative p-0.5", pickerSearchCard)}>
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/55" />
                    <Input
                      autoFocus
                      placeholder={t("location_picker.search_country")}
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                      className={cn(
                        "rounded-[14px] pr-10 text-foreground placeholder:text-muted-foreground/80",
                        pickerInputInner,
                      )}
                      aria-label={t("location_picker.search_country_aria")}
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                    pickerListPad,
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className={cn(
                        pickerRowCard,
                        !city ? pickerRowSelected : "",
                      )}
                    >
                      <span className="row-title flex items-center gap-2 font-semibold text-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
                        {t("location_picker.all_areas")}
                      </span>
                      {!city ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </button>
                    {countryOptionsLoading ? (
                      <div className="rounded-xl border border-primary/15 bg-[#0A0A0A]/40 px-4 py-10 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                        {t("location_picker.loading_countries")}
                      </div>
                    ) : filteredCountries.length === 0 ? (
                      <div className="rounded-xl border border-primary/15 bg-[#0A0A0A]/40 px-4 py-10 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                        {t("location_picker.no_countries")}
                      </div>
                    ) : (
                      filteredCountries.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handlePickCountry(c)}
                          className={pickerRowCard}
                        >
                          <span className="min-w-0 flex-1 text-right">
                            <span className="row-title block text-sm font-medium text-foreground">
                              {isAr ? c.nameAr : c.nameEn}
                            </span>
                            <span className="row-sub block text-xs text-muted-foreground">
                              {c.nameEn}
                            </span>
                          </span>
                          <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-primary/45" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="shrink-0 border-b border-primary/20 px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-3">
                  <div className={cn("relative p-0.5", pickerSearchCard)}>
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary/55" />
                    <Input
                      autoFocus
                      placeholder={
                        draftAllowsManual &&
                        cityList.length === 0 &&
                        cityListLoad === "ready"
                          ? t("location_picker.manual_city_placeholder")
                          : t("location_picker.search_city")
                      }
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      className={cn(
                        "rounded-[14px] pr-10 text-foreground placeholder:text-muted-foreground/80",
                        pickerInputInner,
                      )}
                      aria-label={t("location_picker.search_city_aria")}
                    />
                  </div>
                  <p className="mt-2.5 text-xs text-muted-foreground/90">
                    {draftAllowsManual && cityList.length === 0 && cityListLoad === "ready"
                      ? t("location_picker.manual_city_field_hint")
                      : t("location_picker.search_city_hint")}
                  </p>
                </div>
                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto overscroll-contain",
                    pickerListPad,
                  )}
                >
                  {cityListLoad === "loading" ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/15 bg-[#0A0A0A]/40 px-6 py-14 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                      <Loader2 className="h-9 w-9 animate-spin text-primary/50" />
                      <p>{t("location_picker.loading_cities")}</p>
                    </div>
                  ) : cityListLoad === "error" ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-primary/20 bg-[#0A0A0A]/50 px-6 py-12 text-center text-sm ring-1 ring-primary/10">
                      <p className="text-muted-foreground">
                        {t("location_picker.cities_load_error")}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="min-w-[8rem] border-primary/35 bg-[#0A0A0A]/80 text-foreground shadow-[0_0_14px_-10px_hsl(var(--primary)/0.22)] ring-1 ring-primary/12 hover:border-primary/50 hover:bg-black/90"
                        onClick={() => setCityListRetryNonce((n) => n + 1)}
                      >
                        {t("location_picker.cities_retry")}
                      </Button>
                    </div>
                  ) : cityListLoad === "ready" && draftAllowsManual && cityList.length === 0 ? (
                    <div className="space-y-4 py-4">
                      <div
                        className={cn(
                          "rounded-2xl border border-primary/28 bg-[#0A0A0A]/75 p-4 text-center text-sm text-muted-foreground shadow-[0_0_20px_-12px_hsl(var(--primary)/0.16)] ring-1 ring-primary/10",
                        )}
                      >
                        <MapPin className="mx-auto mb-3 h-9 w-9 text-primary/35" />
                        <p>{t("location_picker.manual_city_hint")}</p>
                        {cityQuery.trim().length >= 2 ? (
                          <Button
                            type="button"
                            className="mt-4 w-full border border-primary/40 bg-[#0A0A0A]/90 text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.25)] hover:border-primary/55 hover:bg-black/95"
                            variant="secondary"
                            onClick={() => handlePickCity(cityQuery.trim())}
                          >
                            {t("location_picker.manual_city_confirm")}
                          </Button>
                        ) : (
                          <p className="mt-3 text-xs text-muted-foreground">
                            {t("location_picker.manual_city_min_chars")}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : cityListLoad === "ready" && cityList.length === 0 && !draftAllowsManual ? (
                    <div className="rounded-xl border border-primary/15 bg-[#0A0A0A]/40 px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                      <p>{t("location_picker.no_cities_data")}</p>
                    </div>
                  ) : cityQuery.trim().length < 2 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-primary/15 bg-[#0A0A0A]/40 px-6 py-12 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                      <MapPin className="h-10 w-10 text-primary/30" />
                      <p>{t("location_picker.type_to_search")}</p>
                    </div>
                  ) : filteredCities.length === 0 ? (
                    <div className="rounded-xl border border-primary/15 bg-[#0A0A0A]/40 px-4 py-10 text-center text-sm text-muted-foreground ring-1 ring-primary/8">
                      {t("location_picker.no_cities")}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredCities.map((cName) => {
                        const selected =
                          city === cName &&
                          draftCountry?.code === countryCode;
                        return (
                          <button
                            key={cName}
                            type="button"
                            onClick={() => handlePickCity(cName)}
                            className={cn(
                              pickerRowCard,
                              selected ? pickerRowSelected : "",
                            )}
                          >
                            <span className="row-title text-sm text-foreground">
                              {cName}
                              {draftCountry ? (
                                <span
                                  className={cn(
                                    "row-sub",
                                    selected ? "text-primary/70" : "text-muted-foreground",
                                  )}
                                >
                                  {`, ${draftCountry.nameEn}`}
                                </span>
                              ) : null}
                            </span>
                            {selected ? (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            ) : null}
                          </button>
                        );
                      })}
                      {cityList.filter((c) =>
                        c.toLowerCase().includes(cityQuery.trim().toLowerCase()),
                      ).length > CITY_RESULTS_CAP ? (
                        <p className="py-2 text-center text-xs text-muted-foreground">
                          {t("location_picker.results_cap", { count: CITY_RESULTS_CAP })}
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
  );
}
