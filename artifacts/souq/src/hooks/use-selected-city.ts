import { useMemo } from "react";
import { Country } from "country-state-city";
import { useLocalStorage } from "./use-local-storage";
import { GERMAN_CITIES } from "@/lib/german-cities";

const germanSet = new Set(GERMAN_CITIES.map((c) => c.toLowerCase()));

export function useSelectedCity() {
  const [city, setCityRaw] = useLocalStorage<string>("selected_city", "");
  const [countryCode, setCountryCodeRaw] = useLocalStorage<string>(
    "selected_country_code",
    "",
  );

  const setCity = (next: string, nextCountryCode?: string) => {
    setCityRaw(next);
    if (next === "") {
      setCountryCodeRaw("");
    } else if (nextCountryCode !== undefined) {
      setCountryCodeRaw(nextCountryCode);
    }
  };

  const displayLabel = useMemo(() => {
    if (!city) return null;
    const fromCode = countryCode
      ? Country.getCountryByCode(countryCode)?.name
      : undefined;
    if (fromCode) {
      return `${city}, ${fromCode}`;
    }
    if (germanSet.has(city.toLowerCase())) {
      return `${city}, Germany`;
    }
    return city;
  }, [city, countryCode]);

  return { city, countryCode, setCity, displayLabel };
}
