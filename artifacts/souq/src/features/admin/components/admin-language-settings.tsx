import { CheckCircle2, Languages } from "lucide-react";
import { SUB_CARD } from "@/features/admin/admin-interaction-classes";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { t, type Locale } from "@/i18n";
import { cn } from "@/lib/utils";

const LOCALE_OPTIONS: Array<{ code: Locale; labelKey: string }> = [
  { code: "ar", labelKey: "language.option.ar" },
  { code: "en", labelKey: "language.option.en" },
  { code: "de", labelKey: "language.option.de" },
];

export function AdminLanguageSettings() {
  const { locale, setLocale, dir } = useAdminLocale();

  return (
    <section className={cn(SUB_CARD, "p-4 md:p-5")}>
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)] ring-1 ring-primary/15">
          <Languages className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h2 className="text-lg font-semibold text-foreground">{t("p8.admin.settings.language_section")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("p8.admin.settings.language_hint")}</p>
        </div>
      </div>

      <div className="space-y-2" dir={dir}>
        {LOCALE_OPTIONS.map((option) => {
          const active = locale === option.code;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => void setLocale(option.code)}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-start transition",
                active
                  ? "border-primary/45 bg-primary/12 text-foreground shadow-[0_0_0_1px_rgba(182,227,86,0.12)] ring-1 ring-primary/20"
                  : "border-primary/20 bg-zinc-950/55 text-muted-foreground hover:border-primary/35 hover:bg-zinc-900/80 hover:text-foreground",
              )}
              aria-pressed={active}
            >
              <span className="text-sm font-medium">{t(option.labelKey)}</span>
              {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
