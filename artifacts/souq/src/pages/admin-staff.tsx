import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_STAFF_META, suggestStaffLoginEmail } from "@/features/admin/staff-meta-defaults";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  Copy,
  Crown,
  Loader2,
  Plus,
  RefreshCw,
  Shield,
  UserCog,
  Users,
  BarChart3,
  KeyRound,
  Mail,
  Activity,
  type LucideIcon,
} from "lucide-react";
import {
  adminLogout,
  createAdminStaffMember,
  revokeAdminStaffMemberSessions,
  updateAdminStaffMember,
} from "@/features/admin/api";
import {
  ADMIN_SCROLL_Y,
  BTN_MODAL_GHOST,
  BTN_MODAL_PRIMARY,
  BTN_TOOLBAR_OUTLINE,
  BTN_TOOLBAR_PRIMARY,
  CARD_SHELL,
  DIALOG_SURFACE_RTL,
  INPUT_FIELD,
  MODAL_BODY,
  MODAL_FIELD_GROUP,
  MODAL_HEADER_RTL,
  MODAL_LABEL,
  MODAL_SCROLL,
  MODAL_SECTION_CARD,
  MODAL_SECTION_TITLE,
  SURFACE_TABLE_WRAP,
  SUB_CARD,
  adminPillBtn,
} from "@/features/admin/admin-interaction-classes";
import { AdminScrollableTable } from "@/features/admin/components/admin-scrollable-table";
import { AdminPaginationBar } from "@/features/admin/components/admin-pagination-bar";
import { AdminSelectField } from "@/features/admin/components/admin-select-field";
import {
  AdminStaffTableRow,
  formatDt,
  statusBadgeClass,
} from "@/features/admin/components/admin-staff-table-row";
import { AdminShell } from "@/features/admin/components/admin-shell";
import { useAdminAccess } from "@/features/admin/access";
import { useAdminStaffDetail, useAdminStaffList, useAdminStaffMeta, useRequireAdmin } from "@/features/admin/hooks";
import { useAdminRouteGuard } from "@/features/admin/access";
import type { AdminDepartmentKey, AdminRoleKey } from "@/features/admin/rbac";
import type { AdminStaffListItem, AdminStaffStatus } from "@/features/admin/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

function StaffModalSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className={MODAL_SECTION_CARD}>
      <h3 className={MODAL_SECTION_TITLE}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}

