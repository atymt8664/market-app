import type { ReactNode } from "react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const sheetSurface =
  "flex max-h-[min(90dvh,720px)] flex-col gap-0 rounded-t-2xl border-x-0 border-b-0 border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20";

export function ProfileStatsDetailSheet({
  open,
  onOpenChange,
  title,
  children,
  dir = "rtl",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  dir?: "rtl" | "ltr";
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        dir={dir}
        className={cn(sheetSurface, "sm:mx-auto sm:max-w-lg")}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4">
          <SheetTitle className={cn("m-0 flex-1 text-base font-semibold text-white", dir === "rtl" ? "text-right" : "text-left")}>
            {title}
          </SheetTitle>
          <SheetClose asChild>
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30"
              aria-label="close"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">{title}</SheetDescription>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
