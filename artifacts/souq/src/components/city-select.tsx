import { useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GERMAN_CITIES } from "@/lib/german-cities";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";

interface CitySelectProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export function CitySelect({
  value,
  onChange,
  placeholder = t("city_select.placeholder"),
  showAllOption = false,
  className,
}: CitySelectProps) {
  const { locale } = useLocale();
  const isAr = locale === "ar";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = GERMAN_CITIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (city: string) => {
    onChange(city);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 h-10 rounded-md border border-input bg-background text-sm hover:bg-muted/50 transition-colors",
          className,
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          hideClose
          side="bottom"
          dir={isAr ? "rtl" : "ltr"}
          className="mx-auto flex h-[85dvh] max-h-[90dvh] w-full max-w-[480px] flex-col gap-0 overflow-hidden rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4">
            <SheetTitle className="m-0 flex-1 text-right text-base font-semibold text-white">
              {t("city_select.title")}
            </SheetTitle>
            <SheetClose
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90"
              aria-label={t("create_ad.images.close")}
            >
              <X className="h-4 w-4" />
            </SheetClose>
          </div>
          <div className="p-4">
            <div className="relative rounded-xl border border-primary/30 bg-[#0A0A0A]/80 p-1">
              <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                autoFocus
                placeholder={t("city_select.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-lg border-primary/20 bg-transparent pr-10 text-white placeholder:text-zinc-500 focus-visible:border-primary/50 focus-visible:ring-primary/25"
              />
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-right transition-colors",
                  value === ""
                    ? "border-primary bg-primary/15 text-white"
                    : "border-primary/25 bg-[#0A0A0A]/75 text-white hover:border-primary/45 hover:bg-black/85",
                )}
              >
                <span className="font-medium">{t("city_select.all_germany")}</span>
                {value === "" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary bg-primary text-black">
                    <Check className="h-3 w-3" />
                  </span>
                ) : (
                  <span className="h-5 w-5 rounded-full border border-primary/40" aria-hidden />
                )}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="rounded-xl border border-primary/20 bg-[#0A0A0A]/70 p-8 text-center text-sm text-zinc-500">
                {t("city_select.no_results")}
              </div>
            ) : (
              filtered.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-right transition-colors",
                    value === city
                      ? "border-primary bg-primary/15 text-white"
                      : "border-primary/25 bg-[#0A0A0A]/75 text-white hover:border-primary/45 hover:bg-black/85",
                  )}
                >
                  <span className="text-sm">{city}</span>
                  {value === city ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary bg-primary text-black">
                      <Check className="h-3 w-3" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 rounded-full border border-primary/40" aria-hidden />
                  )}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
