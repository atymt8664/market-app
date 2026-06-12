import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/i18n";
import { ensureAuthProfileCsrfReady } from "@/lib/auth-csrf";
import {
  fetchPrivacyPrefs,
  patchPrivacyPrefs,
  type PrivacyPrefsDto,
  PrivacyPrefsApiError,
} from "@/lib/privacy-preferences-api";

export const privacyPrefsQueryKey = ["account", "privacy-preferences"] as const;

function errorToastMessage(err: unknown): string {
  if (err instanceof PrivacyPrefsApiError) {
    if (err.status === 403) return t("settings.privacy.activity.error_csrf");
    if (err.status === 401) return t("settings.privacy.activity.error_session");
    if (err.message.trim()) return err.message;
  }
  return t("settings.privacy.activity.error_generic");
}

export function usePrivacyPreferences(enabled: boolean) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pendingRef = useRef<Partial<PrivacyPrefsDto>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(0);
  const activeMutationRef = useRef<{ version: number; snapshot?: PrivacyPrefsDto } | null>(null);

  const query = useQuery({
    queryKey: privacyPrefsQueryKey,
    queryFn: fetchPrivacyPrefs,
    enabled,
    retry: 1,
  });

  useEffect(() => {
    if (enabled) void ensureAuthProfileCsrfReady();
  }, [enabled]);

  const mutation = useMutation({
    mutationFn: patchPrivacyPrefs,
    onSuccess: async (data) => {
      const active = activeMutationRef.current;
      if (active && active.version !== versionRef.current) return;
      await queryClient.setQueryData(privacyPrefsQueryKey, data);
      toast({ title: t("settings.privacy.activity.saved") });
    },
    onError: (err) => {
      const active = activeMutationRef.current;
      if (active && active.version !== versionRef.current) return;
      if (active?.snapshot) {
        queryClient.setQueryData(privacyPrefsQueryKey, active.snapshot);
      }
      toast({
        title: t("settings.privacy.activity.error_generic"),
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
    const snapshot = queryClient.getQueryData<PrivacyPrefsDto>(privacyPrefsQueryKey);
    activeMutationRef.current = { version, snapshot };
    mutation.mutate(patch);
  }, [mutation, queryClient]);

  const update = useCallback(
    (patch: Partial<PrivacyPrefsDto>) => {
      queryClient.setQueryData<PrivacyPrefsDto | undefined>(privacyPrefsQueryKey, (old) =>
        old ? { ...old, ...patch } : old,
      );
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flushPending, 450);
    },
    [flushPending, queryClient],
  );

  return {
    prefs: query.data,
    isLoading: query.isPending && !query.isError,
    isError: query.isError,
    isSaving: mutation.isPending,
    update,
  };
}
