"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { SETTINGS_DROPDOWN_TRIGGER } from "@/components/settings-shell";

export type SettingsSheetSelectOption = { value: string; label: string };

type SettingsSheetSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SettingsSheetSelectOption[] | SettingsSheetSelectOption[];
  sheetTitle: string;
  placeholder?: string;
  "aria-label"?: string;
  id?: string;
  /** Shown on the trigger (e.g. tag icon) */
  leading?: ReactNode;
};

/**
 * City-select style: trigger row + bottom sheet list (no native / Radix popover).
 * Same dark card + lime border language as `city-select.tsx`.
 */
export function SettingsSheetSelect({
  value,
  onValueChange,
  options,
  sheetTitle,
  placeholder = "اختر…",
  "aria-label": ariaLabel,
  id,
  leading,
}: SettingsSheetSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <>
      <button
        id={id}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(SETTINGS_DROPDOWN_TRIGGER, "min-h-[3rem] py-3")}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {leading ? <span className="shrink-0 text-primary">{leading}</span> : null}
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-right text-sm",
              !selectedLabel && "text-zinc-500",
            )}
          >
            {selectedLabel ?? placeholder}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-primary" strokeWidth={2.25} />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          hideClose
          side="bottom"
          dir="rtl"
          className="mx-auto flex h-[min(70dvh,440px)] max-h-[90dvh] w-full max-w-[480px] flex-col gap-0 overflow-hidden rounded-t-2xl border-t border-primary/35 bg-[#0A0A0A] p-0 shadow-[0_-12px_48px_-16px_rgba(0,0,0,0.55)] ring-1 ring-primary/20"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-primary/20 px-4 pb-3 pt-4">
            <SheetTitle className="m-0 flex-1 text-right text-base font-semibold text-white">
              {sheetTitle}
            </SheetTitle>
            <SheetClose
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/45 bg-[#0A0A0A]/90 text-primary transition-colors hover:border-primary/65 hover:bg-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 active:opacity-90"
              aria-label="إغلاق"
            >
              <X className="h-4 w-4" />
            </SheetClose>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-6 pt-3">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-3.5 text-right transition-colors",
                  value === opt.value
                    ? "border-primary bg-primary/15 text-white shadow-[0_0_22px_-14px_hsl(var(--primary)/0.4)]"
                    : "border-primary/25 bg-[#0A0A0A]/75 text-white hover:border-primary/45 hover:bg-black/85",
                )}
              >
                <span className="text-sm font-medium">{opt.label}</span>
                {value === opt.value ? (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-black">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border border-primary/40" aria-hidden />
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
