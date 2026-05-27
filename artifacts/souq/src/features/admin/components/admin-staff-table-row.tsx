import { memo } from "react";
import { Crown, Shield } from "lucide-react";
import { ADMIN_ROW_ACTION_BASE, ADMIN_TABLE_ROW } from "@/features/admin/admin-interaction-classes";
import type { AdminStaffListItem, AdminStaffStatus } from "@/features/admin/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function formatDt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function statusBadgeClass(status: AdminStaffStatus): string {
  if (status === "active") return "border-emerald-500/40 bg-emerald-950/30 text-emerald-200";
  if (status === "suspended") return "border-amber-500/40 bg-amber-950/30 text-amber-100";
  return "border-red-500/40 bg-red-950/30 text-red-200";
}

export function sessionBadgeClass(status: AdminStaffListItem["sessionStatus"]): string {
  if (status === "online") return "border-emerald-500/40 bg-emerald-950/25 text-emerald-200";
  if (status === "suspended") return "border-amber-500/40 bg-amber-950/25 text-amber-100";
  if (status === "disabled") return "border-red-500/40 bg-red-950/25 text-red-200";
  return "border-zinc-600/50 bg-zinc-900/60 text-muted-foreground";
}

export type AdminStaffTableRowProps = {
  row: AdminStaffListItem;
  busy: boolean;
  onDetail: (id: number) => void;
  onEdit: (row: AdminStaffListItem) => void;
  onQuickStatus: (row: AdminStaffListItem, status: AdminStaffStatus) => void;
  onRevokeSessions: (row: AdminStaffListItem) => void;
};

function AdminStaffTableRowInner({
  row,
  busy,
  onDetail,
  onEdit,
  onQuickStatus,
  onRevokeSessions,
}: AdminStaffTableRowProps) {
  return (
    <tr className={ADMIN_TABLE_ROW}>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-2">
          {row.isFounder ? (
            <Crown className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          ) : (
            <Shield className="h-4 w-4 shrink-0 text-primary/70" aria-hidden />
          )}
          <span className="font-medium">{row.displayName}</span>
        </div>
        {row.isFounder ? (
          <p className="mt-1 text-[10px] text-amber-200/80">{t("p8.admin.staff.founder_protected")}</p>
        ) : null}
      </td>
      <td className="px-3 py-3">{t(`p8.admin.staff.department.${row.departmentKey}`)}</td>
      <td className="px-3 py-3">{t(`p8.admin.roles.${row.roleKey}.title`)}</td>
      <td className="px-3 py-3 font-mono text-xs">{row.loginEmail ?? "—"}</td>
      <td className="px-3 py-3">
        <span
          className={cn(
            "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium",
            statusBadgeClass(row.status),
          )}
        >
          {t(`p8.admin.staff.status.${row.status}`)}
        </span>
        <span
          className={cn(
            "mr-2 inline-flex rounded-full border px-2 py-0.5 text-[10px]",
            sessionBadgeClass(row.sessionStatus),
          )}
        >
          {t(`p8.admin.staff.session.${row.sessionStatus}`)}
        </span>
      </td>
      <td className="px-3 py-3 font-mono text-xs tabular-nums">{formatDt(row.lastSeenAt)}</td>
      <td className="px-3 py-3 font-mono text-xs tabular-nums">{formatDt(row.createdAt)}</td>
      <td className="px-3 py-3 tabular-nums">{row.activeSessions}</td>
      <td className="px-3 py-3">
        <p className="font-mono text-xs tabular-nums">{formatDt(row.lastActivityAt)}</p>
        {row.lastActivityAction ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">{row.lastActivityAction}</p>
        ) : null}
      </td>
      <td className="px-3 py-3 tabular-nums">{row.assignedItemsCount}</td>
      <td className="px-3 py-3">
        <div className="flex flex-wrap justify-end gap-1.5">
          <button
            type="button"
            className={cn(ADMIN_ROW_ACTION_BASE, "border-primary/30 text-primary")}
            onClick={() => onDetail(row.id)}
          >
            {t("p8.admin.staff.action_detail")}
          </button>
          {!row.isFounder ? (
            <>
              <button
                type="button"
                className={cn(ADMIN_ROW_ACTION_BASE, "border-sky-500/35 text-sky-200")}
                onClick={() => onEdit(row)}
                disabled={busy}
              >
                {t("p8.admin.staff.action_edit")}
              </button>
              {row.status !== "suspended" ? (
                <button
                  type="button"
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-amber-500/35 text-amber-100")}
                  onClick={() => onQuickStatus(row, "suspended")}
                  disabled={busy}
                >
                  {t("p8.admin.staff.action_suspend")}
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-emerald-500/35 text-emerald-200")}
                  onClick={() => onQuickStatus(row, "active")}
                  disabled={busy}
                >
                  {t("p8.admin.staff.action_activate")}
                </button>
              )}
              {row.status !== "disabled" ? (
                <button
                  type="button"
                  className={cn(ADMIN_ROW_ACTION_BASE, "border-red-500/35 text-red-200")}
                  onClick={() => onQuickStatus(row, "disabled")}
                  disabled={busy}
                >
                  {t("p8.admin.staff.action_disable")}
                </button>
              ) : null}
              <button
                type="button"
                className={cn(ADMIN_ROW_ACTION_BASE, "border-violet-500/35 text-violet-200")}
                onClick={() => onRevokeSessions(row)}
                disabled={busy}
              >
                {t("p8.admin.staff.action_revoke_sessions")}
              </button>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export const AdminStaffTableRow = memo(AdminStaffTableRowInner);
