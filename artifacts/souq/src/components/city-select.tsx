import { useState } from "react";
import { Check, ChevronDown, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { GERMAN_CITIES } from "@/lib/german-cities";
import {
  Sheet,
  SheetContent,
  SheetHeader,
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
          <MapPin className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          dir={isAr ? "rtl" : "ltr"}
          className="h-[85dvh] flex flex-col p-0 max-w-[480px] mx-auto rounded-t-2xl"
        >
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-right">{t("city_select.title")}</SheetTitle>
          </SheetHeader>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder={t("city_select.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-right border-b border-border/50",
                  value === "" && "bg-primary/10",
                )}
              >
                <span className="font-medium">{t("city_select.all_germany")}</span>
                {value === "" && <Check className="w-4 h-4 text-primary" />}
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                {t("city_select.no_results")}
              </div>
            ) : (
              filtered.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-right border-b border-border/30",
                    value === city && "bg-primary/10",
                  )}
                >
                  <span className="text-sm">{city}</span>
                  {value === city && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
