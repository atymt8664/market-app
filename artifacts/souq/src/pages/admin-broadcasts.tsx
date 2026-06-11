import { useMemo, useState } from "react";
import { Loader2, Radio, Send, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { adminLogout } from "@/features/admin/api";
import { AdminShell } from "@/features/admin/components/admin-shell";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminPageLoading,
} from "@/features/admin/components/admin-page-states";
import { useAdminAccess } from "@/features/admin/access";
import { useRequireAdmin } from "@/features/admin/hooks";
import {
  useAdminBroadcastsQuery,
  useCreateBroadcastMutation,
  usePreviewBroadcastMutation,
  useSendBroadcastMutation,
} from "@/features/admin/hooks/use-admin-broadcasts";
import type {
  BroadcastAudience,
  BroadcastCategory,
  BroadcastPreview,
} from "@/features/admin/api/broadcasts";
import { CARD_SHELL } from "@/features/admin/admin-interaction-classes";
import { useAdminLocale } from "@/features/admin/hooks/use-admin-locale";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const CATEGORIES: BroadcastCategory[] = [
  "platform_update",
  "new_feature",
  "scheduled_maintenance",
  "security_alert",
  "official_announcement",
];

export default function AdminBroadcastsPage() {
  const { dir, formatNumber } = useAdminLocale();
  const [, navigate] = useLocation();
  const access = useAdminAccess();
  const meQuery = useRequireAdmin();
  const listQuery = useAdminBroadcastsQuery(!meQuery.isLoading && access.isFounder);
  const previewMut = usePreviewBroadcastMutation();
  const createMut = useCreateBroadcastMutation();
  const sendMut = useSendBroadcastMutation();

  const [category, setCategory] = useState<BroadcastCategory>("platform_update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BroadcastAudience>("test_audience");
  const [preview, setPreview] = useState<BroadcastPreview | null>(null);
  const [draftId, setDraftId] = useState<number | null>(null);
  const [confirmToken, setConfirmToken] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const history = listQuery.data ?? [];
  const busy = previewMut.isPending || createMut.isPending || sendMut.isPending;

  const canCompose = access.isFounder;

  const statusLabel = useMemo(
    () =>
      ({
        draft: t("p8.admin.broadcasts.status.draft"),
        sending: t("p8.admin.broadcasts.status.sending"),
        completed: t("p8.admin.broadcasts.status.completed"),
        failed: t("p8.admin.broadcasts.status.failed"),
        cancelled: t("p8.admin.broadcasts.status.cancelled"),
      }) as const,
    [],
  );

  const onLogout = async () => {
    await adminLogout();
    navigate("/admin-login");
  };

  const runPreview = async () => {
    setFormError(null);
    setPreview(null);
    setDraftId(null);
    setConfirmToken(null);
    try {
      const result = await previewMut.mutateAsync({
        category,
        title,
        body,
        audience,
      });
      setPreview(result);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("p8.admin.common.error_generic"));
    }
  };

  const prepareSend = async () => {
    setFormError(null);
    try {
      const draft = await createMut.mutateAsync({ category, title, body, audience });
      setDraftId(draft.id);
      setConfirmToken(draft.confirmToken ?? null);
      if (!preview) {
        setPreview({
          category: draft.category,
          notificationType: draft.notificationType,
          title: draft.title,
          body: draft.body,
          audience: draft.audience,
          estimatedRecipients: draft.recipientCount,
        });
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("p8.admin.common.error_generic"));
    }
  };

  const confirmSend = async () => {
    if (!draftId || !confirmToken) return;
    setFormError(null);
    try {
      await sendMut.mutateAsync({ id: draftId, confirmToken });
      setTitle("");
      setBody("");
      setPreview(null);
      setDraftId(null);
      setConfirmToken(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("p8.admin.common.error_generic"));
    }
  };

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-[#0A0A0A]">
        <AdminPageLoading message={t("p8.admin.broadcasts.loading")} />
      </div>
    );
  }

  if (!canCompose) {
    return (
      <AdminShell activeKey="broadcasts" onLogout={onLogout}>
        <AdminErrorState message={t("p8.admin.broadcasts.founder_only")} />
      </AdminShell>
    );
  }

  return (
    <AdminShell activeKey="broadcasts" onLogout={onLogout}>
      <div className="space-y-6" dir={dir} data-admin-broadcast-center="1">
        <header className="flex flex-wrap items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/45 bg-primary/12 text-primary">
            <Radio className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 text-right">
            <h1 className="text-xl font-bold text-foreground md:text-2xl">
              {t("p8.admin.broadcasts.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("p8.admin.broadcasts.subtitle")}
            </p>
          </div>
        </header>

        <section className={cn(CARD_SHELL, "space-y-4 p-5")}>
          <h2 className="text-base font-semibold">{t("p8.admin.broadcasts.compose.title")}</h2>

          <label className="block space-y-1.5 text-right">
            <span className="text-sm text-muted-foreground">
              {t("p8.admin.broadcasts.compose.category")}
            </span>
            <select
              className="w-full rounded-xl border border-border bg-zinc-950 px-3 py-2.5 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as BroadcastCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`p8.admin.broadcasts.category.${c}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-right">
            <span className="text-sm text-muted-foreground">
              {t("p8.admin.broadcasts.compose.notification_title")}
            </span>
            <input
              className="w-full rounded-xl border border-border bg-zinc-950 px-3 py-2.5 text-sm"
              value={title}
              maxLength={300}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("p8.admin.broadcasts.compose.title_placeholder")}
            />
          </label>

          <label className="block space-y-1.5 text-right">
            <span className="text-sm text-muted-foreground">
              {t("p8.admin.broadcasts.compose.notification_body")}
            </span>
            <textarea
              className="min-h-[120px] w-full rounded-xl border border-border bg-zinc-950 px-3 py-2.5 text-sm"
              value={body}
              maxLength={4000}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("p8.admin.broadcasts.compose.body_placeholder")}
            />
          </label>

          <label className="block space-y-1.5 text-right">
            <span className="text-sm text-muted-foreground">
              {t("p8.admin.broadcasts.compose.audience")}
            </span>
            <select
              className="w-full rounded-xl border border-border bg-zinc-950 px-3 py-2.5 text-sm"
              value={audience}
              onChange={(e) => setAudience(e.target.value as BroadcastAudience)}
            >
              <option value="test_audience">
                {t("p8.admin.broadcasts.audience.test_audience")}
              </option>
              <option value="all_users">{t("p8.admin.broadcasts.audience.all_users")}</option>
            </select>
          </label>

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => void runPreview()}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
            >
              {previewMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {t("p8.admin.broadcasts.compose.preview")}
            </button>
            <button
              type="button"
              disabled={busy || !title.trim() || !body.trim()}
              onClick={() => void prepareSend()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {createMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("p8.admin.broadcasts.compose.prepare_send")}
            </button>
          </div>
        </section>

        {preview ? (
          <section className={cn(CARD_SHELL, "space-y-3 p-5")}>
            <h2 className="text-base font-semibold">{t("p8.admin.broadcasts.preview.title")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("p8.admin.broadcasts.preview.type")}: {preview.notificationType}
            </p>
            <div className="rounded-xl border border-border bg-zinc-950/80 p-4 text-right">
              <p className="font-semibold text-foreground">{preview.title}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {preview.body}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("p8.admin.broadcasts.preview.recipients")}:{" "}
              {formatNumber(preview.estimatedRecipients)}
            </p>
            {confirmToken ? (
              <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-200">
                  {t("p8.admin.broadcasts.preview.confirm_hint")}
                </p>
                <button
                  type="button"
                  disabled={sendMut.isPending}
                  onClick={() => void confirmSend()}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {sendMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {t("p8.admin.broadcasts.compose.confirm_send")}
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className={cn(CARD_SHELL, "space-y-3 p-5")}>
          <h2 className="text-base font-semibold">{t("p8.admin.broadcasts.history.title")}</h2>
          {listQuery.isLoading ? (
            <AdminPageLoading message={t("p8.admin.broadcasts.history.loading")} />
          ) : listQuery.isError ? (
            <AdminErrorState
              message={
                listQuery.error instanceof Error
                  ? listQuery.error.message
                  : t("p8.admin.common.error_generic")
              }
            />
          ) : history.length === 0 ? (
            <AdminEmptyState message={t("p8.admin.broadcasts.history.empty")} />
          ) : (
            <ul className="space-y-2">
              {history.map((row) => (
                <li
                  key={row.id}
                  className="rounded-xl border border-border bg-zinc-950/60 p-4 text-right"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {t(`p8.admin.broadcasts.category.${row.category}`)}
                    </span>
                    <span className="text-xs font-medium text-primary">
                      {statusLabel[row.status]}
                    </span>
                  </div>
                  <p className="mt-1 font-medium">{row.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{row.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatNumber(row.deliveredCount)} / {formatNumber(row.recipientCount)}{" "}
                    {t("p8.admin.broadcasts.history.delivered")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
