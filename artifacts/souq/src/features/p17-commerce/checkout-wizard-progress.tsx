import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckoutWizardProgressProps = {
  activeStep: 0 | 1;
  labels: [string, string];
};

export function CheckoutWizardProgress({ activeStep, labels }: CheckoutWizardProgressProps) {
  return (
    <div
      className="mx-auto flex w-full max-w-[900px] items-center justify-center gap-2 px-4 py-3 md:max-w-[760px] md:px-6"
      dir="rtl"
      data-testid="p17-checkout-wizard-progress"
    >
      {labels.map((label, index) => {
        const done = index < activeStep;
        const active = index === activeStep;
        return (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                done || active
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-zinc-600 text-zinc-500",
              )}
              aria-hidden
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
            </div>
            <span
              className={cn(
                "truncate text-[11px] font-semibold md:text-xs",
                active ? "text-primary" : "text-zinc-500",
              )}
            >
              {label}
            </span>
            {index < labels.length - 1 ? (
              <div
                className={cn(
                  "mx-1 h-px min-w-[12px] flex-1",
                  done ? "bg-primary/50" : "bg-zinc-700",
                )}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
