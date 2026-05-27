import { Hand, UserCheck, UserMinus, UserPlus } from "lucide-react";
import type { StaffAssignment } from "@/features/admin/staff-workflow-types";
import { ADMIN_ROW_ACTION_BASE } from "@/features/admin/admin-interaction-classes";
import { getLocale, t } from "@/i18n";
import { cn } from "@/lib/utils";

type StaffWorkflowPanelProps = {
  assignment: StaffAssignment | null | undefined;
  onClaim: () => void;
  onRelease: () => void;
  onAssign?: () => void;
  canAssign?: boolean;
  busy?: boolean;
};

function formatAssignedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    const locale = getLocale() === "ar" ? "ar-EG" : getLocale() === "de" ? "de-DE" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StaffWorkflowPanel({
  assignment,
  onClaim,
  onRelease,
  onAssign,
  canAssign = false,
  busy = false,
}: StaffWorkflowPanelProps) {
  const owner = assignment?.staffName ?? null;

  return (
    <div className="rounded-xl border border-primary/25 bg-zinc-900/50 p-3 text-right ring-1 ring-primary/8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("p8.admin.workflow.title")}
      </p>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{t("p8.admin.workflow.current_owner")}</dt>
          <dd className="font-medium text-foreground">{owner ?? t("p8.admin.workflow.unassigned")}</dd>
        </div>
        {assignment?.assignedAt ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("p8.admin.workflow.assigned_at")}</dt>
            <dd className="tabular-nums text-foreground">{formatAssignedAt(assignment.assignedAt)}</dd>
          </div>
        ) : null}
        {assignment?.assignedByName ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t("p8.admin.workflow.assigned_by")}</dt>
            <dd className="text-foreground">{assignment.assignedByName}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClaim}
          className={cn(ADMIN_ROW_ACTION_BASE, "border-primary/40 text-primary")}
        >
          <Hand className="h-3.5 w-3.5" aria-hidden />
          {t("p8.admin.workflow.claim")}
        </button>
        <button
          type="button"
          disabled={busy || !owner}
          onClick={onRelease}
          className={cn(ADMIN_ROW_ACTION_BASE, "border-amber-500/40 text-amber-200")}
        >
          <UserMinus className="h-3.5 w-3.5" aria-hidden />
          {t("p8.admin.workflow.release")}
        </button>
        {canAssign && onAssign ? (
          <button
            type="button"
            disabled={busy}
            onClick={onAssign}
            className={cn(ADMIN_ROW_ACTION_BASE, "border-sky-500/40 text-sky-200")}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden />
            {owner ? t("p8.admin.workflow.reassign") : t("p8.admin.workflow.assign_staff")}
          </button>
        ) : null}
        {owner ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-200">
            <UserCheck className="h-3 w-3" aria-hidden />
            {owner}
          </span>
        ) : null}
      </div>
    </div>
  );
}
