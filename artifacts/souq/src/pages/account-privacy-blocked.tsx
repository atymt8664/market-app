import { useCallback, useState } from "react";
import { Redirect, useLocation } from "wouter";
import { Ban, Loader2, User } from "lucide-react";
import { getAuthProfileCsrfTokenForRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountHeader } from "@/components/account-header";
import { AvatarCircle } from "@/components/avatar-circle";
import { useToast } from "@/hooks/use-toast";
import { inboxBlockedQueryKey, useInboxBlockedUsers } from "@/hooks/use-inbox-collections";
import { apiUrl } from "@/lib/api-url";
import { t } from "@/i18n";
import { useLocale } from "@/hooks/use-locale";
import type { BlockedUserListItem } from "@/lib/chat-inbox-collections-api";
import { cn } from "@/lib/utils";
import {
  SETTINGS_CARD,
  SETTINGS_CARD_SHELL,
  SETTINGS_HUB_SUBPAGE_MAIN,
  SETTINGS_IMMERSIVE_BOTTOM,
  SETTINGS_OUTLINE_BUTTON,
  SETTINGS_PAGE_BG,
} from "@/components/settings-shell";

export default function AccountPrivacyBlocked() {
  const { user, isLoading } = useAuth();
  const { locale } = useLocale();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unblockingId, setUnblockingId] = useState<number | null>(null);

  const { data: rows = [], isPending, isFetching, isError } = useInboxBlockedUsers(
    Boolean(user),
    { live: true },
  );

  if (!isLoading && !user) {
    return <Redirect to="/guest-welcome?redirect=/account/privacy/blocked" />;
  }

  const loading = isPending && rows.length === 0;
  const empty = !isPending && !isError && rows.length === 0;
  const textDir = locale === "ar" ? "rtl" : "ltr";

  const unblockUser = useCallback(
    async (userId: number) => {
      setUnblockingId(userId);
      try {
        const csrf = getAuthProfileCsrfTokenForRequest();
        const headers: Record<string, string> =
          typeof csrf === "string" && csrf.length >= 32 ? { "X-CSRF-Token": csrf } : {};
        const res = await fetch(apiUrl(`/api/users/${userId}/block`), {
          method: "DELETE",
          credentials: "include",
          headers,
        });
        if (!res.ok) {
          toast({ title: t("p5.chat.collections.blocked_unblock_failed"), variant: "destructive" });
          return;
        }
        queryClient.setQueryData<BlockedUserListItem[]>(inboxBlockedQueryKey(), (prev) =>
          (prev ?? []).filter((row) => row.id !== userId),
        );
        toast({ title: t("p5.chat.collections.blocked_unblock_success") });
      } finally {
        setUnblockingId(null);
      }
    },
    [queryClient, toast],
  );

  return (
    <div className={`flex flex-col w-full ${SETTINGS_PAGE_BG} ${SETTINGS_IMMERSIVE_BOTTOM}`}>
      <AccountHeader title={t("settings.privacy.row.blocked")} />
      <div className={SETTINGS_HUB_SUBPAGE_MAIN}>
        {loading || (isFetching && rows.length === 0) ? (
          <div className={`${SETTINGS_CARD} flex min-h-[12rem] items-center justify-center`}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
          </div>
        ) : isError ? (
          <div className={`${SETTINGS_CARD} text-center`} dir={textDir}>
            <p className="text-sm text-muted-foreground">{t("common.try_again")}</p>
          </div>
        ) : empty ? (
          <div className={`${SETTINGS_CARD} flex flex-col items-center px-4 py-10 text-center`} dir={textDir}>
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 text-primary shadow-[0_0_20px_-12px_hsl(var(--primary)/0.25)]">
              <Ban className="h-7 w-7" strokeWidth={2.25} aria-hidden />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {t("p5.chat.collections.blocked_empty_title")}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {t("settings.privacy.row.blocked_hint")}
            </p>
          </div>
        ) : (
          <div className={`${SETTINGS_CARD_SHELL} overflow-hidden`}>
            {rows.map((u, index) => (
              <article
                key={u.id}
                className={cn(
                  "px-3 py-3 md:px-4",
                  index < rows.length - 1 ? "border-b border-primary/10" : "",
                )}
                dir={textDir}
              >
                <div className="flex items-center gap-2.5">
                  <AvatarCircle name={u.name} src={u.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1 text-start">
                    <p className="truncate text-[15px] font-semibold text-foreground">
                      {u.name || t("messages.user")}
                    </p>
                    {u.city ? (
                      <p className="truncate text-[11px] text-muted-foreground/90">{u.city}</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/users/${u.id}`)}
                    className={cn(SETTINGS_OUTLINE_BUTTON, "!min-h-10 flex-1 py-2 text-xs sm:flex-none")}
                  >
                    <User className="me-1.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                    {t("p5.chat.collections.blocked_open_profile")}
                  </button>
                  <button
                    type="button"
                    disabled={unblockingId === u.id}
                    onClick={() => void unblockUser(u.id)}
                    className={cn(
                      SETTINGS_OUTLINE_BUTTON,
                      "!min-h-10 flex-1 border-destructive/40 text-destructive-foreground py-2 text-xs sm:flex-none",
                    )}
                  >
                    {unblockingId === u.id ? "…" : t("p5.chat.collections.blocked_unblock")}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