export default function AdminStaffPage() {
  useRequireAdmin();
  useAdminRouteGuard("/admin/staff");
  const access = useAdminAccess();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canStaff = access.isFounder || access.can("staff");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const staffQuery = useAdminStaffList({ page, pageSize }, canStaff && !access.isLoading);
  const metaQuery = useAdminStaffMeta(canStaff && !access.isLoading);

  const [filter, setFilter] = useState<"all" | AdminStaffStatus>("all");
  const [departmentFilter, setDepartmentFilter] = useState<"all" | AdminDepartmentKey>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminStaffListItem | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createEmailTouched, setCreateEmailTouched] = useState(false);
  const [createDepartment, setCreateDepartment] = useState<AdminDepartmentKey>("moderation");
  const [createRole, setCreateRole] = useState<AdminRoleKey>("moderator");
  const [tempPasswordReveal, setTempPasswordReveal] = useState<{
    staffName: string;
    loginEmail: string;
    password: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editDepartment, setEditDepartment] = useState<AdminDepartmentKey>("moderation");
  const [editRole, setEditRole] = useState<AdminRoleKey>("moderator");
  const [editStatus, setEditStatus] = useState<AdminStaffStatus>("active");
  const [busy, setBusy] = useState(false);

  const detailQuery = useAdminStaffDetail(detailId);

  const departmentOptions =
    metaQuery.data?.departments?.length ? metaQuery.data.departments : DEFAULT_STAFF_META.departments;

  const suggestedEmail = useMemo(
    () =>
      createName.trim()
        ? suggestStaffLoginEmail({
            displayName: createName,
            departmentKey: createDepartment,
            roleKey: createRole,
          })
        : "",
    [createName, createDepartment, createRole],
  );

  const effectiveCreateEmail = createEmailTouched ? createEmail.trim().toLowerCase() : "";
  const rolesForCreateDepartment =
    departmentOptions.find((d) => d.key === createDepartment)?.roles ?? [];
  const rolesForEditDepartment =
    departmentOptions.find((d) => d.key === editDepartment)?.roles ?? [];

  const staffItems = staffQuery.data?.items ?? [];
  const pagination = staffQuery.data?.pagination;

  useEffect(() => {
    setPage(1);
  }, [filter, departmentFilter]);

  const rows = useMemo(() => {
    let list = staffItems;
    if (departmentFilter !== "all") {
      list = list.filter((row) => row.departmentKey === departmentFilter);
    }
    if (filter !== "all") {
      list = list.filter((row) => row.status === filter);
    }
    return list;
  }, [staffItems, filter, departmentFilter]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });
    if (detailId != null) {
      await queryClient.invalidateQueries({ queryKey: ["admin", "staff", "detail", detailId] });
    }
  };

  const openEdit = (row: AdminStaffListItem) => {
    setEditTarget(row);
    setEditName(row.displayName);
    setEditDepartment(row.departmentKey);
    setEditRole(row.roleKey);
    setEditStatus(row.status);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    const email = effectiveCreateEmail;
    if (!name) {
      toast({ title: t("p8.admin.staff.err_name"), variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const created = await createAdminStaffMember({
        displayName: name,
        roleKey: createRole,
        departmentKey: createDepartment,
        loginEmail: email || undefined,
      });
      await invalidate();
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreateEmailTouched(false);
      setCreateDepartment("moderation");
      setCreateRole("moderator");
      setTempPasswordReveal({
        staffName: created.staff.displayName,
        loginEmail: created.staff.loginEmail ?? email ?? suggestedEmail,
        password: created.temporaryPassword,
      });
    } catch (error) {
      toast({
        title: t("p8.admin.staff.err_save"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setBusy(true);
    try {
      await updateAdminStaffMember(editTarget.id, {
        displayName: editName.trim(),
        roleKey: editRole,
        departmentKey: editDepartment,
        status: editStatus,
      });
      await invalidate();
      setEditTarget(null);
      toast({ title: t("p8.admin.staff.updated") });
    } catch (error) {
      toast({
        title: t("p8.admin.staff.err_save"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleQuickStatus = async (row: AdminStaffListItem, status: AdminStaffStatus) => {
    if (row.isFounder) return;
    setBusy(true);
    try {
      await updateAdminStaffMember(row.id, { status });
      await invalidate();
      toast({ title: t("p8.admin.staff.updated") });
    } catch (error) {
      toast({
        title: t("p8.admin.staff.err_save"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSessions = async (row: AdminStaffListItem) => {
    if (row.isFounder) return;
    setBusy(true);
    try {
      const result = await revokeAdminStaffMemberSessions(row.id);
      await invalidate();
      toast({
        title: t("p8.admin.staff.sessions_revoked"),
        description: t("p8.admin.staff.sessions_revoked_count", { count: result.revoked }),
      });
    } catch (error) {
      toast({
        title: t("p8.admin.staff.err_save"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  if (!canStaff) {
    return (
      <AdminShell activeKey="staff" onLogout={handleLogout}>
        <div className={cn(CARD_SHELL, "p-6 text-right text-amber-100")}>
          <p className="font-medium">{t("p8.admin.staff.forbidden")}</p>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell activeKey="staff" onLogout={handleLogout}>
      <div className="space-y-5">
        <header className={cn(CARD_SHELL, "p-5")}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <UserCog className="h-6 w-6 text-primary" aria-hidden />
                <h1 className="text-xl font-bold sm:text-2xl">{t("p8.admin.staff.title")}</h1>
              </div>
              <p className="text-sm text-muted-foreground">{t("p8.admin.staff.subtitle")}</p>
              <p className="text-xs text-muted-foreground">{t("p8.admin.staff.rbac_note")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className={BTN_TOOLBAR_PRIMARY}
                onClick={() => staffQuery.refetch()}
                disabled={staffQuery.isFetching}
              >
                <RefreshCw className={cn("h-4 w-4", staffQuery.isFetching && "animate-spin")} />
                {t("p8.admin.staff.refresh")}
              </Button>
              <Button type="button" className={BTN_TOOLBAR_PRIMARY} onClick={() => {
                setCreateName("");
                setCreateEmail("");
                setCreateEmailTouched(false);
                setCreateDepartment("moderation");
                setCreateRole("moderator");
                setCreateOpen(true);
              }}>
                <Plus className="h-4 w-4" />
                {t("p8.admin.staff.add")}
              </Button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { key: "total", label: t("p8.admin.staff.stat_total"), value: pagination?.totalItems ?? staffItems.length },
            {
              key: "active",
              label: t("p8.admin.staff.stat_active"),
              value: staffItems.filter((r) => r.status === "active").length,
            },
            {
              key: "online",
              label: t("p8.admin.staff.stat_online"),
              value: staffItems.filter((r) => r.sessionStatus === "online").length,
            },
            {
              key: "assigned",
              label: t("p8.admin.staff.stat_assigned"),
              value: staffItems.reduce((sum, r) => sum + r.assignedItemsCount, 0),
            },
          ].map((stat) => (
            <div key={stat.key} className={SUB_CARD}>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-primary">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className={CARD_SHELL}>
          <div className="border-b border-primary/15 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">{t("p8.admin.staff.departments_title")}</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={adminPillBtn(departmentFilter === "all")} onClick={() => setDepartmentFilter("all")}>
                {t("p8.admin.staff.filter.all")}
              </button>
              {departmentOptions.map((dept) => (
                <button
                  key={dept.key}
                  type="button"
                  className={adminPillBtn(departmentFilter === dept.key)}
                  onClick={() => setDepartmentFilter(dept.key)}
                >
                  {t(dept.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={CARD_SHELL}>
          <div className="flex flex-wrap gap-2 border-b border-primary/15 p-4">
            {(["all", "active", "suspended", "disabled"] as const).map((key) => (
              <button
                key={key}
                type="button"
                className={adminPillBtn(filter === key)}
                onClick={() => setFilter(key)}
              >
                {t(`p8.admin.staff.filter.${key}`)}
              </button>
            ))}
          </div>

          {staffQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("p8.admin.staff.loading")}
            </div>
          ) : staffQuery.isError ? (
            <div className="space-y-3 p-8 text-center">
              <p className="text-amber-100">{t("p8.admin.staff.load_error")}</p>
              <Button type="button" className={BTN_TOOLBAR_PRIMARY} onClick={() => staffQuery.refetch()}>
                {t("p8.admin.page.retry")}
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-50" />
              <p>{t("p8.admin.staff.empty")}</p>
            </div>
          ) : (
            <AdminScrollableTable
              items={rows}
              minWidth="min-w-[960px]"
              className="rounded-none border-0 shadow-none ring-0"
              tableClassName="text-right"
              head={
                <tr className="border-b border-primary/20 bg-zinc-950/80 text-xs text-muted-foreground">
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_name")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_department")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_role")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_email")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_status")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_last_seen")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_created")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_sessions")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_last_activity")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_assigned")}</th>
                  <th className="px-3 py-3 font-medium">{t("p8.admin.staff.col_actions")}</th>
                </tr>
              }
              getRowKey={(row) => row.id}
              renderRow={(row) => (
                <AdminStaffTableRow
                  row={row}
                  busy={busy}
                  onDetail={setDetailId}
                  onEdit={openEdit}
                  onQuickStatus={handleQuickStatus}
                  onRevokeSessions={handleRevokeSessions}
                />
              )}
            />
          )}

          <AdminPaginationBar
            pagination={pagination}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
            isLoading={staffQuery.isFetching}
            className="rounded-none border-0 shadow-none ring-0"
          />
        </section>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className={cn(DIALOG_SURFACE_RTL, "max-w-lg")}>
          <DialogHeader className={MODAL_HEADER_RTL}>
            <DialogTitle className="text-foreground">{t("p8.admin.staff.add_title")}</DialogTitle>
            <DialogDescription>{t("p8.admin.staff.add_hint")}</DialogDescription>
          </DialogHeader>
          <div className={MODAL_BODY}>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="staff-dept" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_department")}
              </Label>
              <AdminSelectField
                id="staff-dept"
                value={createDepartment}
                onValueChange={(dept) => {
                  setCreateDepartment(dept as AdminDepartmentKey);
                  const firstRole = departmentOptions.find((d) => d.key === dept)?.roles[0]?.key;
                  if (firstRole) setCreateRole(firstRole);
                }}
                options={departmentOptions.map((dept) => ({
                  value: dept.key,
                  label: t(dept.labelKey),
                }))}
              />
            </div>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="staff-role" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_role")}
              </Label>
              <AdminSelectField
                id="staff-role"
                value={createRole}
                onValueChange={(role) => setCreateRole(role as AdminRoleKey)}
                options={rolesForCreateDepartment.map((role) => ({
                  value: role.key,
                  label: t(role.labelKey),
                }))}
              />
            </div>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="staff-name" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_name")}
              </Label>
              <Input
                id="staff-name"
                className={INPUT_FIELD}
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="staff-email" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_email")}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t("p8.admin.staff.field_email_optional")})
                </span>
              </Label>
              <Input
                id="staff-email"
                type="email"
                className={INPUT_FIELD}
                value={createEmail}
                onChange={(e) => {
                  setCreateEmailTouched(true);
                  setCreateEmail(e.target.value);
                }}
                placeholder={suggestedEmail || t("p8.admin.staff.field_email_placeholder")}
                dir="ltr"
              />
              {suggestedEmail ? (
                <div className={cn(MODAL_SECTION_CARD, "space-y-2 p-3 shadow-none")}>
                  <p className="text-xs font-medium text-primary">{t("p8.admin.staff.email_preview_title")}</p>
                  <p className="font-mono text-sm text-primary" dir="ltr">
                    {effectiveCreateEmail || suggestedEmail}
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {t("p8.admin.staff.email_preview_hint")}
                  </p>
                  {createEmailTouched && createEmail.trim() ? (
                    <p className="text-[11px] text-amber-200/90">{t("p8.admin.staff.email_manual_note")}</p>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(BTN_TOOLBAR_OUTLINE, "h-8 font-mono text-xs")}
                      onClick={() => {
                        setCreateEmail(suggestedEmail);
                        setCreateEmailTouched(true);
                      }}
                    >
                      {t("p8.admin.staff.email_use_suggested")}
                    </Button>
                  )}
                </div>
              ) : null}
            </div>
            <p className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/90">
              {t("p8.admin.staff.add_account_note")}
            </p>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" className={BTN_MODAL_PRIMARY} onClick={handleCreate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("p8.admin.staff.save")}
            </Button>
            <Button type="button" className={BTN_MODAL_GHOST} variant="ghost" onClick={() => setCreateOpen(false)}>
              {t("p8.admin.staff.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget != null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className={cn(DIALOG_SURFACE_RTL, "max-w-lg")}>
          <DialogHeader className={MODAL_HEADER_RTL}>
            <DialogTitle className="text-foreground">{t("p8.admin.staff.edit_title")}</DialogTitle>
            <DialogDescription>{t("p8.admin.staff.edit_hint")}</DialogDescription>
          </DialogHeader>
          <div className={MODAL_BODY}>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="edit-dept" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_department")}
              </Label>
              <AdminSelectField
                id="edit-dept"
                value={editDepartment}
                onValueChange={(dept) => {
                  setEditDepartment(dept as AdminDepartmentKey);
                  const firstRole = departmentOptions.find((d) => d.key === dept)?.roles[0]?.key;
                  if (firstRole) setEditRole(firstRole);
                }}
                options={departmentOptions.map((dept) => ({
                  value: dept.key,
                  label: t(dept.labelKey),
                }))}
              />
            </div>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="edit-role" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_role")}
              </Label>
              <AdminSelectField
                id="edit-role"
                value={editRole}
                onValueChange={(role) => setEditRole(role as AdminRoleKey)}
                options={rolesForEditDepartment.map((role) => ({
                  value: role.key,
                  label: t(role.labelKey),
                }))}
              />
            </div>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="edit-name" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_name")}
              </Label>
              <Input
                id="edit-name"
                className={INPUT_FIELD}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className={MODAL_FIELD_GROUP}>
              <Label htmlFor="edit-status" className={MODAL_LABEL}>
                {t("p8.admin.staff.field_status")}
              </Label>
              <AdminSelectField
                id="edit-status"
                value={editStatus}
                onValueChange={(status) => setEditStatus(status as AdminStaffStatus)}
                options={(["active", "suspended", "disabled"] as const).map((status) => ({
                  value: status,
                  label: t(`p8.admin.staff.status.${status}`),
                }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" className={BTN_MODAL_PRIMARY} onClick={handleUpdate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("p8.admin.staff.save")}
            </Button>
            <Button type="button" className={BTN_MODAL_GHOST} variant="ghost" onClick={() => setEditTarget(null)}>
              {t("p8.admin.staff.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailId != null} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className={cn(DIALOG_SURFACE_RTL, "max-h-[90vh] max-w-3xl gap-0 overflow-hidden p-0")}>
          <div className="border-b border-primary/20 px-6 pb-4 pt-6">
            <DialogHeader className={MODAL_HEADER_RTL}>
              <DialogTitle className="text-foreground">{t("p8.admin.staff.detail_title")}</DialogTitle>
              <DialogDescription>{t("p8.admin.staff.detail_hint")}</DialogDescription>
            </DialogHeader>
          </div>
          {detailQuery.isLoading ? (
            <div className="flex items-center gap-2 px-6 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              {t("p8.admin.staff.loading")}
            </div>
          ) : detailQuery.data ? (
            <div className={cn(MODAL_SCROLL, "px-6 py-4")}>
              <StaffModalSection title={t("p8.admin.staff.section_profile")} icon={UserCog}>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <DetailField label={t("p8.admin.staff.col_name")}>
                    <span className="flex items-center justify-end gap-2">
                      {detailQuery.data.staff.isFounder ? (
                        <Crown className="h-4 w-4 text-amber-300" aria-hidden />
                      ) : null}
                      {detailQuery.data.staff.displayName}
                    </span>
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.col_department")}>
                    {t(`p8.admin.staff.department.${detailQuery.data.staff.departmentKey}`)}
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.col_email")}>
                    <span dir="ltr" className="font-mono text-xs">
                      {detailQuery.data.staff.loginEmail ?? "—"}
                    </span>
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.col_status")}>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2 py-0.5 text-xs",
                        statusBadgeClass(detailQuery.data.staff.status),
                      )}
                    >
                      {t(`p8.admin.staff.status.${detailQuery.data.staff.status}`)}
                    </span>
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.col_created")}>
                    <span className="font-mono text-xs tabular-nums">{formatDt(detailQuery.data.staff.createdAt)}</span>
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.col_last_seen")}>
                    <span className="font-mono text-xs tabular-nums">{formatDt(detailQuery.data.staff.lastSeenAt)}</span>
                  </DetailField>
                </dl>
              </StaffModalSection>

              <StaffModalSection title={t("p8.admin.staff.section_permissions")} icon={Shield}>
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-foreground">
                    {t(`p8.admin.roles.${detailQuery.data.staff.roleKey}.title`)}
                  </p>
                  <p className="leading-relaxed text-muted-foreground">
                    {t(`p8.admin.roles.${detailQuery.data.staff.roleKey}.scope`)}
                  </p>
                </div>
              </StaffModalSection>

              <StaffModalSection title={t("p8.admin.staff.section_metrics")} icon={BarChart3}>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <DetailField label={t("p8.admin.staff.metric_ops_today")}>
                    <span className="tabular-nums text-primary">{detailQuery.data.staff.operationsToday}</span>
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.metric_reports_today")}>
                    <span className="tabular-nums text-primary">{detailQuery.data.staff.reportsProcessedToday}</span>
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.metric_tickets_today")}>
                    <span className="tabular-nums text-primary">{detailQuery.data.staff.ticketsProcessedToday}</span>
                  </DetailField>
                  <DetailField label={t("p8.admin.staff.col_assigned")}>
                    <span className="tabular-nums text-primary">{detailQuery.data.staff.assignedItemsCount}</span>
                  </DetailField>
                </dl>
              </StaffModalSection>

              <StaffModalSection title={t("p8.admin.staff.section_sessions")} icon={KeyRound}>
                {detailQuery.data.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("p8.admin.staff.sessions_empty")}</p>
                ) : (
                  <ul className="space-y-2">
                    {detailQuery.data.sessions.map((session) => (
                      <li
                        key={session.sessionId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-zinc-950/80 px-3 py-2 text-xs transition-colors hover:border-primary/40"
                      >
                        <span className="font-mono text-zinc-300">{session.sessionId.slice(0, 12)}…</span>
                        <span className="font-mono tabular-nums text-muted-foreground">{formatDt(session.expiresAt)}</span>
                        {session.isCurrent ? (
                          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                            {t("p8.admin.staff.session_current")}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </StaffModalSection>

              <StaffModalSection title={t("p8.admin.staff.section_activity")} icon={Activity}>
                {detailQuery.data.activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("p8.admin.staff.activity_empty")}</p>
                ) : (
                  <ul className={cn(ADMIN_SCROLL_Y, "max-h-52 space-y-2 pe-1")}>
                    {detailQuery.data.activity.map((entry) => (
                      <li
                        key={entry.id}
                        className="rounded-xl border border-primary/20 bg-zinc-950/75 px-3 py-2 text-xs transition-colors hover:border-primary/35"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-primary">{entry.action}</span>
                          <span className="font-mono tabular-nums text-muted-foreground">
                            {formatDt(entry.createdAt)}
                          </span>
                        </div>
                        {entry.reason ? (
                          <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </StaffModalSection>
            </div>
          ) : null}
          <DialogFooter className="border-t border-primary/20 px-6 py-4">
            <Button type="button" className={BTN_MODAL_GHOST} variant="ghost" onClick={() => setDetailId(null)}>
              {t("p8.admin.staff.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={tempPasswordReveal != null}
        onOpenChange={(open) => {
          if (!open) setTempPasswordReveal(null);
        }}
      >
        <DialogContent className={cn(DIALOG_SURFACE_RTL, "max-w-md border-amber-500/40")}>
          <DialogHeader className={MODAL_HEADER_RTL}>
            <DialogTitle className="text-amber-100">{t("p8.admin.staff.temp_pw_title")}</DialogTitle>
            <DialogDescription className="text-amber-200/80">{t("p8.admin.staff.temp_pw_hint")}</DialogDescription>
          </DialogHeader>
          {tempPasswordReveal ? (
            <div className={MODAL_BODY}>
              <div className={MODAL_SECTION_CARD}>
                <div className="flex items-start gap-2 text-sm">
                  <UserCog className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <p>
                    <span className="text-muted-foreground">{t("p8.admin.staff.field_name")}: </span>
                    <span className="font-semibold">{tempPasswordReveal.staffName}</span>
                  </p>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <p>
                    <span className="text-muted-foreground">{t("p8.admin.staff.field_email")}: </span>
                    <span dir="ltr" className="font-mono text-xs text-primary">
                      {tempPasswordReveal.loginEmail}
                    </span>
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-amber-500/40 bg-amber-950/25 p-4 ring-1 ring-amber-500/15">
                <p className="mb-2 text-xs text-amber-100">{t("p8.admin.staff.temp_pw_once")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded-xl border border-primary/25 bg-zinc-950/80 px-3 py-2 font-mono text-sm text-primary" dir="ltr">
                    {tempPasswordReveal.password}
                  </code>
                  <Button
                    type="button"
                    size="sm"
                    className={BTN_TOOLBAR_OUTLINE}
                    onClick={() => {
                      void navigator.clipboard.writeText(tempPasswordReveal.password);
                      toast({ title: t("p8.admin.staff.temp_pw_copied") });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-start">
            <Button type="button" className={BTN_MODAL_PRIMARY} onClick={() => setTempPasswordReveal(null)}>
              {t("p8.admin.staff.temp_pw_ack")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
