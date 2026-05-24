import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { ensureAuthProfileCsrfReady } from "@/lib/auth-csrf";
import {
  fetchNotificationPrefs,
  patchNotificationPrefs,
  type NotificationPrefsDto,
  NotificationPrefsApiError,
} from "@/lib/notification-preferences-api";

export const notificationPrefsQueryKey = ["account", "notification-preferences"] as const;

function errorToastMessage(err: unknown): string {
  if (err instanceof NotificationPrefsApiError) {
    if (err.status === 403) return t("account_notifications.error_csrf");
    if (err.status === 401) return t("account_notifications.session_expired_hint");
    if (err.code === "NOTIFICATION_PREFS_SCHEMA_MISSING") {
      return t("account_notifications.error_schema");
    }
    if (err.message.trim()) return err.message;
  }
  return t("account_notifications.error");
}

export function useNotificationPreferences(enabled: boolean) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pendingRef = useRef<Partial<NotificationPrefsDto>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(0);
  const activeMutationRef = useRef<{ version: number; snapshot?: NotificationPrefsDto } | null>(null);

  const query = useQuery({
    queryKey: notificationPrefsQueryKey,
    queryFn: fetchNotificationPrefs,
    enabled,
    retry: 1,
  });

  useEffect(() => {
    if (enabled) void ensureAuthProfileCsrfReady();
  }, [enabled]);

  const mutation = useMutation({
    mutationFn: patchNotificationPrefs,
    onSuccess: async (data) => {
      const active = activeMutationRef.current;
      if (active && active.version !== versionRef.current) return;
      await queryClient.setQueryData(notificationPrefsQueryKey, data);
      toast({ title: t("account_notifications.saved") });
    },
    onError: (err) => {
      const active = activeMutationRef.current;
      if (active && active.version !== versionRef.current) return;
      if (active?.snapshot) {
        queryClient.setQueryData(notificationPrefsQueryKey, active.snapshot);
      }
      toast({
        title: t("account_notifications.error"),
        description: errorToastMessage(err),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const flushPending = useCallback(() => {
    const patch = pendingRef.current;
    if (!Object.keys(patch).length) return;
    pendingRef.current = {};
    const version = ++versionRef.current;
    const snapshot = queryClient.getQueryData<NotificationPrefsDto>(notificationPrefsQueryKey);
    activeMutationRef.current = { version, snapshot };
    mutation.mutate(patch);
  }, [mutation, queryClient]);

  const update = useCallback(
    (patch: Partial<NotificationPrefsDto>) => {
      queryClient.setQueryData<NotificationPrefsDto | undefined>(notificationPrefsQueryKey, (old) =>
        old ? { ...old, ...patch } : old,
      );
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flushPending, 450);
    },
    [flushPending, queryClient],
  );

  const saveNow = useCallback(
    (patch: Partial<NotificationPrefsDto>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      pendingRef.current = { ...pendingRef.current, ...patch };
      flushPending();
    },
    [flushPending],
  );

  const saveSilent = useCallback(
    async (patch: Partial<NotificationPrefsDto>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      pendingRef.current = {};
      await ensureAuthProfileCsrfReady();
      const data = await patchNotificationPrefs(patch);
      await queryClient.setQueryData(notificationPrefsQueryKey, data);
      return data;
    },
    [queryClient],
  );

  return {
    prefs: query.data,
    isLoading: query.isPending && !query.isError,
    isError: query.isError,
    error: query.error,
    isSaving: mutation.isPending,
    refetch: query.refetch,
    update,
    saveNow,
    saveSilent,
  };
}
