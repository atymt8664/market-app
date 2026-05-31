import { Crown } from "lucide-react";
import { dashboardContractAttrs } from "@/features/admin/dashboard-contracts";
import { CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const ROLE_KEYS = [
  "founder",
  "moderator",
  "support",
  "verification",
  "analyst",
  "finance_manager",
  "admin_manager",
] as const;

/** RBAC architecture contract — enforcement in P8F (no DB in P8C). */
export function RolesPermissionsFoundation() {
  return (
    <section
      className={cn(CARD_SHELL, "p-4")}
      aria-labelledby="admin-roles-foundation-title"
      {...dashboardContractAttrs("monitoring.roles_staff_summary")}
    >
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/45 bg-amber-500/10 text-amber-200">
          <Crown className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1 text-right">
          <h2 id="admin-roles-foundation-title" className="text-lg font-semibold text-foreground">
            {t("p8.admin.roles.foundation.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("p8.admin.roles.foundation.subtitle")}</p>
        </div>
      </div>

      <p className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 text-right text-[13px] leading-relaxed text-amber-100/90">
        {t("p8.admin.roles.foundation.contract_note")}
      </p>

      <div className="space-y-3">
        {ROLE_KEYS.map((role) => (
          <div
            key={role}
            className={cn(
              "rounded-xl border p-3 text-right ring-1",
              role === "founder"
                ? "border-amber-500/45 bg-amber-950/25 ring-amber-500/15"
                : "border-primary/20 bg-zinc-900/50 ring-primary/5",
            )}
          >
            <p className="font-semibold text-foreground">{t(`p8.admin.roles.${role}.title`)}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t(`p8.admin.roles.${role}.scope`)}</p>
            {role === "founder" ? (
              <p className="mt-2 text-xs font-medium text-amber-200/90">{t("p8.admin.executive.permissions.full")}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
