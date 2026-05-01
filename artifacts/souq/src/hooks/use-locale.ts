import { useSyncExternalStore } from "react";
import { getLocale, setLocale, subscribeToLocale, type Locale } from "@/i18n";

export function useLocale() {
  const locale = useSyncExternalStore<Locale>(
    subscribeToLocale,
    getLocale,
    () => "ar",
  );
  return {
    locale,
    setLocale: (next: Locale) => setLocale(next),
  };
}
