import {
  AlertTriangle,
  BadgeCheck,
  Flag,
  LifeBuoy,
  Megaphone,
  Radio,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import type { AdminNotificationRow } from "@/features/admin/api/notifications";
import {
  adminCategoryI18nKey,
  adminPriorityI18nKey,
  adminPriorityTone,
} from "@/lib/admin-notification-center";
import { formatAdminDateTime } from "@/features/admin/admin-locale";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS = {
  moderation: Megaphone,
  reports: Flag,
  support: LifeBuoy,
  verification: BadgeCheck,
  operations: Workflow,
  security: ShieldAlert,
  system: Radio,
} as const;

const PRIORITY_STYLES = {
  critical: "border-red-500/50 bg-red-950/25 ring-red-500/20",
  high: "border-orange-500/45 bg-orange-950/20 ring-orange-500/15",
  medium: "border-amber-500/35 bg-amber-950/15 ring-amber-500/10",
  low: "border-primary/25 bg-zinc-950/50 ring-primary/8",
} as const;

const PRIORITY_BADGE = {
  critical: "bg-red-500/20 text-red-200 border-red-500/40",
  high: "bg-orange-500/20 text-orange-100 border-orange-500/35",
  medium: "bg-amber-500/15 text-amber-100 border-amber-500/30",
  low: "bg-zinc-800/80 text-muted-foreground border-primary/20",
} as const;

type Props = {
  item: AdminNotificationRow;
  busy?: boolean;
  onOpen: (item: AdminNotificationRow) => void;
};

export function AdminNotificationItem({ item, busy, onOpen }: Props) {
  const Icon = CATEGORY_ICONS[item.category] ?? AlertTriangle;
  const tone = adminPriorityTone(item.priorityLabel);
  const isUnread = !item.readAt;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onOpen(item)}
      className={cn(
        "w-full rounded-2xl border p-3.5 text-right transition active:scale-[0.99]",
        "ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        PRIORITY_STYLES[tone],
        isUnread && "shadow-[0_0_18px_-10px_hsl(var(--primary)/0.35)]",
        busy && "opacity-70",
      )}
      data-admin-notification-id={item.id}
      data-admin-notification-category={item.category}
      data-admin-notification-priority={item.priorityLabel}
      data-admin-notification-unread={isUnread ? "1" : "0"}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            isUnread ? "border-primary/45 bg-primary/12 text-primary" : "border-primary/20 bg-zinc-900/60 text-muted-foreground",
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                PRIORITY_BADGE[tone],
              )}
            >
              {t(adminPriorityI18nKey(item.priorityLabel))}
            </span>
            <span className="rounded-full border border-primary/25 bg-zinc-900/50 px-2 py-0.5 text-[10px] text-muted-foreground">
              {t(adminCategoryI18nKey(item.category))}
            </span>
            {isUnread ? (
              <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" aria-hidden />
            ) : null}
          </div>
          <p className={cn("text-sm font-semibold text-foreground", isUnread && "text-primary-foreground")}>
            {item.title}
          </p>
          {item.body ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
          ) : null}
          <p className="text-[11px] text-muted-foreground/80">
            {formatAdminDateTime(item.createdAt, getLocale())}
          </p>
        </div>
      </div>
    </button>
  );
}
