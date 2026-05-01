import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  MapPin,
  Search,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
import { getCitiesByCountry } from "@/lib/signup-location-data";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

const COUNTRY_OPTIONS = getMarketplaceCountryOptions();
const CITY_RESULTS_CAP = 120;

type Step = 1 | 2;

export function LocationPicker() {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const { city, countryCode, setCity, displayLabel } = useSelectedCity();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [draftCountry, setDraftCountry] =
    useState<MarketplaceCountryOption | null>(null);

  const [countryQuery, setCountryQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDraftCountry(null);
    setCountryQuery("");
    setCityQuery("");
  }, [open]);

  const filteredCountries = useMemo(
    () => filterCountriesByQuery(COUNTRY_OPTIONS, countryQuery),
    [countryQuery],
  );

  const cityList = useMemo(() => {
    if (!draftCountry) return [];
    return getCitiesByCountry(draftCountry.code);
  }, [draftCountry]);

  const filteredCities = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return cityList
      .filter((c) => c.toLowerCase().includes(q))
      .slice(0, CITY_RESULTS_CAP);
  }, [cityList, cityQuery]);

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

  const triggerLabel = displayLabel ?? t("location_picker.trigger");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("location_picker.aria")}
        className={cn(
          "flex max-w-[min(100%,12rem)] items-center gap-1.5 rounded-xl border border-dashed border-primary/25 bg-primary/5 px-2.5 py-1.5 text-xs font-medium text-primary transition-all active:scale-[0.98]",
          displayLabel && "border-primary/35 bg-primary/[0.08]",
        )}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
        <span className="min-w-0 truncate">{triggerLabel}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          dir={isAr ? "rtl" : "ltr"}
          className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:mx-auto sm:max-w-[480px]"
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-4 pb-3 pt-4 text-right">
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait" initial={false}>
                {step === 2 ? (
                  <motion.div
                    key="back"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-1 items-center gap-2"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-full"
                      onClick={goBackToCountries}
                      aria-label={t("location_picker.back_country")}
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    <div className="min-w-0 flex-1 text-right">
                      <SheetTitle className="text-base font-bold">
                        {t("location_picker.city_title")}
                      </SheetTitle>
                      {draftCountry ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {(isAr ? draftCountry.nameAr : draftCountry.nameEn)} · {draftCountry.nameEn}
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full"
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
                <div className="shrink-0 border-b border-border p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder={t("location_picker.search_country")}
                      value={countryQuery}
                      onChange={(e) => setCountryQuery(e.target.value)}
                      className="pr-10"
                      aria-label={t("location_picker.search_country_aria")}
                    />
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <button
                    type="button"
                    onClick={handleClearLocation}
                    className={cn(
                      "flex w-full items-center justify-between border-b border-border/50 px-4 py-3.5 text-right transition-colors hover:bg-muted/60 active:bg-muted",
                      !city && "bg-primary/10",
                    )}
                  >
                    <span className="flex items-center gap-2 font-semibold">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {t("location_picker.all_areas")}
                    </span>
                    {!city ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : null}
                  </button>
                  {filteredCountries.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t("location_picker.no_countries")}
                    </div>
                  ) : (
                    filteredCountries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handlePickCountry(c)}
                        className="flex w-full items-center justify-between border-b border-border/30 px-4 py-3 text-right transition-colors hover:bg-muted/60 active:bg-muted"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {isAr ? c.nameAr : c.nameEn}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {c.nameEn}
                          </span>
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-muted-foreground" />
                      </button>
                    ))
                  )}
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
                <div className="shrink-0 border-b border-border p-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder={t("location_picker.search_city")}
                      value={cityQuery}
                      onChange={(e) => setCityQuery(e.target.value)}
                      className="pr-10"
                      aria-label={t("location_picker.search_city_aria")}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("location_picker.search_city_hint")}
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {cityQuery.trim().length < 2 ? (
                    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
                      <MapPin className="h-10 w-10 opacity-40" />
                      <p>{t("location_picker.type_to_search")}</p>
                    </div>
                  ) : filteredCities.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {t("location_picker.no_cities")}
                    </div>
                  ) : (
                    <>
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
                              "flex w-full items-center justify-between border-b border-border/30 px-4 py-3 text-right transition-colors hover:bg-muted/60 active:bg-muted",
                              selected && "bg-primary/10",
                            )}
                          >
                            <span className="text-sm">
                              {cName}
                              {draftCountry ? (
                                <span className="text-muted-foreground">
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
                        <p className="px-4 py-3 text-center text-xs text-muted-foreground">
                          {t("location_picker.results_cap", { count: CITY_RESULTS_CAP })}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </SheetContent>
      </Sheet>
    </>
  );
}
