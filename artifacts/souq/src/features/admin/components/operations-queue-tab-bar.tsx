import { CARD_SHELL, adminPillBtn } from "@/features/admin/admin-interaction-classes";
import {
  OPS_QUEUE_TABS,
  type DomainQueueCountsView,
  type OpsQueueKey,
} from "@/features/admin/operations-queue-types";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

type OperationsQueueTabBarProps = {
  queue: OpsQueueKey;
  counts: DomainQueueCountsView | null | undefined;
  onChange: (queue: OpsQueueKey) => void;
  className?: string;
};

export function OperationsQueueTabBar({
  queue,
  counts,
  onChange,
  className,
}: OperationsQueueTabBarProps) {
  return (
    <section className={cn(CARD_SHELL, className)}>
      <h2 className="mb-3 text-right text-sm font-semibold text-foreground">
        {t("p8.admin.workflow.queues_title")}
      </h2>
      <div className="flex flex-wrap gap-2">
        {OPS_QUEUE_TABS.map((tab) => {
          const active = queue === tab.key;
          const count = counts?.[tab.countKey] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cn(adminPillBtn(active), "gap-2")}
            >
              {t(tab.labelKey)}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                  active ? "bg-black/20" : "bg-zinc-800",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
