import { useState } from "react";
import { ChevronDown, MapPin, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { GERMAN_CITIES } from "@/lib/german-cities";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useSelectedCity } from "@/hooks/use-selected-city";

export function LocationPicker() {
  const { city, setCity } = useSelectedCity();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = GERMAN_CITIES.filter((c) =>
    c.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (next: string) => {
    setCity(next);
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
      >
        <MapPin className="w-4 h-4" />
        <span className="max-w-[120px] truncate">{city || "كل ألمانيا"}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          dir="rtl"
          className="h-[85dvh] flex flex-col p-0 max-w-[480px] mx-auto rounded-t-2xl"
        >
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-right">اختر منطقتك</SheetTitle>
          </SheetHeader>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="ابحث عن مدينة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect("")}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-right border-b border-border/50",
                city === "" && "bg-primary/10",
              )}
            >
              <span className="font-bold">كل ألمانيا</span>
              {city === "" && <Check className="w-4 h-4 text-primary" />}
            </button>
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                لا توجد نتائج
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-right border-b border-border/30",
                    city === c && "bg-primary/10",
                  )}
                >
                  <span className="text-sm">{c}</span>
                  {city === c && <Check className="w-4 h-4 text-primary" />}
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
