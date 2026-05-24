import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPushStatus,
  getPushSupportState,
  installPushClientMessageHandler,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  type PushSupportState,
} from "@/lib/push-notifications";
import { unreadCountQueryKey } from "@/hooks/use-notifications";
import { useLocation } from "wouter";

const pushStatusQueryKey = ["push", "status"] as const;

export function usePushNotifications(enabled: boolean) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [support, setSupport] = useState<PushSupportState>(() => getPushSupportState());

  const statusQuery = useQuery({
    queryKey: pushStatusQueryKey,
    queryFn: fetchPushStatus,
    enabled,
    retry: false,
    staleTime: 60_000,
  });

  const refreshBadge = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) return;
    setSupport(getPushSupportState());
    return installPushClientMessageHandler(refreshBadge, navigate);
  }, [enabled, navigate, refreshBadge]);

  const subscribe = useCallback(async () => {
    const result = await subscribeToPushNotifications();
    setSupport(getPushSupportState());
    await statusQuery.refetch();
    if (result === "subscribed") refreshBadge();
    return result;
  }, [refreshBadge, statusQuery]);

  const unsubscribe = useCallback(async () => {
    await unsubscribeFromPushNotifications();
    await statusQuery.refetch();
    setSupport(getPushSupportState());
  }, [statusQuery]);

  return {
    support,
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    subscribe,
    unsubscribe,
    refetchStatus: statusQuery.refetch,
  };
}
