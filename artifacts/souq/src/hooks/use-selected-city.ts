import { useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { GERMAN_CITIES } from "@/lib/german-cities";
import { resolveCountryName } from "@/lib/locations/manifest-data";

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
    if (countryCode) {
      const part =
        resolveCountryName(countryCode) ?? countryCode.trim().toUpperCase();
      return `${city}, ${part}`;
    }
    if (germanSet.has(city.toLowerCase())) {
      return `${city}, Germany`;
    }
    return city;
  }, [city, countryCode]);

  return { city, countryCode, setCity, displayLabel };
}
