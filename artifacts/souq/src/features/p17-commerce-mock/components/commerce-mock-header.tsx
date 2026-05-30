import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { P17_BACK_BTN, P17_HEADER, P17_HEADER_INNER } from "../styles";

type CommerceMockHeaderProps = {
  title: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
};

export function CommerceMockHeader({ title, onBack, trailing }: CommerceMockHeaderProps) {
  return (
    <header className={P17_HEADER} dir="rtl">
      <div className={P17_HEADER_INNER}>
        <button
          type="button"
          aria-label="رجوع"
          className={P17_BACK_BTN}
          onClick={onBack ?? (() => window.history.back())}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold text-foreground">{title}</h1>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center">{trailing ?? null}</div>
      </div>
    </header>
  );
}

type CheckoutWizardProgressProps = {
  activeStep: 0 | 1 | 2;
  labels: [string, string, string];
};

export function CheckoutWizardProgress({ activeStep, labels }: CheckoutWizardProgressProps) {
  return (
    <div className="px-2 py-3" dir="rtl">
      <div className="flex items-center justify-between gap-1">
        {labels.map((label, index) => {
          const done = index < activeStep;
          const active = index === activeStep;
          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      done || active ? "bg-primary/70" : "bg-zinc-800",
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    done && "border-primary/60 bg-primary/20 text-primary",
                    active && "border-primary bg-primary/30 text-primary shadow-[0_0_14px_-4px_hsl(var(--primary)/0.5)]",
                    !done && !active && "border-zinc-700 bg-zinc-900 text-zinc-500",
                  )}
                >
                  {done ? "✓" : index + 1}
                </div>
                {index < labels.length - 1 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      index < activeStep ? "bg-primary/70" : "bg-zinc-800",
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <span
                className={cn(
                  "truncate text-[10px] font-medium",
                  active ? "text-primary" : done ? "text-zinc-300" : "text-zinc-500",
                )}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
