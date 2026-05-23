import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";
import { useSelectedCity } from "./use-selected-city";
import {
  type SearchLocationState,
  parseSearchLocationStored,
  formatSearchLocationBarLabel,
  migrateSearchLocationStorage,
  toPersistedSearchLocation,
} from "@/lib/search-location";
import { t } from "@/i18n";

const STORAGE_KEY = "search_location_v2";

export function useSearchLocation() {
  if (typeof window !== "undefined") {
    migrateSearchLocationStorage();
  }

  const [raw, setRaw] = useLocalStorage<unknown>(STORAGE_KEY, null);
  const { setCity } = useSelectedCity();

  const location = useMemo(() => parseSearchLocationStored(raw), [raw]);

  const barLabel = useMemo(
    () => formatSearchLocationBarLabel(location, t),
    [location],
  );

  const applyLocation = useCallback(
    (next: SearchLocationState) => {
      setRaw(toPersistedSearchLocation(next));
      const cityName = next.city.trim();
      if (cityName) {
        setCity(cityName, next.countryCode || undefined);
      } else {
        setCity("");
      }
    },
    [setRaw, setCity],
  );

  const clearLocation = useCallback(() => {
    setRaw(null);
    setCity("");
  }, [setRaw, setCity]);

  return {
    location,
    barLabel,
    applyLocation,
    clearLocation,
    hasLocation: location != null,
  };
}
