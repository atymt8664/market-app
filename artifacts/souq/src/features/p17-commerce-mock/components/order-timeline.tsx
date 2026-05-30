import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { P17_MOCK, TIMELINE_STEP_IDS } from "../mock-strings";
import { P17_CARD } from "../styles";

type OrderTimelineProps = {
  activeIndex: number;
};

export function OrderTimeline({ activeIndex }: OrderTimelineProps) {
  return (
    <div className={cn(P17_CARD, "gap-0 p-0 overflow-hidden")} dir="rtl">
      <div className="border-b border-primary/15 px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{P17_MOCK.orders.timelineTitle}</h2>
      </div>
      <ol className="flex flex-col gap-0 px-4 py-3">
        {TIMELINE_STEP_IDS.map((stepId, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          const label = P17_MOCK.timeline[stepId];
          return (
            <li key={stepId} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Circle
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-primary fill-primary/20" : "text-zinc-600",
                    )}
                  />
                )}
                {index < TIMELINE_STEP_IDS.length - 1 ? (
                  <div
                    className={cn(
                      "mt-1 w-0.5 flex-1 min-h-[1.25rem] rounded-full",
                      done ? "bg-primary/50" : "bg-zinc-800",
                    )}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium",
                    done || active ? "text-foreground" : "text-zinc-500",
                  )}
                >
                  {label}
                </p>
                {active ? (
                  <p className="mt-0.5 text-xs text-primary/90">{P17_MOCK.orders.whatHappening}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
