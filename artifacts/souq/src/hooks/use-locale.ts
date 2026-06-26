import { useSyncExternalStore } from "react";
import { getLocaleSnapshot, setLocale, subscribeToLocale, type Locale } from "@/i18n";

function parseLocaleSnapshot(snapshot: string): Locale {
  const code = snapshot.split(":")[0];
  return code === "en" || code === "de" ? code : "ar";
}

export function useLocale() {
  const snapshot = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    () => "ar:0",
  );
  const locale = parseLocaleSnapshot(snapshot);
  return {
    locale,
    setLocale: (next: Locale) => setLocale(next),
  };
}
