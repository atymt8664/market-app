import { useMemo } from "react";
import { useLocale } from "@/hooks/use-locale";
import {
  adminIntlLocale,
  adminTextDir,
  formatAdminDateTime,
  formatAdminNumber,
} from "@/features/admin/admin-locale";

export function useAdminLocale() {
  const { locale, setLocale } = useLocale();
  return useMemo(
    () => ({
      locale,
      setLocale,
      dir: adminTextDir(locale),
      intlLocale: adminIntlLocale(locale),
      formatNumber: (value: number) => formatAdminNumber(value, locale),
      formatDateTime: (iso: string, options?: Intl.DateTimeFormatOptions) =>
        formatAdminDateTime(iso, locale, options),
    }),
    [locale, setLocale],
  );
}
