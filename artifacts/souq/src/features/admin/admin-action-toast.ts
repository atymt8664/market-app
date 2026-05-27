import { t } from "@/i18n";
import type { AdminActionFeedback } from "./admin-action-feedback-types";

type ToastFn = (props: { title: string; description?: string }) => void;

export function toastAdminAction(
  toast: ToastFn,
  body: Partial<AdminActionFeedback> | null | undefined,
  fallbackTitle: string,
): void {
  const title = body?.title?.trim() || fallbackTitle;
  const lines = [body?.description, body?.nextStep].filter(Boolean) as string[];
  if (body?.auditActivityId != null) {
    lines.push(t("p8.admin.common.audit_id", { id: String(body.auditActivityId) }));
  }
  toast({
    title,
    description: lines.length ? lines.join("\n") : undefined,
  });
}

type DestructiveToastFn = (props: {
  title: string;
  description?: string;
  variant?: "destructive";
}) => void;

export function toastAdminError(toast: DestructiveToastFn, error: unknown): void {
  toast({
    title: t("p8.admin.errors.fallback"),
    description: error instanceof Error ? error.message : t("p8.admin.common.unexpected_error"),
    variant: "destructive",
  });
}

export function parseAdminActionResponse<T extends Record<string, unknown>>(
  parsed: T,
): Partial<AdminActionFeedback> {
  return {
    status: typeof parsed.status === "string" ? (parsed.status as "ok") : undefined,
    title: typeof parsed.title === "string" ? parsed.title : undefined,
    description: typeof parsed.description === "string" ? parsed.description : undefined,
    nextStep: typeof parsed.nextStep === "string" ? parsed.nextStep : undefined,
    auditActivityId:
      typeof parsed.auditActivityId === "number" ? parsed.auditActivityId : null,
  };
}
